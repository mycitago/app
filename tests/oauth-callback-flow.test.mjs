import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(import.meta.url);

test('OAuth helper waits for a session emitted after callback restoration', async () => {
  const oauth = require(path.join(root, 'js/oauth-login-flow.js'));
  let callback;
  const client = {
    auth: {
      async getSession(){ return { data: { session: null } }; },
      onAuthStateChange(fn){
        callback = fn;
        return { data: { subscription: { unsubscribe(){} } } };
      }
    }
  };

  setTimeout(() => callback('SIGNED_IN', { user: { id: 'u1' } }), 10);
  const session = await oauth.waitForAuthSession(client, { timeoutMs: 200 });
  assert.equal(session?.user?.id, 'u1');
});

test('normal Google login does not reuse a stale invite from localStorage', () => {
  const oauth = require(path.join(root, 'js/oauth-login-flow.js'));
  const storage = { getItem(){ return 'stale-token'; } };
  assert.equal(oauth.inviteForOAuth('https://site.test/admin/login.html', storage), '');
  assert.equal(oauth.inviteForOAuth('https://site.test/admin/login.html?invite=fresh-token', storage), 'fresh-token');
});

test('login page loads OAuth callback helper and no longer calls getUser immediately in start()', () => {
  const html = fs.readFileSync(path.join(root, 'admin/login.html'), 'utf8');
  assert.match(html, /oauth-login-flow\.js/);
  assert.match(html, /waitForAuthSession\(supabaseClient/);
  assert.doesNotMatch(html, /const\{data\}=await supabaseClient\.auth\.getUser\(\);const user=data\?\.user/);
});
