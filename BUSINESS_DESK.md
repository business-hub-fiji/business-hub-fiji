# Business desk — first version

Private operations live at `/manage` (or `/manage.html`), linked from the signed-in
shop dashboard. `/manage.html?demo=1` runs the same accounting rules against sample
data held in browser session storage. The demo never calls the live backend.

## Included

- Private stock items or links to existing catalogue products, whole-unit counts,
  unit prices, adjustment reasons and a stock-movement history.
- Sales and invoices deduct stock atomically with the document write. Quotes do
  not reserve stock and convert into an invoice once, using the quoted price.
- Partial/manual payment records for cash, M-PAiSA, MyCash, bank transfer and card;
  overpayments are rejected. This does not integrate with a payment processor.
- Fiji-calendar-day sales/invoice totals, payment totals and all-time open balance.
- Searchable documents, printable business documents and JSON record export.
- Unpaid document voiding restores stock. Paid documents cannot be voided until
  a refund workflow is implemented.
- Authenticated server-side shop ownership, serialized writes, server-calculated
  totals and request IDs that prevent duplicate writes on retries. No public GET
  route exposes private operations or customer records.

## Install alongside the live script

The live Apps Script source was edited separately during login troubleshooting.
**Do not replace its entire Code.gs with the repository copy.** Preserve the
working login/Resend changes and any registration or comparison changes.

1. Add two script files to the existing Apps Script project: `Operations.gs` and
   `OpsCore.gs`, using the files in `apps-script/`.
2. In the existing `doPost`, immediately after parsing `data`, add:

   ```javascript
   if (/^ops_/.test(data.action || '')) return json_(operations_(data));
   ```

   This is the only change this PR makes to `Code.gs`.
3. Confirm the existing script has `session_`, `findShop_`, `book_`, `productsFor_`,
   `cell_` and `plain_`. The new files reuse these helpers and the existing session
   token; no new authentication or API key is needed.
4. Review and update the existing Apps Script web-app deployment, retaining the
   current URL. The private `Business operations` sheet is initialized on first
   authenticated access. Do not share that sheet publicly. It contains customer
   names, notes and transaction records.
5. Publish the frontend only after the backend is installed. Sign in through
   `/dashboard`, then open the business desk. The existing email/API-key login
   blocker must be resolved before real users can use this page.

## Trial limits and deferred work

This is an **online trial**, not a certified fiscal POS. No tax is calculated and
printouts explicitly say they are not FRCS fiscal receipts. FRCS integration and
certification, statutory invoice fields, refunds, discounts, expenses, purchase
orders, staff permissions, fractional units, hardware/barcode integration and
offline transaction synchronization require further work.

Inventory is private and does not automatically change marketplace availability
or prices. The catalogue link identifies the source product; publish edits through
the existing My shop flow. Services may be represented as whole units with an
operator-maintained capacity count during this trial.

For atomicity with the current Sheets backend, each shop has one JSON state cell
containing inventory, documents, movements and retry IDs. There are at most 100
items and a conservative 45,000-character state cap (below the Sheets cell limit).
Writes stop visibly at capacity without dropping past records or idempotency keys.
Export does not reset or expand this cap. Migrate to a transactional database before
real-volume operations; this design deliberately prioritizes a small reviewable trial.
Sheets project owners can access all businesses' records; shop users can access
only the reference resolved from their server-side session.

Lost-response retries keep their original request ID and payload in tab session
storage. Do not clear storage or change accounts while an update is unconfirmed.
The current cart survives temporary network loss in the open page's memory but
is lost on reload. There is no background sale queue and no claim of offline POS.

## Validation

`npm ci` then `npm test` verifies stock, totals, overpayment,
idempotency, quote conversion, voiding, tenant isolation, auth and storage limits.
Three additional DOM interface tests exercise sale entry, partial payment,
settlement, print output, quote conversion, invalid stock and the real login gate.
The demo exercises the actual shared rules without external effects. `npm run build`
passes. The hosted preview is protected by Vercel sign-in, so visual browser
verification remains pending.
Live Apps Script deployment, authenticated multi-user testing and real payment
integration have not been performed as part of this change.
