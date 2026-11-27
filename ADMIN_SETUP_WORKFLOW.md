# Automatic registration and category setup

Business registration redirects only after an explicit successful backend acknowledgement to /dashboard?ref=...; existing email-code authentication remains mandatory. Customer registration redirects after acknowledgement to the public mall. Customers do not gain authenticated account/order access merely by registering. A browser-session receipt shows a temporary acknowledgement and contains only role, reference and timestamp; no email/name or token is stored there. Failure or an uncertain response does not redirect.

Saved business category deterministically selects one of the 22 website profiles when a live shop renders, before building catalogue headings. Paused/missing shops stop first. Category changes require the existing authenticated shop_save action; no public approval state is changed. Registration and dashboard show category-specific preview and public Drive ZIP download links. The Drive ZIP is a standalone optional website export; it does not sync, accept payments or confirm bookings.

Combines reviewed feature updates #16–19 with registration routing. Shopify offers remain disabled without seller approval and configured credentials. Product save reconciliation, email-code login, listing review and manual booking confirmation remain in place. No automatic booking reminders, payment fulfilment, admin privileges or unrestricted publishing are added.

Release checks: registration role destinations, denied/uncertain acknowledgements, invalid reference rejection, storage failure handling, receipt expiration, category template/download coverage, dashboard link generation and combined npm tests/build. Do not post real customer registrations just to test navigation.
