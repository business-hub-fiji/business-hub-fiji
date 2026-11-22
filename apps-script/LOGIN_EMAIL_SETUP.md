# Login email route

Login codes can now use Resend independently of Google Workspace MailApp. This
changes login email only. Registration messages continue using their current route.
No additional recipient gets a copy of a login code, and the code is no longer
included in the subject. The destination comes from the existing business record.

## Activation

1. Create or use a Resend account. Verify a dedicated sending subdomain, for example
   `login.risingsunfj.com`, using exactly the DNS records supplied by Resend. Do not
   replace the root domain's Google Workspace MX or SPF records.
2. Create a sending API key restricted to the verified domain.
3. In the existing Google Apps Script project's Settings, add Script Properties:

   | Property | Value |
   | --- | --- |
   | `LOGIN_EMAIL_PROVIDER` | `resend` |
   | `RESEND_API_KEY` | The private sending API key |
   | `LOGIN_EMAIL_FROM` | An address on the verified domain, e.g. `access@login.risingsunfj.com` |

   Keep the key out of GitHub, HTML and chat. Resend account/domain setup and these
   properties are required; committing this patch does not activate the new route.
4. Copy the updated `Code.gs` to the existing Apps Script project. Update its
   existing web app deployment to a new version, retaining its current URL and
   execution/access settings. Authorize external HTTP requests as the script owner
   if prompted. A Vercel deployment alone does not update Apps Script.
5. Request a fresh code using a real registered business reference. Verify it
   reaches the registered external Gmail address, appears as delivered in Resend,
   and grants access to that shop. A provider's accepted response is not proof of
   inbox delivery. Check the Resend event/error if the message bounces.
6. Confirm wrong/expired codes do not log in and repeat requests are limited.

## Existing deployment differs from the repository

The observed live log listed two recipients for one login email. The main-branch
`Code.gs` sends to only the registered shop email. Before updating the deployed
script, compare its current source with this repository and preserve any necessary
live changes. Do not carry forward any CC/BCC of login codes.

## Rollback

Set `LOGIN_EMAIL_PROVIDER` to `google` (or remove it). That restores the existing
MailApp transport, including its unresolved external delivery issue. Unsupported
providers, missing configuration, HTTP failures and invalid success responses
fail visibly rather than silently falling back to the rejected route.

## Validation

Run `node --test tests/login-email.test.cjs` from the repository root. These tests
mock Apps Script services; external delivery and real Apps Script authorization
must still be tested after configuration. No test sends email.

API reference: https://resend.com/docs/api-reference/emails/send-email
