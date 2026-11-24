# Google connection for Business Hub Fiji

The existing app is hosted on Vercel. The uploaded Workspace Studio instructions mention Cloudflare; no Cloudflare Worker is required or deployed by this change. Workspace Studio skill text alone does not connect or execute the website's backend.

## Separate Google services

- Google Business Profile: public business listing, independently verified by owner. Does not authorise app code or grant Maps API access.
- Apps Script + private recruitment Sheet: durable prospect records. Project exists but has not completed Google authorisation/deployment. The unverified-app screen is not an account freeze. Owner must review Google scopes; do not disable account security or bypass warnings automatically.
- Google Places API (New): area/type business discovery. Requires its own enabled project/key and quota/billing configuration. Missing website links remain unverified, and results remain temporary.
- Google Gemini API: invitation wording only. API keys do not remove Apps Script's OAuth warning. This is not Google account sign-in for business owners.

## Gemini setup (server only)

In Vercel project's environment settings, configure:

| Variable | Value |
| --- | --- |
| RECRUIT_AI_PROVIDER | gemini |
| GEMINI_API_KEY | Key from your Google AI Studio / Cloud project; keep private |
| RECRUIT_AI_MODEL | An available model ID supporting generateContent in your project |

Use separate preview credentials where appropriate. Redeploy after configuration. No model is hardcoded and no keys are placed in the browser, source repository or URL. Keep secrets out of chat and screenshots. Review Google's current key restrictions, billing/quota and data-use terms before activation. No paid account or spending authority is created by this change.

Existing OpenAI settings remain the default when RECRUIT_AI_PROVIDER is unset. Selecting gemini requires its own key; failures never silently fall back to another provider. Missing setup keeps the template invitation available. The status label means configured, not externally verified.

Only independently confirmed business name, type, area and the approved offer template are transmitted to the chosen AI provider. Contact details, notes, website evidence, bank information, customer records and raw Google Places results are not sent. No tools or message delivery are enabled. Returned text is a draft requiring human review. Blocked, incomplete, empty or oversized results are rejected.

## Acceptance tests before activation

1. Complete the separate Apps Script consent/deployment review and configure RECRUIT_STORE_URL / RECRUIT_STORE_SECRET / RECRUIT_OPERATOR_TOKEN securely in Vercel. Confirm unauthorised reads/writes fail and a test prospect persists.
2. Configure Places and verify a small area/type query using its own key; independently confirm business information before saving.
3. Configure Gemini, generate a draft for a synthetic prospect, check two-month offer/paid continuation wording and opt-out, and confirm no message was sent.
4. Install the pending request-lock fix in PR12 before live recruitment use. This Google provider branch does not incorporate that independent change.
5. Run tests, production build and live authenticated checks. Existing security/payment release gates remain. Google integration is not a payment-processing implementation.

References: https://ai.google.dev/api/generate-content ; https://ai.google.dev/gemini-api/docs/api-key ; https://developers.google.com/maps/documentation/places/web-service/text-search
