const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Ops = require('../public/ops-core.js');
let sequence = 0;
function fixture() {
  let state = Ops.empty();
  const ctx = { now: '2026-11-23T01:00:00.000Z', id: () => 'id-' + (++sequence), catalog: [] };
  return { ctx, get state() { return state; }, run(body) {
    const raw = { request_id: 'request-' + (++sequence).toString().padStart(12, '0'), ...body };
    const out = Ops.execute(state, raw, ctx); state = out.state; return out.result;
  } };
}
function stock(f, quantity = 10) { f.run({ action: 'ops_stock', name: 'Fish', price: '40.00', quantity, reason: 'Opening count' }); return f.state.inventory[0].id; }
function doc(f, item, overrides = {}) { return f.run({ action: 'ops_document', kind: 'sale', lines: [{ item_id: item, quantity: 2 }], ...overrides }); }
test('server prices, partial payments and remaining stock are consistent', () => {
  const f = fixture(), item = stock(f);
  doc(f, item, { payment: '25.00', method: 'Cash', total: 1 });
  assert.equal(f.state.inventory[0].quantity, 8);
  assert.equal(f.state.documents[0].total, 8000);
  const sum = Ops.summary(f.state, '2026-11-23', at => at.slice(0, 10));
  assert.deepEqual(sum, { sales: 8000, collected: 2500, outstanding: 5500, transactions: 1 });
});
test('retry is idempotent; changed payload cannot reuse the same ID', () => {
  const f = fixture(), item = stock(f), request_id = 'retry-request-12345';
  doc(f, item, { request_id }); doc(f, item, { request_id });
  assert.equal(f.state.documents.length, 1); assert.equal(f.state.inventory[0].quantity, 8);
  assert.throws(() => doc(f, item, { request_id, customer: 'Different' }), /different details/);
});
test('overselling and invalid payment roll back the entire transaction', () => {
  const f = fixture(), item = stock(f, 2), before = JSON.stringify(f.state);
  assert.throws(() => doc(f, item, { lines: [{ item_id: item, quantity: 3 }] }), /Insufficient/);
  assert.throws(() => doc(f, item, { payment: '81.00', method: 'Cash' }), /balance/);
  assert.equal(JSON.stringify(f.state), before);
});
test('quote conversion deducts once and preserves agreed prices', () => {
  const f = fixture(), item = stock(f);
  doc(f, item, { kind: 'quote', customer: 'Joeli' });
  assert.equal(f.state.inventory[0].quantity, 10);
  const quote = f.state.documents[0].id;
  f.run({ action: 'ops_stock', item_id: item, quantity: 10, price: '50.00', reason: 'New price' });
  f.run({ action: 'ops_convert', document_id: quote });
  assert.equal(f.state.documents[1].total, 8000); assert.equal(f.state.inventory[0].quantity, 8);
  assert.throws(() => f.run({ action: 'ops_convert', document_id: quote }), /already/);
});
test('void restores stock and excludes totals, paid documents require refund workflow', () => {
  const f = fixture(), item = stock(f); doc(f, item);
  f.run({ action: 'ops_void', document_id: f.state.documents[0].id, reason: 'Cancelled' });
  assert.equal(f.state.inventory[0].quantity, 10);
  assert.equal(Ops.summary(f.state, '2026-11-23', at => at.slice(0, 10)).sales, 0);
  doc(f, item, { payment: '1', method: 'Cash' });
  assert.throws(() => f.run({ action: 'ops_void', document_id: f.state.documents[1].id, reason: 'Cancel' }), /refund/);
});
test('negative, fractional, duplicate and unknown stock requests rejected', () => {
  const f = fixture(), item = stock(f);
  for (const q of [-1, 0, 1.2, '', Infinity]) assert.throws(() => doc(f, item, { lines: [{ item_id: item, quantity: q }] }));
  assert.throws(() => doc(f, item, { lines: [{ item_id: item, quantity: 1 }, { item_id: item, quantity: 1 }] }), /duplicate/);
  assert.throws(() => doc(f, 'other-shop-item'), /not found/);
});
test('payments cannot exceed balance, duplicate, target quotes or use unknown method', () => {
  const f = fixture(), item = stock(f); doc(f, item);
  const id = f.state.documents[0].id;
  f.run({ action: 'ops_payment', document_id: id, amount: '20', method: 'M-PAiSA', request_id: 'payment-request-123' });
  f.run({ action: 'ops_payment', document_id: id, amount: '20', method: 'M-PAiSA', request_id: 'payment-request-123' });
  assert.equal(f.state.documents[0].payments.length, 1);
  assert.throws(() => f.run({ action: 'ops_payment', document_id: id, amount: '61', method: 'Cash' }), /balance/);
  assert.throws(() => f.run({ action: 'ops_payment', document_id: id, amount: '1', method: 'Unknown' }), /method/);
  doc(f, item, { kind: 'quote', customer: 'Test' });
  assert.throws(() => f.run({ action: 'ops_payment', document_id: f.state.documents[1].id, amount: '1', method: 'Cash' }), /active/);
});
test('Apps Script wrapper rejects unauthenticated access and ignores caller shop reference', () => {
  const rows = [['Shop reference', 'Private operations JSON']], sh = {
    getDataRange: () => ({ getValues: () => structuredClone(rows) }),
    appendRow: row => rows.push(row), setFrozenRows() {},
    getRange: (row, col) => ({ setValue: v => { rows[row - 1][col - 1] = v; } })
  };
  const sandbox = { OpsCore: Ops, session_: token => token === 'owner-a' ? 'SHOP-A' : token === 'owner-b' ? 'SHOP-B' : '',
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    findShop_: () => ({}), book_: () => ({ getSheetByName: () => sh }), productsFor_: () => [],
    cell_: () => 'Business', plain_: String, Utilities: { getUuid: () => 'id-' + (++sequence) } };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('apps-script/Operations.gs', 'utf8'), sandbox);
  assert.equal(sandbox.operations_({ action: 'ops_get' }).expired, true);
  assert.equal(sandbox.operations_({ action: 'ops_stock', token: 'owner-a', ref: 'SHOP-B', request_id: 'auth-request-1234', name: 'Fish', price: '40', quantity: 3, reason: 'Opening' }).ok, true);
  assert.equal(rows[1][0], 'SHOP-A');
  assert.equal(sandbox.operations_({ action: 'ops_get', token: 'owner-b', ref: 'SHOP-A' }).state.inventory.length, 0);
});
test('browser and Apps Script share exactly the same validated rules', () => {
  assert.equal(fs.readFileSync('public/ops-core.js', 'utf8'), fs.readFileSync('apps-script/OpsCore.gs', 'utf8'));
});
test('storage limit fails without discarding old records or retry IDs', () => {
  const f = fixture(); stock(f); const state = structuredClone(f.state); state.padding = 'x'.repeat(45000);
  assert.throws(() => Ops.execute(state, { action: 'ops_stock', request_id: 'full-request-1234', item_id: state.inventory[0].id, quantity: 5, reason: 'Count' }, f.ctx), /storage is full/);
  assert.equal(state.inventory[0].quantity, 10);
});
