# Seller-authorised Shopify directory

This is an opt-in product advertising feature, not legal certification, a payment processor, an approved Shopify public app or automatic commission collection. No merchant is enabled by default. It does not scrape Shopify sites or import a global catalogue.

## Activation requirements

1. Confirm the legal operator of Business Hub Fiji and present the merchant service agreement and privacy policy. Have Fiji-qualified counsel review these documents and the actual business model before commercial onboarding. Applicable obligations depend on goods, customers, jurisdictions and fee arrangements.
2. Obtain a durable written permission record from the authorised seller. Record authority, content rights, store-control verification, exact products, categories, publication period, withdrawal process, policy version and separately agreed fees. Do not invent consent or treat a connected ChatGPT Shopify account as permission for every seller.
3. Use Shopify's permitted merchant authorisation/custom credentials. For a public multi-merchant app, implement Shopify OAuth/distribution and mandatory privacy/uninstall webhooks and complete applicable Shopify review before distributing it. This bounded operator-managed pilot is not that installable public app.
4. Obtain a product-read Storefront token for the seller's approved storefront channel and publish only the permitted products to that channel. No customer/order access is requested. Store each token only in server-side deployment environment variables, never NEXT_PUBLIC variables, Sheets, source control or chat.
5. Review each product. This pilot permits only reviewed general goods. Verify any claims and required rights/licences separately. Do not advertise regulated goods by merely selecting a category.
6. Configure `SHOPIFY_DIRECTORY_MERCHANTS` with the schema below. Leave `enabled` false until all checks are complete. A custom store domain is not currently supported as a returned product destination; product URLs must use the configured canonical myshopify.com host. If Shopify returns a custom hostname, products remain hidden until an explicitly verified destination-host extension is implemented.

```json
[
  {
    "enabled": false,
    "domain": "YOUR-STORE.myshopify.com",
    "tokenEnv": "SHOPIFY_DIRECTORY_TOKEN_SELLER1",
    "name": "Seller's legal or trading name",
    "slug": "existing-business-hub-shop-slug",
    "sponsored": false,
    "approval": {
      "recordId": "PRIVATE-SIGNED-RECORD-REFERENCE",
      "policyVersion": "2026-11-28",
      "acceptedAt": "REPLACE-WITH-ACTUAL-ISO-DATE",
      "expiresAt": "REPLACE-WITH-AGREED-ISO-DATE",
      "authorityConfirmed": false,
      "contentRightsConfirmed": false,
      "storeControlVerified": false
    },
    "products": [
      { "handle": "product-handle", "category": "Furniture & homeware", "enabled": false, "reviewed": false, "generalGoods": false }
    ]
  }
]
```

The configuration is a restricted operator approval register, not a seller self-service authentication system. Keep signed records outside this public repository. Only configured slugs are used for page grouping; operators must verify the slug belongs to the seller. Consent is checked on every request, expires automatically and fails closed when missing. Disable or set `revokedAt` for withdrawal, remove unused credentials, redeploy and verify both the API and listing disappear. Public responses use no-store; previously open product links expire after five minutes, so this is not instantaneous remote erasure. No product responses are intentionally persisted. Complete deletion of unnecessary configuration, credentials and backups within the applicable retention period (Shopify generally specifies 30 days, subject to its terms and law).

## Behaviour and limits

- The mall and individual shop pages have a separate online-seller section. Category filters apply without mixing external offers into existing like-for-like price comparison.
- Fetches only configured product handles from Shopify Storefront API 2026-10, maximum 10 stores and 20 products per store. Eight-second timeout, redirects rejected, no stale fallback. Sold-out/missing/error products disappear.
- Prices carry their actual currency and range labels. This is a snapshot, not a price guarantee. Seller checkout determines the selected variant, taxes, delivery, returns and payment. This feature takes no money or order information and does not waive consumer rights.
- No affiliate commission or click tracking is implemented. Sponsored entries are explicitly labelled. A seller's own commercial relationship needs a separate agreement. Do not imply Shopify sponsorship.
- Product image requests contact Shopify's CDN; outbound shopping links contact the seller. No advertising pixels or Shopify customer records are collected by this feature. Existing site features retain their own behaviour and privacy obligations.
- Removal/correction contact: business-hub-fiji@risingsunfj.com. Operators must monitor and action requests. The policy page is informational; it is not a signed agreement or automated compliance process.

## Primary references reviewed 28 November 2026

- Shopify API terms, especially 6.1 merchant authorisation/agreement/privacy and 6.2 purpose limits, deletion and directory use: https://www.shopify.com/legal/api-terms
- Shopify Storefront documentation: https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api
- Fiji Copyright Act 1999, sections 16 and 29: https://www.wipo.int/wipolex/en/text/591141
- Fijian Competition and Consumer Commission Act 2010 consumer-protection provisions (misleading conduct, product/price representations). Current application should be confirmed against the official legislation/FCCC: https://consumersfiji.org/wp-content/uploads/2025/07/Feature-Article-Persistent-Misleading-Practices-Facing-Fijian-Shoppers.pdf

Technical controls support these duties; they do not establish all-law compliance. No automatic seller access, imports, checkout, public merchant approval, social posting, payment or live merchant activation was authorised by configuration alone.
