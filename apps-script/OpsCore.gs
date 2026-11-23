/* Shared business rules for Apps Script and the clearly labelled local demo. */
var OpsCore = (function () {
  'use strict';
  function empty() { return { version: 1, inventory: [], documents: [], movements: [], requests: {} }; }
  function fail(message) { throw new Error(message); }
  function text(value, max) { return String(value == null ? '' : value).trim().slice(0, max); }
  function integer(value, min, max, label) {
    if (String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) fail(label + ' is invalid.');
    return Number(value);
  }
  function cents(value) {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(String(value))) fail('Enter a valid FJD amount with up to two decimal places.');
    return Math.round(Number(value) * 100);
  }
  function execute(state, raw, context) {
    var s = JSON.parse(JSON.stringify(state || empty())), action = raw.action;
    if (action === 'ops_get') return { state: s, result: { ok: true, state: s } };
    var request = text(raw.request_id, 80);
    if (!/^[A-Za-z0-9-]{12,80}$/.test(request)) fail('A valid request ID is required.');
    // Bind retries to the original request, without persisting the session token.
    var clean = {};
    Object.keys(raw).sort().forEach(function (k) { if (k !== 'token') clean[k] = raw[k]; });
    var fingerprint = JSON.stringify(clean), previous = s.requests[request];
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('This request was already used for different details. Refresh and try again.');
      return { state: s, result: { ok: true, state: s, document_id: previous.document_id || '', repeated: true } };
    }
    var now = context.now, id = context.id, docId = '';
    function findDoc() {
      var d = s.documents.find(function (v) { return v.id === raw.document_id; });
      if (!d) fail('Document not found for this business.');
      return d;
    }
    function deduct(lines, direction) {
      lines.forEach(function (line) {
        var item = s.inventory.find(function (v) { return v.id === line.item_id; });
        if (!item || item.quantity - direction * line.quantity < 0) fail('Insufficient stock for ' + line.name + '.');
        item.quantity -= direction * line.quantity;
        s.movements.push({ id: id(), item_id: item.id, quantity: -direction * line.quantity, reason: direction === 1 ? 'Sale/invoice' : 'Void', at: now });
      });
    }
    function pay(d, amount, method) {
      if (d.kind === 'quote' || d.voided) fail('Payments require an active sale or invoice.');
      if (['Cash', 'M-PAiSA', 'MyCash', 'Bank transfer', 'Card'].indexOf(method) < 0) fail('Choose a payment method.');
      var paid = d.payments.reduce(function (n, p) { return n + p.amount; }, 0);
      if (amount <= 0 || paid + amount > d.total) fail('Payment must be positive and cannot exceed the balance.');
      d.payments.push({ id: id(), amount: amount, method: method, at: now });
    }
    if (action === 'ops_stock') {
      var item = s.inventory.find(function (v) { return v.id === raw.item_id; });
      if (!item) {
        if (s.inventory.length >= 100) fail('This trial supports up to 100 stock items.');
        var product = (context.catalog || []).find(function (v) { return v.id === raw.product_id; });
        var name = product ? product.name : text(raw.name, 80);
        if (!name) fail('Enter an item name.');
        if (product && s.inventory.some(function (v) { return v.product_id === product.id; })) fail('This catalogue product already has a stock item.');
        item = { id: id(), product_id: product ? product.id : '', name: name, unit: text(raw.unit || 'each', 20), quantity: 0, price: cents(raw.price) };
        s.inventory.push(item);
      } else if (raw.price != null) item.price = cents(raw.price);
      var quantity = integer(raw.quantity, 0, 1000000, 'Stock count');
      var reason = text(raw.reason, 120);
      if (!reason) fail('Enter a stock adjustment reason.');
      s.movements.push({ id: id(), item_id: item.id, quantity: quantity - item.quantity, reason: reason, at: now });
      item.quantity = quantity;
    } else if (action === 'ops_document') {
      if (['sale', 'invoice', 'quote'].indexOf(raw.kind) < 0) fail('Choose sale, invoice or quote.');
      if (!Array.isArray(raw.lines) || !raw.lines.length || raw.lines.length > 30) fail('Add between 1 and 30 items.');
      var seen = {}, total = 0;
      var lines = raw.lines.map(function (line) {
        if (seen[line.item_id]) fail('Combine duplicate item quantities.');
        seen[line.item_id] = true;
        var item = s.inventory.find(function (v) { return v.id === line.item_id; });
        if (!item) fail('Stock item not found.');
        var quantity = integer(line.quantity, 1, 1000000, 'Quantity');
        total += item.price * quantity;
        return { item_id: item.id, name: item.name, unit: item.unit, quantity: quantity, price: item.price };
      });
      if (!Number.isSafeInteger(total) || total > 999999999) fail('Document total exceeds the trial limit.');
      if (raw.kind !== 'sale' && !text(raw.customer, 120)) fail('Enter the customer name for a quote or invoice.');
      var doc = { id: id(), number: 'BHF-' + String(s.documents.length + 1).padStart(5, '0'), kind: raw.kind,
        customer: text(raw.customer || 'Walk-in customer', 120), note: text(raw.note, 300), lines: lines,
        total: total, payments: [], created_at: now, voided: false };
      if (doc.kind !== 'quote') deduct(lines, 1);
      if (raw.payment && cents(raw.payment) > 0) pay(doc, cents(raw.payment), raw.method);
      s.documents.push(doc); docId = doc.id;
    } else if (action === 'ops_convert') {
      var quote = findDoc();
      if (quote.kind !== 'quote' || quote.voided) fail('Only an active quote can be converted.');
      if (quote.converted_to) fail('This quote has already been converted.');
      deduct(quote.lines, 1);
      var invoice = JSON.parse(JSON.stringify(quote));
      invoice.id = id(); invoice.number = 'BHF-' + String(s.documents.length + 1).padStart(5, '0');
      invoice.kind = 'invoice'; invoice.created_at = now; invoice.quote_id = quote.id;
      quote.converted_to = invoice.id; s.documents.push(invoice); docId = invoice.id;
    } else if (action === 'ops_payment') {
      var document = findDoc(); pay(document, cents(raw.amount), raw.method); docId = document.id;
    } else if (action === 'ops_void') {
      var voidDoc = findDoc();
      if (voidDoc.voided || voidDoc.converted_to) fail('This document cannot be voided.');
      if (voidDoc.payments.length) fail('Paid documents require a refund workflow; contact support.');
      if (!text(raw.reason, 120)) fail('Enter a reason for voiding.');
      if (voidDoc.kind !== 'quote') deduct(voidDoc.lines, -1);
      voidDoc.voided = true; voidDoc.void_reason = text(raw.reason, 120); voidDoc.voided_at = now; docId = voidDoc.id;
    } else fail('Unknown business operation.');
    s.requests[request] = { fingerprint: fingerprint, document_id: docId };
    // One atomic sheet-cell update includes stock, documents, payments and retry IDs.
    // Never discard retry IDs or old records silently to make room.
    if (JSON.stringify(s).length > 45000) fail('Trial storage is full. Export your records and contact support before continuing.');
    return { state: s, result: { ok: true, state: s, document_id: docId } };
  }
  function summary(s, day, dayOf) {
    var out = { sales: 0, collected: 0, outstanding: 0, transactions: 0 };
    s.documents.forEach(function (d) {
      if (d.kind === 'quote' || d.voided) return;
      var paid = d.payments.reduce(function (n, p) {
        if (dayOf(p.at) === day) out.collected += p.amount;
        return n + p.amount;
      }, 0);
      out.outstanding += d.total - paid;
      if (dayOf(d.created_at) === day) { out.sales += d.total; out.transactions++; }
    });
    return out;
  }
  return { empty: empty, execute: execute, summary: summary };
})();
if (typeof module !== 'undefined') module.exports = OpsCore;
