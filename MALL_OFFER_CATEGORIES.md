# Route individual offerings into the public mall

Each product/service has Main mall category plus Subcategory (the existing Category field). Blank main category falls back to the business category. Existing shop sections remain grouped by subcategory.

The mall offers endpoint includes available offerings only from publicShop_ approved/live shop responses. It never reads private operations or customer records. Side-menu categories also filter the product/service section. The counts beside the existing shop menu still count shops.

## Existing live Apps Script installation — preserve independent edits
Do not replace the entire Code.gs: it has working Resend and comparison changes.
1. Add Marketplace.gs from this branch.
2. In doGet, immediately after the opening brace, add:
   `if (e && e.parameter && e.parameter.action === 'mall_offers') return json_(publicMallOffers_());`
3. In productsFor_, after the categoryColumn variable, add:
   `var mainCategoryColumn = productFieldColumn_(sh, 'Main mall category', false);`
4. Add to each returned product object:
   `main_category: mainCategoryColumn ? plain_(v[r][mainCategoryColumn - 1]).slice(0, 80) : '',`
5. In productSave_, inside the existing lock, after the product row has been saved, add:
   `if (Object.prototype.hasOwnProperty.call(raw, 'main_category')) { sh.getRange(row > 0 ? row : sh.getLastRow(), productFieldColumn_(sh, 'Main mall category', true)).setValue(safe_(cut_(raw.main_category, 80))); }`
6. Before saving, validate an explicit nonblank main category against CATEGORY_LIST as shown in the repository diff.
7. Save and update the existing web app deployment keeping the same URL and permissions.

Test the preview before merging: assign different main categories to two existing listings, reload the editor, verify each appears in its own mall section, verify both remain on the business page and comparison data is preserved. Test unknown prices and unavailable products. The new endpoint loops through public shops and is intended for the current small trial; pagination/batched reads will be needed as catalogue volume grows.

No automatic reclassification of existing records, price changes, inventory synchronization or payments are included.
