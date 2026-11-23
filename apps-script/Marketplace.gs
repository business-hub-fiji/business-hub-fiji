/** Product classification fields are located by header, preserving comparison data. */
function productFieldColumn_(sh, label, create) {
  var width = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  var at = head.indexOf(label);
  if (at >= 0) return at + 1;
  if (!create) return 0;
  sh.getRange(1, width + 1).setValue(label);
  return width + 1;
}

/** Only public shops and their available offerings; no private inventory or customer records. */
function publicMallOffers_() {
  var offers = [];
  listings_().forEach(function(business) {
    var page = publicShop_(business.slug);
    if (!page || !page.ok) return;
    (page.products || []).forEach(function(product) {
      if (product.available === false) return;
      offers.push({
        business: business.name, slug: business.slug, town: business.town,
        category: product.main_category || business.category,
        subcategory: product.category || 'Other products & services',
        product: product
      });
    });
  });
  return { ok: true, offers: offers };
}
