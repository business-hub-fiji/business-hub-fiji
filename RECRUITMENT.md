# Recruitment assistant

Private operator workspace: `/recruit`. Search is on demand. No messages, accounts, publication, billing or automatic renewal are triggered.

## Setup

1. Create a separate private Google spreadsheet and a separate Apps Script project. Put `apps-script/RecruitmentStore.gs` in that new project's Code.gs. Do not add its doPost to the existing registrations project.
2. In the new project's Script Properties set RECRUIT_SHEET_ID and a random RECRUIT_STORE_SECRET of at least 32 characters. Deploy as a web app executing as yourself, accessible to Anyone; the endpoint rejects unauthenticated requests. Keep sheet access private.
3. Configure Vercel server environment variables RECRUIT_STORE_URL (new /exec URL), RECRUIT_STORE_SECRET (matching), and RECRUIT_OPERATOR_TOKEN (a separate random access key of at least 32 characters). Never use NEXT_PUBLIC prefixes, commit keys or paste them into chat. Redeploy after configuration. Use separate preview storage and credentials.
4. Enable Google Places API (New) with billing/quota in your own Google project. Restrict its key to Places API and set GOOGLE_PLACES_API_KEY in Vercel. Website fields may incur Google charges. No billing or credentials are created by this change.
5. Optional AI: set server-side OPENAI_API_KEY and RECRUIT_AI_MODEL to a model available in your project supporting Responses API. Without these, use template drafts. AI receives independently confirmed business name/type/area, not contact details, notes or Google content. Responses use store:false. API billing is separate from ChatGPT.
6. Open /recruit and enter the access key. Check connection badges. Save a test prospect, reload, confirm persistence. Test Google search and AI draft with actual connections.

## Workflow and boundaries

Find area/type -> inspect listing -> independently verify details -> enter confirmed prospect -> save -> prepare/edit/copy invitation -> manually contact -> update progress. Missing website links are unverified opportunities, never proof of no website. Declined suppresses new drafts and follow-up views.

Google results remain in current page memory. Persist only place ID and business details independently confirmed with the owner or another permitted source. Do not copy Google descriptions, contact details or photos into the database. Before production Places activation, publish applicable terms/privacy disclosures and confirm Google's current attribution/policy requirements. The page shows Google Maps source links and returned provider attributions. No bulk scraping or scheduled crawler.

Registered/Trial active require an existing BHF reference; Trial active also requires the agreed start date. Trial end uses two calendar months clamped at month end. This tracks recruitment only: actual registration and website eligibility remain controlled by the existing registration service. Reconcile trial dates with that service before activation. No trial is extended by this tool. Owners register through the existing form and approve website content. Drafts explain optional paid continuation at the current Plans page price; operator must review actual prices and terms before sending.

Follow-up dates and trials ending within seven days are shown in the pipeline. No background scheduler, push notifications, automatic sends or automatic account creation are installed.

## Security and reliability

All API operations require operator access; no keys in URLs/localStorage. Lock clears loaded records. Same-origin requests, no-store responses, validation, locking, duplicate detection and optimistic versions protect the initial single-operator workflow. Shared operator key, no durable rate limiter or per-operator audit history: add individual accounts before expanding access. Use Refresh to reconcile an uncertain save outcome before retrying. Only the private sheet is authoritative.

## Validation

Run `node --test tests/recruitment.test.cjs` and `npm run build`. Live APIs/Sheets checks require service connections.

References: https://developers.google.com/maps/documentation/places/web-service/text-search ; https://developers.google.com/maps/documentation/places/web-service/policies ; https://platform.openai.com/docs/api-reference/responses/create
