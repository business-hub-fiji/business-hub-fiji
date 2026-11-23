/**
 * Business Hub Fiji - registrations and marketplace listings.
 * POST: the website form (business-hub-fiji.vercel.app/join) sends each sign-up here.
 *   Each sign-up becomes a row in the "Registrations" sheet, the hub gets an email
 *   alert, and the person gets a confirmation email if they gave one.
 * GET ?action=listings: the mall page (business-hub-fiji.vercel.app/mall) reads the
 *   live business listings from here.
 *
 * To hide a business from the mall, change its "Listing" cell to Hidden
 * (or set its Status to Declined). It disappears within about a minute.
 */
var SHEET_NAME = 'Registrations';
var HUB_EMAIL = 'business-hub-fiji@risingsunfj.com';
var SENDER_NAME = 'Business Hub Fiji';
var SEND_CONFIRMATION = true;
var REGISTRY_URL = 'https://roc.digital.gov.fj';

// [column heading, field name from the form]
var COLUMNS = [
  ['Reference', 'reference'], ['Received', ''], ['Name', 'name'], ['Joining as', 'joining_as'],
  ['Status', ''], ['Listing', ''], ['Contact by', 'contact_by'], ['Phone/WhatsApp', 'phone'],
  ['Email', 'email'], ['Town/area', 'town'], ['Business name', 'business_name'],
  ['Reg no./TIN', 'reg_no'], ['Check', ''], ['Category', 'category'], ['Offers', 'offers'],
  ['Google Maps', 'google_maps'], ['Payments accepted', 'payments'],
  ['Commission understood', 'commission_understood'], ['Listing consent', 'listing_consent'],
  ['Notes', 'notes'], ['Plan', ''], ['Paid until', ''],
  ['About', ''], ['Opening hours', ''], ['Shop photos', ''], ['Shop page', '']
];
var STATUSES = ['New', 'Contacted', 'Approved', 'Shop live', 'Declined'];
var LISTING = ['Live', 'Hidden'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Click tracking and problem reports
var CLICKS_SHEET = 'Clicks';
var CLICKS_HEAD = ['Time', 'Business', 'Button'];
var SUMMARY_SHEET = 'Click summary';
var REPORTS_SHEET = 'Reports';
var REPORTS_HEAD = ['Report ref', 'Received', 'Business', 'Problem', 'Details', 'Reporter name', 'Reporter contact', 'Status'];
var REPORT_TYPES = ['Fake or misleading listing', 'No reply or poor service', 'Payment problem', 'Rude or offensive', 'Other'];
var REPORT_STATUSES = ['New', 'Looking into it', 'Resolved'];
var BUTTONS = ['WhatsApp', 'Call', 'Map'];

// Plans. Prices are FJD per month. Businesses pay by the Fiji QR (BSP wallet), then you mark the payment Paid.
var PLANS = {
  'Vinaka Featured': { price: 15, key: 'featured' },
  'Tabua Premium': { price: 40, key: 'premium' }
};
var FREE_PLAN = 'Bula Free';
var TRIAL = 'Vinaka Featured - free first month';
var PAY_TO = '921 1153';
var PAYMENTS_SHEET = 'Payments';
var PAYMENTS_HEAD = ['Payment ref', 'Requested', 'Shop ref', 'Business', 'Plan', 'Months', 'Amount (FJD)', 'Contact',
  'Status', 'M-PAiSA receipt no.', 'Applied', 'Notes'];
var PAY_STATUSES = ['Requested', 'Paid', 'Free trial approved', 'Cancelled'];

// Business dashboard, shop pages and products
var SITE = 'https://business-hub-fiji.vercel.app';
var CATEGORY_LIST = ['Fish & food', 'Supermarket & grocery', 'Restaurant & takeaway',
  'Hardware & building', 'Land development & civil works', 'Land surveying', 'Land consultancy',
  'Car rental', 'Carwash', 'Transport & delivery', 'Clothing & retail', 'Other services'];
var PRODUCTS_SHEET = 'Products';
var PRODUCTS_HEAD = ['Product ID', 'Shop ref', 'Name', 'Price (FJD)', 'Description', 'Photo', 'Available', 'Updated'];
var PHOTO_FOLDER = 'Business Hub Fiji shop photos';
var MAX_PHOTOS = 6, MAX_PRODUCTS = 30;            // Bula Free and Vinaka Featured
var PREMIUM_PHOTOS = 12, PREMIUM_PRODUCTS = 100;   // Tabua Premium: bigger shop website
// Each shop's website is a free gift for this many months after registering.
// After that it stays online while the shop is on a paid plan (Vinaka Featured or Tabua Premium).
var WEBSITE_FREE_MONTHS = 2;
var PHOTO_RE = /^(https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]{20,}|\/[\w-]+\.(jpe?g|png|webp))$/;

function col_(heading) {
  for (var i = 0; i < COLUMNS.length; i++) if (COLUMNS[i][0] === heading) return i + 1;
  return 0;
}

/** Run from the editor: sets up the sheet headings and asks for permissions. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  var headers = COLUMNS.map(function (c) { return c[0]; });
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#10213c').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  var n = sh.getMaxRows() - 1;
  sh.getRange(2, 1, n, headers.length).clearDataValidations();
  sh.getRange(2, col_('Status'), n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
  sh.getRange(2, col_('Listing'), n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(LISTING, true).setAllowInvalid(true).build());
  sh.getRange(2, col_('Received'), n, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  sh.getRange(2, col_('Phone/WhatsApp'), n, 1).setNumberFormat('@');
  sh.getRange(2, col_('Reg no./TIN'), n, 1).setNumberFormat('@');
  sh.getRange(1, col_('Received'), 1, 1).setNote('Fiji time');
  ['Sheet1', 'Sheet 1'].forEach(function (name) {
    var s = ss.getSheetByName(name);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  setupExtras_(ss);
  MailApp.getRemainingDailyQuota(); // asks for the email permission
  Logger.log('Setup done.');
}

function setupExtras_(ss) {
  var head = function (sh, cols) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#10213c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  };
  var c = ss.getSheetByName(CLICKS_SHEET) || ss.insertSheet(CLICKS_SHEET);
  head(c, CLICKS_HEAD);
  c.getRange(2, 1, c.getMaxRows() - 1, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  var r = ss.getSheetByName(REPORTS_SHEET) || ss.insertSheet(REPORTS_SHEET);
  head(r, REPORTS_HEAD);
  r.getRange(2, 2, r.getMaxRows() - 1, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  r.getRange(2, 8, r.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(REPORT_STATUSES, true).build());
  r.setColumnWidth(5, 320);
  var reg = ss.getSheetByName(SHEET_NAME), rn = reg.getMaxRows() - 1;
  reg.getRange(2, col_('Plan'), rn, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList([FREE_PLAN].concat(Object.keys(PLANS)), true).setAllowInvalid(true).build());
  reg.getRange(2, col_('Paid until'), rn, 1).setNumberFormat('d mmm yyyy');
  reg.getRange(1, col_('Paid until'), 1, 1).setNote('Featured and Premium badges show until this date. Filled in automatically when you mark a payment Paid.');
  var last = reg.getLastRow();
  if (last > 1) {
    var joinV = reg.getRange(2, col_('Joining as'), last - 1, 1).getValues();
    var planR = reg.getRange(2, col_('Plan'), last - 1, 1), planV = planR.getValues();
    for (var i = 0; i < planV.length; i++) if (joinV[i][0] === 'Business' && !planV[i][0]) planV[i][0] = FREE_PLAN;
    planR.setValues(planV);
  }
  var pay = ss.getSheetByName(PAYMENTS_SHEET) || ss.insertSheet(PAYMENTS_SHEET);
  head(pay, PAYMENTS_HEAD);
  var pn = pay.getMaxRows() - 1;
  pay.getRange(2, 2, pn, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  pay.getRange(2, 11, pn, 1).setNumberFormat('d mmm yyyy');
  pay.getRange(2, 9, pn, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(PAY_STATUSES, true).build());
  pay.getRange(1, 9).setNote('Set to Paid once the QR payment has arrived (or Free trial approved). The shop\'s plan and badge update by themselves.');
  var prod = ss.getSheetByName(PRODUCTS_SHEET) || ss.insertSheet(PRODUCTS_SHEET);
  head(prod, PRODUCTS_HEAD);
  prod.getRange(2, 4, prod.getMaxRows() - 1, 1).setNumberFormat('0.00');
  prod.getRange(2, 8, prod.getMaxRows() - 1, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  if (last > 1) {
    var bizV = reg.getRange(2, col_('Business name'), last - 1, 1).getValues();
    var slugR = reg.getRange(2, col_('Shop page'), last - 1, 1), slugV = slugR.getValues(), used = {};
    for (var k = 0; k < slugV.length; k++) {
      if (joinV[k][0] !== 'Business') continue;
      if (!slugV[k][0]) { var base = slugify_(bizV[k][0]), sl = base, n2 = 2; while (used[sl]) sl = base + '-' + (n2++); slugV[k][0] = sl; }
      used[slugV[k][0]] = true;
    }
    slugR.setValues(slugV);
  }
  photoFolder_();
  var s = ss.getSheetByName(SUMMARY_SHEET) || ss.insertSheet(SUMMARY_SHEET);
  s.getRange('A1').setValue('All time').setFontWeight('bold');
  s.getRange('F1').setValue('This month').setFontWeight('bold');
  s.getRange('A3').setFormula('=IFERROR(QUERY(Clicks!A2:C, "select B, count(A) where B is not null group by B pivot C label B \'Business\'", 0), "No taps yet")');
  s.getRange('F3').setFormula('=IFERROR(QUERY(Clicks!A2:C, "select B, count(A) where B is not null and A >= date \'"&TEXT(EOMONTH(TODAY(),-1)+1,"yyyy-mm-dd")&"\' group by B pivot C label B \'Business\'", 0), "No taps this month yet")');
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'listings') return json_({ ok: true, listings: listings_() });
  if (action === 'shop') return json_(publicShop_(cut_(e.parameter.slug, 80)));
  return ContentService.createTextOutput('Business Hub Fiji registrations are working.');
}

function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) { data = (e && e.parameter) || {}; }
  if (/^ops_/.test(data.action || '')) return json_(operations_(data));
  if (data.action === 'click') return json_(click_(data));
  if (data.action === 'report') return json_(report_(data));
  if (data.action === 'plan') return json_(planRequest_(data));
  if (data.action === 'login_start') return json_(loginStart_(data));
  if (data.action === 'login_verify') return json_(loginVerify_(data));
  if (data.action === 'logout') { CacheService.getScriptCache().remove('sess_' + cut_(data.token, 64)); return json_({ ok: true }); }
  if (/^(shop_get|shop_save|photo_add|photo_remove|product_save|product_delete)$/.test(data.action || '')) {
    var ref = session_(data.token);
    if (!ref) return json_({ ok: false, error: 'Your login has expired. Please log in again.', expired: true });
    try {
      if (data.action === 'shop_get') return json_(shopGet_(ref));
      if (data.action === 'shop_save') return json_(shopSave_(ref, data));
      if (data.action === 'photo_add') return json_(photoAdd_(ref, data));
      if (data.action === 'photo_remove') return json_(photoRemove_(ref, data));
      if (data.action === 'product_save') return json_(productSave_(ref, data));
      if (data.action === 'product_delete') return json_(productDelete_(ref, data));
    } catch (err) {
      console.error(data.action + ': ' + err);
      return json_({ ok: false, error: 'Something went wrong. Please try again.' });
    }
  }
  return json_(save_(data));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function save_(raw) {
  var d = {};
  COLUMNS.forEach(function (c) {
    if (c[1]) d[c[1]] = String(raw[c[1]] == null ? '' : raw[c[1]]).trim().slice(0, 1000);
  });
  if (raw.website) return { ok: true, reference: d.reference || ref_() }; // spam trap

  var isBiz = d.joining_as === 'Business';
  if (!d.name) return { ok: false, error: 'Please enter your name.' };
  if (!d.phone && !EMAIL_RE.test(d.email)) return { ok: false, error: 'Please enter a phone number or email.' };
  if (isBiz) {
    if (!d.business_name) return { ok: false, error: 'Please enter your business name.' };
    if (d.reg_no.replace(/[^A-Za-z0-9]/g, '').length < 4) return { ok: false, error: 'Please enter your business registration number or TIN.' };
    if (!d.category) return { ok: false, error: 'Please choose a category.' };
    if (d.listing_consent !== 'Yes') return { ok: false, error: 'Please agree to show your business in the mall.' };
  } else {
    ['business_name', 'reg_no', 'category', 'offers', 'google_maps', 'payments', 'commission_understood', 'listing_consent']
      .forEach(function (k) { d[k] = ''; });
  }
  if (!/^BHF-\d{6}-[A-Z0-9]{4}$/.test(d.reference)) d.reference = ref_();

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) {
    return { ok: false, error: 'We are busy right now. Please try again in a minute.' };
  }
  try {
    var row = COLUMNS.map(function (c) {
      if (c[0] === 'Received') return new Date();
      if (c[0] === 'Status') return 'New';
      if (c[0] === 'Listing') return isBiz ? 'Live' : '';
      if (c[0] === 'Check') return isBiz ? '=HYPERLINK("' + REGISTRY_URL + '","Check")' : '';
      if (c[0] === 'Plan') return isBiz ? FREE_PLAN : '';
      if (c[0] === 'Paid until') return '';
      if (c[0] === 'Shop page') return isBiz ? uniqueSlug_(d.business_name) : '';
      return safe_(d[c[1]]);
    });
    sheet_().appendRow(row);
    CacheService.getScriptCache().remove('listings');
  } finally {
    lock.releaseLock();
  }

  try { alertHub_(d); } catch (err) { console.error('Hub alert failed: ' + err); }
  if (SEND_CONFIRMATION && EMAIL_RE.test(d.email)) {
    try { confirm_(d, isBiz); } catch (err) { console.error('Confirmation failed: ' + err); }
  }
  return { ok: true, reference: d.reference, listed: isBiz };
}

function cut_(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** One tap on a shop's WhatsApp, Call or Map button. No personal details are kept. */
function click_(raw) {
  var name = cut_(raw.business, 120), button = cut_(raw.button, 20);
  if (!name || BUTTONS.indexOf(button) < 0) return { ok: false };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return { ok: false }; }
  try {
    var sh = book_().getSheetByName(CLICKS_SHEET);
    if (!sh) return { ok: false };
    sh.appendRow([new Date(), safe_(name), button]);
  } finally { lock.releaseLock(); }
  return { ok: true };
}

/** A customer reports a problem with a shop, or with the hub. */
function report_(raw) {
  if (raw.website) return { ok: true, reference: 'R-0000' }; // spam trap
  var d = {
    business: cut_(raw.business, 120) || '(General / not about one shop)',
    problem: cut_(raw.problem, 60),
    details: cut_(raw.details, 1500),
    name: cut_(raw.name, 80),
    contact: cut_(raw.contact, 120)
  };
  if (REPORT_TYPES.indexOf(d.problem) < 0) return { ok: false, error: 'Please choose what the problem is.' };
  if (d.details.length < 5) return { ok: false, error: 'Please tell us a little about what happened.' };
  var ref = 'R-' + Utilities.formatDate(new Date(), 'Pacific/Fiji', 'yyMMdd') + '-' + ref_().slice(-4);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return { ok: false, error: 'We are busy right now. Please try again in a minute.' }; }
  try {
    var sh = book_().getSheetByName(REPORTS_SHEET);
    if (!sh) return { ok: false, error: 'Reports are not set up yet.' };
    sh.appendRow([ref, new Date(), safe_(d.business), d.problem, safe_(d.details), safe_(d.name), safe_(d.contact), 'New']);
  } finally { lock.releaseLock(); }
  try {
    var opts = { name: SENDER_NAME };
    if (EMAIL_RE.test(d.contact)) opts.replyTo = d.contact;
    MailApp.sendEmail(HUB_EMAIL, 'Problem report ' + ref + ': ' + d.business,
      'A customer has reported a problem.\n\nBusiness: ' + d.business + '\nProblem: ' + d.problem +
      '\nDetails: ' + d.details + '\nName: ' + (d.name || '-') + '\nContact: ' + (d.contact || '-') +
      '\n\nIt is saved in the Reports tab with Status: New. To take a listing down, set its Listing cell to Hidden.', opts);
  } catch (err) { console.error('Report alert failed: ' + err); }
  return { ok: true, reference: ref };
}

/** A business asks to upgrade. Logged in Payments; you confirm the QR payment by hand. */
function planRequest_(raw) {
  if (raw.website) return { ok: true, reference: 'P-0000' };
  var shopRef = cut_(raw.shop_ref, 20).toUpperCase(), plan = cut_(raw.plan, 60), contact = cut_(raw.contact, 120);
  var months = parseInt(raw.months, 10);
  if (!/^BHF-\d{6}-[A-Z0-9]{4}$/.test(shopRef)) return { ok: false, error: 'Please enter your shop reference, like BHF-261118-AB12. It is in your welcome email.' };
  var isTrial = plan === TRIAL;
  if (!isTrial && !PLANS[plan]) return { ok: false, error: 'Please choose a plan.' };
  if (isTrial) months = 1;
  if ([1, 3, 6, 12].indexOf(months) < 0) return { ok: false, error: 'Please choose how many months.' };

  var reg = sheet_(), values = reg.getDataRange().getValues(), head = values[0].map(String);
  var iRef = head.indexOf('Reference'), iJoin = head.indexOf('Joining as'), iBiz = head.indexOf('Business name');
  var shop = null;
  for (var r = 1; r < values.length; r++) if (String(values[r][iRef]) === shopRef && values[r][iJoin] === 'Business') { shop = values[r]; break; }
  if (!shop) return { ok: false, error: 'We could not find a business with that reference. Check it, or WhatsApp us on +679 ' + PAY_TO + '.' };
  var business = String(shop[iBiz]).replace(/^'/, '');

  var pay = book_().getSheetByName(PAYMENTS_SHEET);
  if (!pay) return { ok: false, error: 'Plans are not set up yet.' };
  if (isTrial) {
    var pv = pay.getDataRange().getValues();
    for (var j = 1; j < pv.length; j++) if (String(pv[j][2]) === shopRef && pv[j][8] !== 'Cancelled')
      return { ok: false, error: 'The free first month is only for shops that have not had a plan before.' };
  }
  var amount = isTrial ? 0 : PLANS[plan].price * months;
  var ref = 'P-' + Utilities.formatDate(new Date(), 'Pacific/Fiji', 'yyMMdd') + '-' + ref_().slice(-4);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return { ok: false, error: 'We are busy right now. Please try again in a minute.' }; }
  try {
    pay.appendRow([ref, new Date(), shopRef, safe_(business), isTrial ? TRIAL : plan, months, amount, safe_(contact), 'Requested', '', '', '']);
  } finally { lock.releaseLock(); }
  try {
    MailApp.sendEmail(HUB_EMAIL, 'Plan request ' + ref + ': ' + business + ' - ' + (isTrial ? 'free trial' : plan),
      business + ' (' + shopRef + ') asked for ' + (isTrial ? TRIAL : plan + ' for ' + months + ' month(s)') +
      '.\nAmount: FJD ' + amount + '\nContact: ' + (contact || '-') +
      '\n\nWhen the QR payment arrives in the BSP wallet (or to approve the free month), open the Payments tab and set Status to ' +
      (isTrial ? 'Free trial approved' : 'Paid') + '. The badge then appears in the mall by itself.', { name: SENDER_NAME });
  } catch (err) { console.error('Plan alert failed: ' + err); }
  return { ok: true, reference: ref, amount: amount, business: business, pay_to: PAY_TO, trial: isTrial };
}

/** When you mark a payment Paid (or approve a free month), update that shop's plan and Paid until date. */
function onEdit(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== PAYMENTS_SHEET || e.range.getColumn() > 9 || e.range.getLastColumn() < 9) return;
    for (var row = e.range.getRow(); row <= e.range.getLastRow(); row++) if (row > 1) applyPayment_(sh, row);
  } catch (err) { console.error('onEdit: ' + err); }
}

function applyPayment_(pay, row) {
  var v = pay.getRange(row, 1, 1, PAYMENTS_HEAD.length).getValues()[0];
  var status = v[8], applied = v[10];
  if (applied || (status !== 'Paid' && status !== 'Free trial approved')) return;
  var shopRef = String(v[2]), plan = String(v[4]) === TRIAL ? 'Vinaka Featured' : String(v[4]), months = Number(v[5]) || 1;
  if (!PLANS[plan]) return;
  var reg = pay.getParent().getSheetByName(SHEET_NAME), values = reg.getDataRange().getValues(), head = values[0].map(String);
  var iRef = head.indexOf('Reference'), iPlan = head.indexOf('Plan'), iUntil = head.indexOf('Paid until');
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][iRef]) !== shopRef) continue;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cur = values[r][iUntil];
    var start = (cur instanceof Date && cur > today && values[r][iPlan] === plan) ? new Date(cur) : today;
    start.setMonth(start.getMonth() + months);
    reg.getRange(r + 1, iPlan + 1).setValue(plan);
    reg.getRange(r + 1, iUntil + 1).setValue(start);
    pay.getRange(row, 11).setValue(new Date());
    var c = CacheService.getScriptCache(); c.remove('listings');
    var slug = String(values[r][head.indexOf('Shop page')] || '');
    if (slug) c.remove('shop_' + slug);
    try {
      var name = String(values[r][head.indexOf('Business name')]).replace(/^'/, '');
      var todo = plan === 'Tabua Premium'
        ? '- Make this month\'s promo video for them and post it on Business Hub TikTok and Facebook\n- Give their posts priority (first and more often)\n- Their website now allows 12 photos and 100 products\n- Send their monthly tap report from the Click summary sheet'
        : '- Add them to this month\'s Business Hub social media advertising (Facebook and TikTok)';
      MailApp.sendEmail(HUB_EMAIL, 'Plan active: ' + name + ' on ' + plan,
        name + ' (' + shopRef + ') is now on ' + plan + ' until ' + Utilities.formatDate(start, 'Pacific/Fiji', 'd MMM yyyy') +
        '.\n\nTo do:\n' + todo + '\n\nShop website: ' + SITE + '/shop/' + slug, { name: SENDER_NAME });
    } catch (err) { console.error('plan alert: ' + err); }
    return;
  }
  pay.getRange(row, 12).setValue('Shop reference not found in Registrations');
}

// ---------- Business dashboard ----------

function slugify_(name) {
  var s = String(name || '').toLowerCase().replace(/^'/, '').replace(/\b(pte|ltd|limited)\b/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return s || 'shop';
}

function uniqueSlug_(name) {
  var base = slugify_(name), values = sheet_().getDataRange().getValues(), i = values[0].indexOf('Shop page'), used = {};
  if (i >= 0) for (var r = 1; r < values.length; r++) used[String(values[r][i])] = true;
  var s = base, n = 2;
  while (used[s]) s = base + '-' + (n++);
  return s;
}

function photoList_(v) {
  return String(v || '').split(/\s+/).filter(function (u) { return PHOTO_RE.test(u); }).slice(0, PREMIUM_PHOTOS);
}

function photoFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder(PHOTO_FOLDER);
  props.setProperty('PHOTO_FOLDER_ID', f.getId());
  return f;
}

/** Find a business row by its shop reference. */
function findShop_(ref) {
  var sh = sheet_(), values = sh.getDataRange().getValues(), head = values[0].map(String);
  var iRef = head.indexOf('Reference'), iJoin = head.indexOf('Joining as');
  for (var r = 1; r < values.length; r++)
    if (String(values[r][iRef]) === ref && values[r][iJoin] === 'Business') return { sh: sh, row: r + 1, v: values[r], head: head };
  return null;
}

function cell_(shop, heading) { var i = shop.head.indexOf(heading); return i < 0 ? '' : shop.v[i]; }

function setCell_(shop, heading, value) {
  var i = shop.head.indexOf(heading);
  if (i < 0) throw new Error('Missing column ' + heading);
  shop.sh.getRange(shop.row, i + 1).setValue(value);
  shop.v[i] = value;
}

function clearCaches_(shop) {
  var c = CacheService.getScriptCache();
  c.remove('listings');
  if (shop) c.remove('shop_' + cell_(shop, 'Shop page'));
}

/** The date the free website period ends for a shop registered on this date. */
function websiteFreeUntil_(received) {
  if (!(received instanceof Date)) return null;
  var d = new Date(received); d.setMonth(d.getMonth() + WEBSITE_FREE_MONTHS); d.setHours(23, 59, 59, 0);
  return d;
}

function tierOf_(plan, until) {
  var now = new Date(); now.setHours(0, 0, 0, 0);
  return (PLANS[plan] && until instanceof Date && until >= now) ? PLANS[plan].key : '';
}

function limits_(shop) {
  var prem = tierOf_(String(cell_(shop, 'Plan')), cell_(shop, 'Paid until')) === 'premium';
  return { photos: prem ? PREMIUM_PHOTOS : MAX_PHOTOS, products: prem ? PREMIUM_PRODUCTS : MAX_PRODUCTS };
}

function maskEmail_(e) {
  var p = String(e).split('@');
  return p[0].charAt(0) + '***@' + (p[1] || '');
}

function loginStart_(raw) {
  var ref = cut_(raw.ref, 20).toUpperCase();
  if (!/^BHF-\d{6}-[A-Z0-9]{4}$/.test(ref)) return { ok: false, error: 'Please enter your shop reference, like BHF-261118-AB12.' };
  var shop = findShop_(ref);
  if (!shop) return { ok: false, error: 'We could not find a business with that reference. Check it, or WhatsApp us on +679 921 1153.' };
  var email = String(cell_(shop, 'Email')).replace(/^'/, '').trim();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'There is no email on file for this shop. WhatsApp us on +679 921 1153 and we will add one.' };
  var cache = CacheService.getScriptCache();
  if (cache.get('sent_' + ref)) return { ok: true, email_hint: maskEmail_(email), already: true };
  var code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('code_' + ref, JSON.stringify({ code: code, tries: 0 }), 600);
  cache.put('sent_' + ref, '1', 60);
  MailApp.sendEmail(email, 'Your Business Hub Fiji login code: ' + code,
    'Bula,\n\nYour login code for the ' + String(cell_(shop, 'Business name')).replace(/^\'/, '') + ' dashboard is:\n\n' + code +
    '\n\nIt works for 10 minutes. If you did not ask for this, you can ignore this email.\n\nVinaka,\nBusiness Hub Fiji',
    { name: SENDER_NAME, replyTo: HUB_EMAIL });
  return { ok: true, email_hint: maskEmail_(email) };
}

function loginVerify_(raw) {
  var ref = cut_(raw.ref, 20).toUpperCase(), code = cut_(raw.code, 10).replace(/\D/g, '');
  var cache = CacheService.getScriptCache(), saved = cache.get('code_' + ref);
  if (!saved) return { ok: false, error: 'That code has expired. Please ask for a new one.' };
  var s = JSON.parse(saved);
  if (s.tries >= 5) { cache.remove('code_' + ref); return { ok: false, error: 'Too many tries. Please ask for a new code.' }; }
  if (code !== s.code) { s.tries++; cache.put('code_' + ref, JSON.stringify(s), 600); return { ok: false, error: 'That code is not right. Check the email and try again.' }; }
  cache.remove('code_' + ref);
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache.put('sess_' + token, ref, 21600);
  return { ok: true, token: token };
}

function session_(token) {
  token = cut_(token, 64);
  if (!/^[a-f0-9]{64}$/.test(token)) return '';
  return CacheService.getScriptCache().get('sess_' + token) || '';
}

function productsFor_(ref, onlyAvailable) {
  var sh = book_().getSheetByName(PRODUCTS_SHEET);
  if (!sh) return [];
  var v = sh.getDataRange().getValues(), out = [], categoryColumn = productCategoryColumn_(sh, false);
  for (var r = 1; r < v.length; r++) {
    if (String(v[r][1]) !== ref) continue;
    var avail = v[r][6] !== 'No';
    if (onlyAvailable && !avail) continue;
    out.push({ id: String(v[r][0]), name: plain_(v[r][2]), price: v[r][3] === '' ? '' : Number(v[r][3]),
      category: categoryColumn ? plain_(v[r][categoryColumn - 1]).slice(0, 80) : '', description: plain_(v[r][4]), photo: PHOTO_RE.test(String(v[r][5])) ? String(v[r][5]) : '', available: avail });
  }
  return out;
}

function shopGet_(ref) {
  var shop = findShop_(ref);
  if (!shop) return { ok: false, error: 'Shop not found.' };
  var until = cell_(shop, 'Paid until'), free = websiteFreeUntil_(cell_(shop, 'Received'));
  var tier = tierOf_(String(cell_(shop, 'Plan')), until), siteLive = !!tier || !free || free >= new Date();
  return { ok: true, shop: {
    website_live: siteLive, website_free_until: free ? Utilities.formatDate(free, 'Pacific/Fiji', 'd MMM yyyy') : '',
    website_free_months: WEBSITE_FREE_MONTHS,
    max_photos: limits_(shop).photos, max_products: limits_(shop).products,
    ref: ref, name: plain_(cell_(shop, 'Business name')), category: plain_(cell_(shop, 'Category')),
    offers: plain_(cell_(shop, 'Offers')), about: plain_(cell_(shop, 'About')), hours: plain_(cell_(shop, 'Opening hours')),
    town: plain_(cell_(shop, 'Town/area')), payments: plain_(cell_(shop, 'Payments accepted')),
    phone: plain_(cell_(shop, 'Phone/WhatsApp')), maps: plain_(cell_(shop, 'Google Maps')),
    photos: photoList_(cell_(shop, 'Shop photos')), slug: String(cell_(shop, 'Shop page') || ''),
    listing: String(cell_(shop, 'Listing')), plan: String(cell_(shop, 'Plan') || FREE_PLAN),
    paid_until: until instanceof Date ? Utilities.formatDate(until, 'Pacific/Fiji', 'd MMM yyyy') : ''
  }, products: productsFor_(ref, false), categories: CATEGORY_LIST };
}

function shopSave_(ref, raw) {
  var shop = findShop_(ref);
  if (!shop) return { ok: false, error: 'Shop not found.' };
  var maps = cut_(raw.maps, 500), cat = cut_(raw.category, 60);
  if (maps && !/^https:\/\//.test(maps)) return { ok: false, error: 'The Google Maps link should start with https://' };
  if (CATEGORY_LIST.indexOf(cat) < 0) return { ok: false, error: 'Please choose a category.' };
  var phone = cut_(raw.phone, 40);
  if (phone.replace(/\D/g, '').length < 7) return { ok: false, error: 'Please enter a phone or WhatsApp number customers can use.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    setCell_(shop, 'Offers', safe_(cut_(raw.offers, 300)));
    setCell_(shop, 'About', safe_(cut_(raw.about, 1500)));
    setCell_(shop, 'Opening hours', safe_(cut_(raw.hours, 200)));
    setCell_(shop, 'Town/area', safe_(cut_(raw.town, 60)));
    setCell_(shop, 'Payments accepted', safe_(cut_(raw.payments, 200)));
    setCell_(shop, 'Phone/WhatsApp', "'" + phone);
    setCell_(shop, 'Google Maps', maps);
    setCell_(shop, 'Category', cat);
  } finally { lock.releaseLock(); }
  clearCaches_(shop);
  return { ok: true };
}

/** Save a resized JPEG (sent as base64) to the shop's Drive folder and return its public link. */
function savePhoto_(ref, b64) {
  b64 = String(b64 || '').replace(/^data:image\/jpeg;base64,/, '');
  if (!/^[A-Za-z0-9+\/=]+$/.test(b64) || b64.length > 2000000) throw new Error('bad photo');
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length < 200 || (bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8) throw new Error('not jpeg');
  var root = photoFolder_(), it = root.getFoldersByName(ref), folder = it.hasNext() ? it.next() : root.createFolder(ref);
  var file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', ref + '-' + Date.now() + '.jpg'));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

function trashPhoto_(url) {
  var m = /\/d\/([\w-]+)$/.exec(String(url));
  if (m) { try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (e) {} }
}

function photoAdd_(ref, raw) {
  var shop = findShop_(ref);
  if (!shop) return { ok: false, error: 'Shop not found.' };
  var list = photoList_(cell_(shop, 'Shop photos'));
  var maxP = limits_(shop).photos;
  if (list.length >= maxP) return { ok: false, error: 'You can have up to ' + maxP + ' shop photos' + (maxP < PREMIUM_PHOTOS ? ' (' + PREMIUM_PHOTOS + ' on Tabua Premium)' : '') + '. Remove one first.' };
  var url;
  try { url = savePhoto_(ref, raw.photo); } catch (e) { console.error(e); return { ok: false, error: 'That photo could not be saved. Please try a different photo.' }; }
  list.push(url);
  setCell_(shop, 'Shop photos', list.join('\n'));
  clearCaches_(shop);
  return { ok: true, photos: list };
}

function photoRemove_(ref, raw) {
  var shop = findShop_(ref);
  if (!shop) return { ok: false, error: 'Shop not found.' };
  var list = photoList_(cell_(shop, 'Shop photos')), url = cut_(raw.url, 200), i = list.indexOf(url);
  if (i < 0) return { ok: false, error: 'Photo not found.' };
  list.splice(i, 1);
  setCell_(shop, 'Shop photos', list.join('\n'));
  trashPhoto_(url);
  clearCaches_(shop);
  return { ok: true, photos: list };
}

function productSave_(ref, raw) {
  var shop = findShop_(ref);
  if (!shop) return { ok: false, error: 'Shop not found.' };
  var name = cut_(raw.name, 80);
  if (String(raw.category || "").trim().length > 80) return { ok: false, error: "Category must be 80 characters or fewer." };
  if (!name) return { ok: false, error: 'Please give the product a name.' };
  var price = String(raw.price == null ? '' : raw.price).replace(/[^0-9.]/g, '');
  if (price && !/^\d{1,7}(\.\d{1,2})?$/.test(price)) return { ok: false, error: 'Please enter the price as a number, like 25 or 12.50.' };
  var sh = book_().getSheetByName(PRODUCTS_SHEET), v = sh.getDataRange().getValues();
  var id = cut_(raw.id, 20), row = -1, count = 0, oldPhoto = '';
  for (var r = 1; r < v.length; r++) {
    if (String(v[r][1]) !== ref) continue;
    count++;
    if (id && String(v[r][0]) === id) { row = r + 1; oldPhoto = String(v[r][5]); }
  }
  if (id && row < 0) return { ok: false, error: 'Product not found.' };
  var maxN = limits_(shop).products;
  if (!id && count >= maxN) return { ok: false, error: 'You can list up to ' + maxN + ' products' + (maxN < PREMIUM_PRODUCTS ? ' (' + PREMIUM_PRODUCTS + ' on Tabua Premium)' : '') + '.' };
  var photo = oldPhoto;
  if (raw.photo) {
    try { photo = savePhoto_(ref, raw.photo); } catch (e) { return { ok: false, error: 'That photo could not be saved. Please try a different photo.' }; }
    if (oldPhoto) trashPhoto_(oldPhoto);
  } else if (raw.remove_photo && oldPhoto) { trashPhoto_(oldPhoto); photo = ''; }
  var values = [id || ('PR-' + Utilities.getUuid().slice(0, 8).toUpperCase()), ref, safe_(name), price === '' ? '' : Number(price),
    safe_(cut_(raw.description, 400)), photo, raw.available === false || raw.available === 'No' ? 'No' : 'Yes', new Date()];
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (row > 0) sh.getRange(row, 1, 1, values.length).setValues([values]); else { sh.appendRow(values); row = sh.getLastRow(); }
    // An omitted category preserves the existing value for older clients.
    if (Object.prototype.hasOwnProperty.call(raw, 'category')) {
      sh.getRange(row, productCategoryColumn_(sh, true)).setValue(safe_(cut_(raw.category, 80)));
    }
  } finally { lock.releaseLock(); }
  clearCaches_(shop);
  return { ok: true, products: productsFor_(ref, false) };
}

function productDelete_(ref, raw) {
  var shop = findShop_(ref), id = cut_(raw.id, 20);
  var sh = book_().getSheetByName(PRODUCTS_SHEET), v = sh.getDataRange().getValues();
  for (var r = v.length - 1; r >= 1; r--) {
    if (String(v[r][1]) === ref && String(v[r][0]) === id) {
      if (v[r][5]) trashPhoto_(v[r][5]);
      sh.deleteRow(r + 1);
      clearCaches_(shop);
      return { ok: true, products: productsFor_(ref, false) };
    }
  }
  return { ok: false, error: 'Product not found.' };
}

/** Public shop page data. Only live, consented businesses are shown. */
function publicShop_(slug) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { ok: false, error: 'not found' };
  var cache = CacheService.getScriptCache(), hit = cache.get('shop_' + slug);
  if (hit) return JSON.parse(hit);
  var values = sheet_().getDataRange().getValues(), head = values[0].map(String), at = function (h) { return head.indexOf(h); };
  for (var r = 1; r < values.length; r++) {
    var v = values[r];
    if (String(v[at('Shop page')]) !== slug) continue;
    if (v[at('Joining as')] !== 'Business' || String(v[at('Listing')]).trim() !== 'Live' || v[at('Status')] === 'Declined' || v[at('Listing consent')] !== 'Yes') break;
    var tier = tierOf_(String(v[at('Plan')] || ''), v[at('Paid until')]);
    var free = websiteFreeUntil_(v[at('Received')]);
    if (!tier && free && free < new Date()) {
      var paused = { ok: true, paused: true, shop: { name: plain_(v[at('Business name')]), slug: slug } };
      cache.put('shop_' + slug, JSON.stringify(paused), 60);
      return paused;
    }
    var maps = String(v[at('Google Maps')] || '');
    var out = { ok: true, shop: {
      name: plain_(v[at('Business name')]), category: plain_(v[at('Category')]), offers: plain_(v[at('Offers')]),
      about: plain_(v[at('About')]), hours: plain_(v[at('Opening hours')]), town: plain_(v[at('Town/area')]),
      payments: plain_(v[at('Payments accepted')]), phone: String(v[at('Phone/WhatsApp')] || '').replace(/[^\d+]/g, ''),
      maps: /^https:\/\//.test(maps) ? maps : '', tier: tier, photos: photoList_(v[at('Shop photos')]), slug: slug
    }, products: productsFor_(String(v[at('Reference')]), true) };
    cache.put('shop_' + slug, JSON.stringify(out), 60);
    return out;
  }
  return { ok: false, error: 'not found' };
}

/** Live business listings for the mall page. Only public business details are shared. */
function listings_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('listings');
  if (hit) return JSON.parse(hit);

  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0].map(String);
  var at = function (h) { return head.indexOf(h); };
  var iJoin = at('Joining as'), iStatus = at('Status'), iList = at('Listing'), iConsent = at('Listing consent');
  var out = [];
  for (var r = values.length - 1; r >= 1; r--) { // newest first
    var v = values[r];
    if (String(v[iJoin]) !== 'Business') continue;
    if (String(v[iList]).trim() !== 'Live') continue;
    if (String(v[iStatus]) === 'Declined') continue;
    if (iConsent >= 0 && String(v[iConsent]) !== 'Yes') continue;
    var maps = String(v[at('Google Maps')] || '');
    var tier = '', p = String(v[at('Plan')] || ''), until = v[at('Paid until')];
    var now = new Date(); now.setHours(0, 0, 0, 0);
    if (PLANS[p] && until instanceof Date && until >= now) tier = PLANS[p].key;
    var received = v[at('Received')];
    out.push({
      name: plain_(v[at('Business name')]),
      category: plain_(v[at('Category')]),
      offers: plain_(v[at('Offers')]),
      town: plain_(v[at('Town/area')]),
      payments: plain_(v[at('Payments accepted')]),
      phone: String(v[at('Phone/WhatsApp')] || '').replace(/[^\d+]/g, ''),
      maps: /^https:\/\//.test(maps) ? maps : '',
      since: received instanceof Date ? Utilities.formatDate(received, 'Pacific/Fiji', 'yyyy-MM-dd') : '',
      tier: tier,
      photos: photoList_(v[at('Shop photos')]),
      slug: String(v[at('Shop page')] || '')
    });
    if (out.length >= 500) break;
  }
  cache.put('listings', JSON.stringify(out), 60);
  return out;
}

function plain_(v) { return String(v == null ? '' : v).replace(/^'/, '').slice(0, 600); }

function sheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
}

// Stops text like "=..." being run as a spreadsheet formula.
function safe_(v) { v = v || ''; return /^[=+\-@]/.test(v) ? "'" + v : v; }

function ref_() {
  var ymd = Utilities.formatDate(new Date(), 'Pacific/Fiji', 'yyMMdd');
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'BHF-' + ymd + '-' + s;
}

function summary_(d) {
  return COLUMNS.filter(function (c) { return c[1] && d[c[1]]; })
    .map(function (c) { return c[0] + ': ' + d[c[1]]; }).join('\n');
}

function alertHub_(d) {
  var opts = { name: SENDER_NAME };
  if (EMAIL_RE.test(d.email)) opts.replyTo = d.email;
  var biz = d.joining_as === 'Business';
  MailApp.sendEmail(HUB_EMAIL,
    'New registration ' + d.reference + ' (' + d.joining_as + (d.business_name ? ': ' + d.business_name : '') + ')',
    'A new registration has arrived.\n\n' + summary_(d) + '\n\nIt is saved in the Registrations sheet with Status: New.' +
    (biz ? '\n\nThis business is now LIVE in the mall. Check its registration number or TIN at ' + REGISTRY_URL +
      '. To take the listing down, set its Listing cell to Hidden.' : ''),
    opts);
}

function confirm_(d, isBiz) {
  MailApp.sendEmail(d.email, 'Welcome to Business Hub Fiji (' + d.reference + ')',
    'Bula ' + d.name + ',\n\nVinaka for registering with Business Hub Fiji, Fiji\'s online mall.\n\n' +
    'Your registration reference is ' + d.reference + '. Keep it to change or remove your details later.\n\n' +
    (isBiz ? d.business_name + ' is now listed in the mall: https://business-hub-fiji.vercel.app/mall\n\n'
           : 'Browse local shops and services in the mall: https://business-hub-fiji.vercel.app/mall\n\n') +
    'Our team will contact you soon by ' + (d.contact_by || 'your preferred contact') + '.\n\n' +
    'Vinaka,\nBusiness Hub Fiji\n' + HUB_EMAIL,
    { name: SENDER_NAME, replyTo: HUB_EMAIL });
}
