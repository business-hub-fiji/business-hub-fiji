# Product and service categories

Owners select or enter a category in My shop → Products. The public shop groups available listings by category, using suggestions for its business type. No service, price or approval claim is created automatically.

For True Boundary, assign Land consultation to Consultation, Site inspection to Site services, and Scheme plan preparation to Planning. Existing unassigned products appear under Other products & services.

## Install backend before merging frontend

The live Code.gs has independent Resend and comparison changes. Do not replace it with the repository copy.

1. Add apps-script/ProductCategories.gs as a new script file.
2. In productsFor_, after reading the sheet, add:
   `var categoryColumn = productCategoryColumn_(sh, false);`
3. Inside each product object returned by productsFor_, add:
   `category: categoryColumn ? plain_(v[r][categoryColumn - 1]).slice(0, 80) : '',`
4. In productSave_, within its existing script lock, after the row is written, add:
   `if (Object.prototype.hasOwnProperty.call(raw, 'category')) { sh.getRange(row > 0 ? row : sh.getLastRow(), productCategoryColumn_(sh, true)).setValue(safe_(cut_(raw.category, 80))); }`
5. Save and update the existing Apps Script web app deployment, preserving its URL and access settings.

The helper finds Category by header and appends it after existing columns only on a category save. It does not overwrite comparison columns. Older clients omitting category preserve saved categories.

Then test category save, reload, edit and clear on an existing product; check public grouping and unavailable products; confirm existing comparison fields and login still work. Merge the frontend after this check. No inventory, payment or fiscal behavior changes.

Validation: grouping/order/legacy fallbacks, browser and Apps Script syntax; backend helper tested against existing columns. Hosted authenticated category save needs the manual backend install.
