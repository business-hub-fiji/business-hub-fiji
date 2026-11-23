/** Locate the category by header so existing comparison columns are preserved. */
function productCategoryColumn_(sh, create) {
  var width = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  var at = head.indexOf('Category');
  if (at >= 0) return at + 1;
  if (!create) return 0;
  sh.getRange(1, width + 1).setValue('Category');
  return width + 1;
}
