# Business Hub Fiji release review — 27 November 2026 (Fiji)

## Authorised scope
The owner explicitly authorised releasing the reviewed storefront update on 27 November. This release includes the 22-category catalogue, booking and business supplier enquiry forms, PR12 pending-request locking, and PR14 uncertain product-save reconciliation.

This is a public storefront and manual-enquiry release. It does not activate automatic payments, split commissions, automatic reservations, Google Places billing or Gemini. Booking and supplier requests require customer review/send through WhatsApp and supplier confirmation. No payment-security certification or fully secure-system guarantee is made.

## Evidence
- 42 registered tests passed together after combining the changes.
- Next.js production build passed; production dependency audit reported 0 known vulnerabilities.
- Category parity tests cover registration, dashboard, Mall, filters and backend source, preserving existing labels.
- Rendered form tests cover stays, same-day rentals, appointments, dentist/mechanic templates, sole-trader registration, business purchase/hire enquiries, date/quantity validation, consent, stale draft clearing and recovery from unsupported services.
- Slow/error request tests cover recruitment locking and product-save reconciliation without replaying uncertain writes.
- Owner's live checks: replacement Resend key delivered a login code; old exposed key deleted; recruitment record and draft survived refresh, copied correctly and locked; temporary product deletion retained the three originals; all three service-category placements checked and spelling retained.
- Only CATEGORY_LIST was changed in the independently maintained Google source. Exact before/after comparison confirmed no other source differences. Owner's screenshot confirmed existing web-app deployment updated to Version 12 on 27 November, retaining its URL.

## Security and privacy limits
No new private backend endpoint is added for booking enquiries. Public shop data chooses the supplier phone; the customer cannot supply an alternate destination through URL parameters. Personal enquiry fields are not persisted by the form or included in the app page URL. Opening WhatsApp transfers the reviewed message text to WhatsApp. Business references are self-reported identifiers, not proof of identity or private-account access.

Existing authentication, photo handling, Apps Script service configuration and operator-token design remain. Browser protections include no framing, nosniff and a CSP baseline; this is not a complete strict-script XSS policy. Known-package auditing is not a penetration test.

## Separate follow-up work
Before automated paid transactions: validate payment recipients, settlement, commission calculations, idempotency, refunds, accounting and provider acceptance. Before stronger security claims: reconcile/review the whole independently edited live backend, OTP/rate limits, ownership boundaries, backups/restores and administrator MFA. Google Places and Gemini setup need separate credentials/cost decisions.

## Deployment and rollback
Deploy this reviewed combined commit through the existing main-branch Vercel project. Verify the exact production SHA, public page/category/booking assets and unauthenticated private API rejection after deployment. Retain the previous production deployment for rollback. The Google Version 12 category expansion is backward-compatible with existing labels and does not require reverting for a frontend rollback.

Hosted and production verification results are recorded in the PR/release report; do not infer live behaviour from READY status alone.
