# Expanded categories and booking enquiries

## Scope
Twenty-two categories are aligned across registration, business dashboard product categories, Mall groups, offer filters, product/service suggestions and the Apps Script CATEGORY_LIST. Existing twelve category labels are preserved exactly. Ten additions: Furniture & homeware; Hotels & resorts; Guesthouses & holiday rentals; Tours & activities; Salon, barber & spa; Venues & event services; Trades, repairs & cleaning; Equipment hire; Dentists & dental clinics; Mechanics & auto repairs.

Eligible public shops and services link to /booking.html?shop=<slug> (optionally &product=<id>). Stays request check-in/out dates and rooms. Rentals request pickup/return dates and times, including same-day rentals. Other templates request a date/time and headcount. Times are Fiji time.

## What the request does
The customer prepares a draft and explicitly opens WhatsApp to review and send it to the business's existing public number. Personal details are held in page memory, not saved by this form, and are not included in the page URL or analytics. WhatsApp receives the message text when its link is opened. The business responds manually to confirm availability, price, deposits and cancellation terms.

This is not an availability calendar or reservation engine. It does not allocate rooms, prevent overlapping reservations, accept payment, send an automatic confirmation or store a booking in the Business Desk. A category template does not establish that the business offers every listed service. Businesses remain responsible for confirming the request.

## Deployment order — manually edited live backend
The live Registrations Apps Script has edits not necessarily in GitHub (including email and comparison changes). Do NOT replace its whole Code.gs with this repository copy.

1. Back up the live source.
2. In its existing CATEGORY_LIST declaration, replace only the array with the expanded array shown in this PR's apps-script/Code.gs diff. Do not change other constants or functions. The optional registration allowlist check in the same diff accepts exactly this list.
3. Review and update the existing web-app deployment using a new version, retaining its URL, existing access settings and current script properties. Validate an existing login and category list.
4. Deploy the reviewed frontend commit after backend validation. Otherwise the new frontend categories may be rejected by the old backend.
5. In an isolated preview, verify each new category is accepted and retained by registration and product editing, then verify shop/Mall placement.

## Acceptance checks
- Existing shops retain their labels; added categories appear consistently in every selector.
- Eligible public shops have a request link; paused/missing shops and missing public phone numbers cannot prepare a request.
- Date/time validation rejects past or impossible dates and invalid ranges; same-day rental return must be after pickup.
- The draft uses the actual public business phone, not a user-provided destination. Invalid phone numbers cannot construct a link.
- No enquiry is sent by preparing the draft, no record/payment is created, and modifying input invalidates the prepared link.
- Test without sending: stay, rental, appointment, product selection, unavailable product, network failure.
- Business confirmation remains manual; no automatic charges or claims of real-time availability.

## Separate pending changes
PR12 recruitment pending-edit protection, PR13 Gemini and PR14 save-confirmation reconciliation remain separate. This PR starts from main and does not silently include those changes.

## Business-to-business supplier enquiries
Customers can choose Buying for my business and provide buyer business name plus an optional Business Hub reference. References are customer-provided identifiers, not authenticated proof of ownership. Equipment, hardware, furniture and vehicle templates allow purchase or hire enquiries; purchase requests collect quantity and a requested delivery/pickup date, while hire requests also require return date/time. Delivery requests require a location. These fields are included in the customer-reviewed WhatsApp draft to the supplier's existing public number.

The supplier must issue a quotation, confirm availability, and agree terms with the buyer. This form creates no purchase order, invoice, shared order status, delivery tracking, payment or commission entry. No identities or references are used to grant private-account access. Private ordering and supplier acceptance records remain future work.

## Dentists, mechanics and sole traders
Dentists & dental clinics and Mechanics & auto repairs use date/time appointment enquiries. Dental requests ask only for appointment logistics and warn against symptoms, medical histories, identity documents or payment details; they are not medical consultations or emergency services.

Sole trader is an optional business-structure selection, separate from industry. The selected structure is self-reported and prepended to existing private registration Notes so no new live spreadsheet column or public identity badge is required. Existing registration checks and category assignment are unchanged. This selector does not verify incorporation, tax status or professional credentials.

## Booking dashboard update

The public category form remains an enquiry. Owners can now record customer-requested bookings at `/bookings.html`, send an email verification invitation, confirm after verification and offer optional 24-hour and 2-hour email reminders. Overlap checks apply to confirmed bookings recorded for the same resource in Business Hub, not external calendars. See BOOKING_AUTOMATION.md.
