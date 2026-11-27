# Business-confirmed bookings and email reminders

The existing public WhatsApp request stays available. The authenticated business owner opens /bookings.html after signing into the dashboard, records an agreed request and queues an email verification invitation. Customers open the private fragment link, agree to booking emails and optionally choose reminders. The request becomes Requested; the owner confirms it. Confirmation creates one transactional email and optional reminders 24 and 2 hours before the start, if those times are still in the future. This is owner-confirmed booking, not instant customer self-booking or public real-time availability.

Confirmed bookings for the same resource cannot overlap. Use distinct actual room/vehicle/staff resource identifiers. The system does not infer capacity or sync external calendars. Dates are parsed on the server in Pacific/Fiji and must round-trip correctly. The owner must supply the full actual start/end times for stays, rentals and appointments. Price, deposits, payment and cancellation charges remain between customer and business.

## Backend activation
The live Apps Script has edits beyond GitHub. Never replace all of Code.gs.
1. Add BookingCore.gs and Bookings.gs as new source files.
2. Add one booking_capabilities action check to the existing doGet and one /^booking_/ action dispatcher after data parsing in doPost, before fallback registration.
3. Run installBookingAutomation once. It creates a separate owner-private spreadsheet, a signing secret in script properties, and exactly one five-minute trigger for processBookingEmails. It sends no customer email and creates no customer booking.
4. Update the existing web-app deployment to a new version, preserving its URL, execution identity and existing access settings.
5. Verify the public booking_capabilities response, owner-login failure handling and trigger presence. Deploy the frontend after backend validation. The frontend hides writable controls if activation is absent.

## Data and email behaviour
- Owner access reuses existing email-code login and scopes every operation to its business reference.
- Customer links are signed with an HMAC secret. The link token lives in a URL fragment and is sent only in the booking POST body. It grants access to that booking, so recipients must keep it private. A link lookup reveals no customer email/name. Email verification requires an explicit POST and consent; visiting the link is not verification.
- Booking records and email jobs are in a separate private spreadsheet, not the public catalogue or template download folder. Rows are segmented as base64 to avoid Google cell limits and formula interpretation. Owner listings omit signing nonce values.
- Owner writes require request IDs and expected versions. Retry of the same request is idempotent; a changed payload cannot reuse the same reference. A lost response retains the exact pending action in browser-session storage for retry. Validation rejection clears it. Raw booking request data is not placed in analytics or public URLs.
- Reminders are optional, and the customer can disable them. Cancelling suppresses queued reminders. This does not automatically refund or waive business cancellation terms.
- The mail worker claims and persists a job before sending. Accepted sends are marked sent; exceptions or interrupted sends become uncertain and are not automatically retried. Sent means accepted by MailApp, not proven inbox delivery. Daily quotas can delay jobs. Expired invitations/reminders/confirmations are not sent after the booking start. No exact delivery time is promised.
- There is no automated record deletion, external calendar integration, SMS/WhatsApp API messaging, payment processing, or end-to-end customer email test without an authorised test recipient. The operator must handle correction/deletion and retention requests for its circumstances.

## Validation
Unit tests cover permission, replay, stale versions, overlap, verification, optional reminders, cancellation, expiry, owner isolation, invalid customer links and duplicate/uncertain sends. Browser tests must use synthetic records or read-only views; never book real stock or send test messages to customers.

Primary references: https://developers.google.com/apps-script/reference/utilities/utilities and https://developers.google.com/apps-script/reference/script/clock-trigger-builder .
