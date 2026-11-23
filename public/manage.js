(function () {
  'use strict';
  var endpoint = 'https://script.google.com/macros/s/AKfycbzk3yKpUjESUN2qbHkamU6uzlLfFQJ0idHSzpDfOpZAJwWk0LtDpK8Q2oUy6TaHrOjj/exec';
  var demo = new URLSearchParams(location.search).get('demo') === '1';
  var state = OpsCore.empty(), catalog = [], cart = [], business = '', ready = false, busy = false;
  var token = read('bhf_token'), ref = read('bhf_ref'), pendingKey = 'bhf_ops_pending_' + (ref || 'unknown');
  var pending = demo ? null : parse(read(pendingKey));
  function $(id) { return document.getElementById(id); }
  function read(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { value == null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value); } catch (e) {} }
  function parse(v) { try { return JSON.parse(v); } catch (e) { return null; } }
  function uid() { return crypto.randomUUID(); }
  function money(v) { return 'FJD ' + (v / 100).toFixed(2); }
  function node(tag, value, className) { var e = document.createElement(tag); if (value != null) e.textContent = value; if (className) e.className = className; return e; }
  function message(value) { $('message').textContent = value || ''; }
  function dayOf(value) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
  function stamp(value) { return new Date(value).toLocaleString('en-GB', { timeZone: 'Pacific/Fiji' }); }
  function option(select, value, label) { var e = node('option', label); e.value = value; select.appendChild(e); }
  function button(label, handler) { var b = node('button', label); b.type = 'button'; b.onclick = handler; return b; }
  function sample() {
    var s = OpsCore.empty(), counter = 0;
    var ctx = { now: new Date().toISOString(), id: function () { return 'sample-' + (++counter); }, catalog: [] };
    [['Fish bundle', 'bundle', '40.00', 50], ['Cement bag', 'bag', '18.50', 24], ['Car wash', 'service', '20.00', 100]].forEach(function (v, i) {
      s = OpsCore.execute(s, { action: 'ops_stock', request_id: 'sample-stock-' + i, name: v[0], unit: v[1], price: v[2], quantity: v[3], reason: 'Opening count' }, ctx).state;
    });
    // Sample IDs are kept distinct from UUIDs used for interactive transactions.
    return s;
  }
  async function api(body) {
    if (demo) {
      try {
        var result = OpsCore.execute(state, body, { now: new Date().toISOString(), id: uid, catalog: catalog });
        state = result.state; write('bhf_ops_demo', JSON.stringify(state));
        return Object.assign(result.result, { business: 'Sample Fiji business', catalog: [] });
      } catch (err) { return { ok: false, error: err.message }; }
    }
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 30000);
    try {
      var response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({}, body, { token: token })), signal: controller.signal });
      if (!response.ok) throw new Error('The business service did not respond.');
      var result = await response.json();
      if (typeof result.ok !== 'boolean') throw new Error('The business service needs its operations update installed.');
      if (result.expired) {
        write('bhf_token', null); token = null; ready = false;
        $('workspace').hidden = true; $('login').hidden = false;
      }
      return result;
    } finally { clearTimeout(timer); }
  }
  function apply(result) {
    state = result.state; catalog = result.catalog || []; business = result.business;
    $('business').textContent = business;
    $('workspace').hidden = false; $('login').hidden = true; ready = true; render();
  }
  async function refresh() {
    if (busy) return;
    try { var result = await api({ action: 'ops_get' }); if (!result.ok) throw new Error(result.error); apply(result); }
    catch (e) { message(e.message || 'Could not load business records. Try Refresh.'); }
  }
  async function mutate(body) {
    if (!ready || busy) return;
    if (pending && body) { message('A previous update is unconfirmed. Use Retry previous update before making another change.'); return; }
    if (body) { pending = Object.assign({}, body, { request_id: uid() }); if (!demo) write(pendingKey, JSON.stringify(pending)); }
    if (!pending) return;
    busy = true; message('Saving…');
    document.querySelectorAll('#workspace button').forEach(function (b) { b.disabled = true; });
    try {
      var result = await api(pending);
      if (!result.ok) { pending = null; write(pendingKey, null); throw new Error(result.error || 'Could not save.'); }
      var action = pending.action;
      pending = null; write(pendingKey, null); apply(result);
      if (action === 'ops_document') { cart = []; $('document-form').reset(); renderCart(); syncKind(); }
      if (action === 'ops_stock') { $('stock-form').reset(); $('stock-id').onchange(); }
      message('Saved to your business records.');
    } catch (e) {
      message(pending ? 'Save is unconfirmed. Retry the same update below; it will not create a duplicate.' : e.message);
    } finally {
      busy = false;
      document.querySelectorAll('#workspace button').forEach(function (b) { b.disabled = false; });
      renderRetry();
    }
  }
  var retry = button('Retry previous update', function () { mutate(null); });
  $('message').after(retry);
  function renderRetry() { retry.hidden = !pending; retry.disabled = busy; }
  function render() {
    var summary = OpsCore.summary(state, dayOf(new Date()), dayOf);
    $('sales').textContent = money(summary.sales); $('collected').textContent = money(summary.collected);
    $('outstanding').textContent = money(summary.outstanding); $('count').textContent = summary.transactions + ' transactions · Fiji day';
    var selected = $('item').value; $('item').textContent = ''; $('stock-id').textContent = '';
    option($('stock-id'), '', 'Add new item'); $('inventory').textContent = '';
    state.inventory.forEach(function (item) {
      option($('item'), item.id, item.name + ' · ' + money(item.price) + ' · ' + item.quantity + ' available');
      option($('stock-id'), item.id, item.name);
      var row = node('tr'); [item.name, item.quantity + ' ' + item.unit, money(item.price)].forEach(function (v) { row.appendChild(node('td', v)); }); $('inventory').appendChild(row);
    });
    if (state.inventory.some(function (i) { return i.id === selected; })) $('item').value = selected;
    if (!state.inventory.length) { option($('item'), '', 'Add a stock item first'); $('inventory').appendChild(node('tr', 'No stock items yet.')); }
    $('catalog').textContent = ''; option($('catalog'), '', 'Private stock item');
    catalog.forEach(function (p) { option($('catalog'), p.id, p.name); });
    $('movements').textContent = '';
    state.movements.slice(-15).reverse().forEach(function (m) {
      var item = state.inventory.find(function (i) { return i.id === m.item_id; });
      $('movements').appendChild(node('div', stamp(m.at) + ' · ' + (item ? item.name : 'Item') + ' · ' + (m.quantity > 0 ? '+' : '') + m.quantity + ' · ' + m.reason, 'movement'));
    });
    renderCart(); renderDocs(); renderRetry();
  }
  function renderCart() {
    $('cart').textContent = ''; var total = 0;
    cart.forEach(function (line, index) {
      var item = state.inventory.find(function (v) { return v.id === line.item_id; }); if (!item) return;
      total += item.price * line.quantity;
      var row = node('tr'); [item.name, line.quantity, money(item.price), money(item.price * line.quantity)].forEach(function (v) { row.appendChild(node('td', v)); });
      var cell = node('td'); cell.appendChild(button('Remove', function () { cart.splice(index, 1); renderCart(); })); row.appendChild(cell); $('cart').appendChild(row);
    });
    $('total').textContent = money(total);
  }
  function syncKind() { $('initial-payment').hidden = $('kind').value === 'quote'; $('customer').required = $('kind').value !== 'sale'; }
  function renderDocs() {
    $('documents').textContent = '';
    var query = $('record-search').value.trim().toLowerCase();
    state.documents.slice().reverse().filter(function (d) { return (d.customer + ' ' + d.number).toLowerCase().includes(query); }).forEach(function (d) {
      var paid = d.payments.reduce(function (n, p) { return n + p.amount; }, 0), card = node('article', '', 'record');
      card.appendChild(node('h3', d.number + ' · ' + d.kind.toUpperCase() + (d.voided ? ' · VOID' : d.converted_to ? ' · CONVERTED' : '')));
      card.appendChild(node('p', d.customer + ' · ' + stamp(d.created_at)));
      card.appendChild(node('p', 'Total ' + money(d.total) + ' · Recorded payments ' + money(paid) + ' · Balance ' + money(d.voided || d.kind === 'quote' ? 0 : d.total - paid)));
      var actions = node('div', '', 'actions'); actions.appendChild(button('View / print', function () { printDoc(d); }));
      if (d.kind === 'quote' && !d.voided && !d.converted_to) actions.appendChild(button('Convert to invoice', function () { mutate({ action: 'ops_convert', document_id: d.id }); }));
      if (d.kind !== 'quote' && !d.voided && paid < d.total) {
        var form = node('form'), amount = node('input'), method = node('select');
        amount.inputMode = 'decimal'; amount.placeholder = 'Payment FJD'; amount.required = true; amount.setAttribute('aria-label', 'Payment amount for ' + d.number);
        method.setAttribute('aria-label', 'Payment method for ' + d.number);
        ['Cash', 'M-PAiSA', 'MyCash', 'Bank transfer', 'Card'].forEach(function (m) { option(method, m, m); });
        form.append(amount, method); var save = node('button', 'Record payment'); form.appendChild(save);
        form.onsubmit = function (e) { e.preventDefault(); mutate({ action: 'ops_payment', document_id: d.id, amount: amount.value, method: method.value }); };
        actions.appendChild(form);
      }
      if (!d.voided && !d.converted_to && !d.payments.length) actions.appendChild(button('Void document', function () {
        var reason = prompt('Reason for voiding ' + d.number + ':'); if (reason) mutate({ action: 'ops_void', document_id: d.id, reason: reason });
      }));
      card.appendChild(actions); $('documents').appendChild(card);
    });
    if (!$('documents').children.length) $('documents').appendChild(node('p', 'No matching documents. Save your first quote, invoice or sale.'));
  }
  function printDoc(d) {
    var area = $('print-document'); area.textContent = '';
    area.append(node('h1', business), node('h2', d.kind.toUpperCase() + ' ' + d.number + (d.voided ? ' · VOID' : '')), node('p', 'Customer: ' + d.customer), node('p', stamp(d.created_at) + ' Fiji time'));
    d.lines.forEach(function (l) { area.appendChild(node('p', l.name + ' · ' + l.quantity + ' ' + l.unit + ' × ' + money(l.price) + ' = ' + money(l.quantity * l.price))); });
    area.appendChild(node('h3', 'Total: ' + money(d.total)));
    d.payments.forEach(function (p) { area.appendChild(node('p', 'Payment recorded: ' + money(p.amount) + ' · ' + p.method + ' · ' + stamp(p.at))); });
    var paid = d.payments.reduce(function (n, p) { return n + p.amount; }, 0);
    if (d.kind !== 'quote' && !d.voided) area.appendChild(node('p', 'Balance: ' + money(d.total - paid)));
    area.append(node('p', d.note), node('p', 'Business record only. No tax calculated. Not an FRCS fiscal receipt.'));
    if (demo) area.prepend(node('h2', 'SAMPLE · DEMO DOCUMENT'));
    area.hidden = false; window.print();
  }
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () {
    document.querySelectorAll('.tab').forEach(function (s) { s.hidden = s.id !== b.dataset.tab; });
    document.querySelectorAll('[data-tab]').forEach(function (v) { v.removeAttribute('aria-current'); }); b.setAttribute('aria-current', 'page');
  }; });
  $('add-line').onclick = function () {
    var quantity = Number($('quantity').value), item = $('item').value;
    if (!item || !Number.isInteger(quantity) || quantity < 1) return message('Choose an item and enter a positive whole quantity.');
    var line = cart.find(function (v) { return v.item_id === item; });
    if (line) line.quantity += quantity; else cart.push({ item_id: item, quantity: quantity });
    renderCart(); message('');
  };
  $('clear-cart').onclick = function () { cart = []; renderCart(); };
  $('kind').onchange = syncKind;
  $('document-form').onsubmit = function (e) {
    e.preventDefault();
    if (!cart.length) return message('Add at least one item.');
    mutate({ action: 'ops_document', kind: $('kind').value, customer: $('customer').value, note: $('note').value,
      lines: cart.map(function (v) { return Object.assign({}, v); }), payment: $('kind').value === 'quote' ? '' : $('payment').value, method: $('method').value });
  };
  $('stock-id').onchange = function () {
    var item = state.inventory.find(function (v) { return v.id === $('stock-id').value; });
    $('catalog').disabled = !!item; $('stock-name').disabled = !!item; $('unit').disabled = !!item;
    $('stock-name').value = item ? item.name : ''; $('unit').value = item ? item.unit : 'each';
    $('price').value = item ? (item.price / 100).toFixed(2) : ''; $('stock-quantity').value = item ? item.quantity : '';
  };
  $('catalog').onchange = function () { var p = catalog.find(function (v) { return v.id === $('catalog').value; }); if (p) { $('stock-name').value = p.name; $('price').value = p.price; } };
  $('stock-form').onsubmit = function (e) { e.preventDefault(); mutate({ action: 'ops_stock', item_id: $('stock-id').value, product_id: $('catalog').value,
    name: $('stock-name').value, unit: $('unit').value, price: $('price').value, quantity: $('stock-quantity').value, reason: $('reason').value }); };
  $('record-search').oninput = renderDocs; $('refresh').onclick = refresh;
  $('export').onclick = function () {
    var data = { business: business, exported_at: new Date().toISOString(), demo: demo, records: state };
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    var a = node('a'); a.href = url; a.download = 'business-hub-records.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
  $('logout').onclick = async function () {
    if (busy) return;
    if (!demo && token) { try { await api({ action: 'logout' }); } catch (e) {} write('bhf_token', null); }
    location.assign('/dashboard');
  };
  $('reset-demo').onclick = function () { state = sample(); cart = []; write('bhf_ops_demo', JSON.stringify(state)); render(); message('Sample records reset.'); };
  function connection() {
    $('connection').textContent = demo ? 'Sample data · demo' : navigator.onLine ? 'Online · private records' : 'Offline · saving unavailable';
    if (!navigator.onLine && !demo) message('You are offline. Your current order stays in this open tab. Reconnect before saving.');
  }
  window.addEventListener('online', connection); window.addEventListener('offline', connection);
  syncKind(); connection(); renderRetry();
  if (demo) { state = parse(read('bhf_ops_demo')) || sample(); $('demo-banner').hidden = false; refresh(); }
  else if (!token) { $('login').hidden = false; }
  else refresh();
})();
