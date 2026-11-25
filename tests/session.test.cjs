const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');

const script = readFileSync(join(__dirname, "../docs/shared/session.js"), 'utf8');
const window = {};
runInNewContext(script, { window });
assert.equal(window.CommonSession.memberClient(), null);

const config = {
  communityBackendReady: false,
  supabaseUrl: 'https://example.invalid',
  supabaseAnonKey: 'test-key'
};
window.COMMON_CONFIG = config;
const client = {};
let calls = 0;
window.supabase = {
  createClient(url, key, { auth }) {
    calls++;
    assert.equal(url, config.supabaseUrl);
    assert.equal(key, config.supabaseAnonKey);
    assert.equal(auth.persistSession, true);
    assert.equal(auth.autoRefreshToken, true);
    assert.equal(auth.detectSessionInUrl, true);
    return client;
  }
};
assert.equal(window.CommonSession.memberClient(), null);
config.communityBackendReady = true;
assert.equal(window.CommonSession.memberClient(), client);
assert.equal(window.CommonSession.memberClient(), client);
assert.equal(calls, 1);
console.log('PASS member session configuration and shared client lifecycle');
