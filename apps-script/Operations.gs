/** Private business operations. Add this file and OpsCore.gs to the existing project. */
function operations_(raw) {
  var ref = session_(raw.token);
  if (!ref) return { ok: false, expired: true, error: 'Please log in to your shop again.' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, error: 'Your business is processing another update. Retry in a moment.' };
  try {
    var shop = findShop_(ref);
    if (!shop) return { ok: false, error: 'Business not found.' };
    var ss = book_(), sh = ss.getSheetByName('Business operations');
    if (!sh) {
      sh = ss.insertSheet('Business operations');
      sh.appendRow(['Shop reference', 'Private operations JSON']);
      sh.setFrozenRows(1);
    }
    var rows = sh.getDataRange().getValues(), row = 0, state = OpsCore.empty();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === ref) { row = i + 1; state = JSON.parse(String(rows[i][1])); break; }
    }
    var catalog = productsFor_(ref, false);
    var outcome = OpsCore.execute(state, raw, { catalog: catalog, now: new Date().toISOString(), id: function () { return Utilities.getUuid(); } });
    if (raw.action !== 'ops_get' && !outcome.result.repeated) {
      var serialized = JSON.stringify(outcome.state);
      if (row) sh.getRange(row, 2).setValue(serialized);
      else sh.appendRow([ref, serialized]);
    }
    outcome.result.business = plain_(cell_(shop, 'Business name'));
    outcome.result.catalog = catalog.map(function (p) { return { id: p.id, name: p.name, price: p.price }; });
    return outcome.result;
  } catch (err) {
    // Only validated business-rule errors are returned; service details stay private.
    var message = String(err.message || '');
    var allowed = /^(Enter |Choose |Please |A valid |This |Only |Payments |Payment |Document |Add |Stock |Business |Insufficient |Combine |Unknown |Paid )/;
    return { ok: false, error: allowed.test(message) ? message : 'Business records could not be updated. Please retry with the same request.' };
  } finally { lock.releaseLock(); }
}
