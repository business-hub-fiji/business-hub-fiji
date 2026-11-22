const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');

function fixture(properties = {}, status = 200, body = '{"id":"message-id"}') {
  const values = new Map(), sent = [], calls = [], logs = [];
  const context = {
    Date, Math, console: { error: message => logs.push(message) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] || null }) },
    CacheService: { getScriptCache: () => ({ get: key => values.get(key) || null,
      put: (key, value) => values.set(key, value), remove: key => values.delete(key) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    MailApp: { sendEmail: (...args) => sent.push(args) },
    UrlFetchApp: { fetch: (url, options) => { calls.push({ url, options });
      return { getResponseCode: () => status, getContentText: () => body }; } },
    Utilities: { getUuid: () => 'a'.repeat(32) }
  };
  vm.createContext(context); vm.runInContext(source, context);
  context.findShop_ = () => ({});
  context.cell_ = (_, heading) => heading === 'Email' ? 'owner@example.com' : 'Test Shop';
  return { context, values, sent, calls, logs };
}
const config = { LOGIN_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-private-key',
  LOGIN_EMAIL_FROM: 'access@login.example.com' };
const ref = 'BHF-261122-AB12';

test('Google remains the default; subject omits the code', () => {
  const f = fixture(); assert.equal(f.context.loginStart_({ ref }).ok, true);
  assert.equal(f.sent.length, 1); assert.equal(f.calls.length, 0);
  assert.equal(f.sent[0][1], 'Your Business Hub Fiji login code');
});
test('Resend sends only to the registered email; browser overrides ignored', () => {
  const f = fixture(config);
  const result = f.context.loginStart_({ ref, email: 'attacker@example.com', provider: 'google' });
  assert.equal(result.ok, true); assert.equal(f.sent.length, 0);
  const payload = JSON.parse(f.calls[0].options.payload);
  assert.deepEqual(payload.to, ['owner@example.com']);
  assert.equal(payload.cc, undefined); assert.equal(payload.bcc, undefined);
  assert.equal(JSON.stringify(result).includes('test-private-key'), false);
  assert.equal(f.context.loginStart_({ ref }).already, true); assert.equal(f.calls.length, 1);
});
for (const [name, props, status, body] of [
  ['missing key', { LOGIN_EMAIL_PROVIDER: 'resend' }, 200, '{"id":"id"}'],
  ['unknown provider', { LOGIN_EMAIL_PROVIDER: 'other' }, 200, '{"id":"id"}'],
  ['rejection', config, 403, '{"message":"private response"}'],
  ['rate limit', config, 429, '{}'],
  ['malformed response', config, 200, 'invalid'],
  ['missing message ID', config, 200, '{}']
]) test(name + ' fails without a code, fallback or false success on retry', () => {
  const f = fixture(props, status, body);
  assert.equal(f.context.loginStart_({ ref }).ok, false);
  assert.equal(f.values.has('code_' + ref), false); assert.equal(f.sent.length, 0);
  assert.equal(f.context.loginStart_({ ref }).ok, false);
  assert.equal(f.logs.join().includes('private response'), false);
  assert.equal(f.logs.join().includes('test-private-key'), false);
});
test('network failure keeps private exceptions out of logs', () => {
  const f = fixture(config); f.context.UrlFetchApp.fetch = () => { throw new Error('test-private-key'); };
  assert.equal(f.context.loginStart_({ ref }).ok, false);
  assert.equal(f.logs.join().includes('test-private-key'), false);
});
test('code verifies once; expired and incorrect codes are rejected', () => {
  const f = fixture(config); f.context.loginStart_({ ref });
  const saved = JSON.parse(f.values.get('code_' + ref));
  assert.equal(f.context.loginVerify_({ ref, code: 'wrong' }).ok, false);
  assert.equal(JSON.parse(f.values.get('code_' + ref)).expires, saved.expires);
  assert.equal(f.context.loginVerify_({ ref, code: saved.code }).ok, true);
  assert.equal(f.context.loginVerify_({ ref, code: saved.code }).ok, false);
  f.values.set('code_' + ref, JSON.stringify({ ...saved, expires: Date.now() - 1 }));
  assert.equal(f.context.loginVerify_({ ref, code: saved.code }).ok, false);
});
