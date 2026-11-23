const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function page(demo = true) {
  const dom = new JSDOM(fs.readFileSync('public/manage.html', 'utf8'), {
    url: 'https://business.example/manage.html' + (demo ? '?demo=1' : ''), runScripts: 'outside-only'
  });
  const w = dom.window;
  w.fetch = () => { throw new Error('Demo must never call live backend'); };
  w.eval(fs.readFileSync('public/ops-core.js', 'utf8'));
  w.eval(fs.readFileSync('public/manage.js', 'utf8'));
  await tick();
  return { dom, w, $: id => w.document.getElementById(id),
    click: id => w.document.getElementById(id).click(),
    submit: id => w.document.getElementById(id).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })) };
}
test('demo completes sale, partial payment, balance settlement and stock update without backend', async () => {
  const p = await page(), { $, w } = p;
  assert.equal($('workspace').hidden, false);
  assert.equal($('demo-banner').hidden, false);
  $('quantity').value = '2'; p.click('add-line');
  assert.equal($('total').textContent, 'FJD 80.00');
  $('payment').value = '20.00'; p.submit('document-form'); await tick();
  assert.equal($('sales').textContent, 'FJD 80.00');
  assert.equal($('collected').textContent, 'FJD 20.00');
  assert.equal($('outstanding').textContent, 'FJD 60.00');
  assert.match($('inventory').textContent, /48 bundle/);
  const form = $('documents').querySelector('form');
  form.querySelector('input').value = '60.00';
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await tick();
  assert.equal($('outstanding').textContent, 'FJD 0.00');
  assert.equal($('collected').textContent, 'FJD 80.00');
  let printed = false; w.print = () => { printed = true; };
  $('documents').querySelector('button').click();
  assert.equal(printed, true); assert.match($('print-document').textContent, /SAMPLE/);
  assert.match($('print-document').textContent, /Not an FRCS fiscal receipt/);
  p.dom.window.close();
});
test('quote conversion and invalid oversell work through the UI', async () => {
  const p = await page(), { $, w } = p;
  $('kind').value = 'quote'; $('kind').dispatchEvent(new w.Event('change'));
  $('customer').value = 'Sample customer'; p.click('add-line'); p.submit('document-form'); await tick();
  assert.equal($('sales').textContent, 'FJD 0.00');
  const convert = [...$('documents').querySelectorAll('button')].find(b => b.textContent === 'Convert to invoice');
  convert.click(); await tick();
  assert.equal($('sales').textContent, 'FJD 40.00');
  $('quantity').value = '999'; p.click('add-line'); p.submit('document-form'); await tick();
  assert.match($('message').textContent, /Insufficient stock/);
  assert.equal($('sales').textContent, 'FJD 40.00');
  p.dom.window.close();
});
test('real business desk requires login and never fabricates successful live data', async () => {
  const p = await page(false);
  assert.equal(p.$('workspace').hidden, true); assert.equal(p.$('login').hidden, false);
  assert.equal(p.$('demo-banner').hidden, true);
  p.dom.window.close();
});
