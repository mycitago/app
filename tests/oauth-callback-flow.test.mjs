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
  assert.equal(oauth.inviteForOAuth('https://site.test/admin/login.html'), '');
  assert.equal(oauth.inviteForOAuth('https://site.test/admin/login.html?invite=fresh-token'), 'fresh-token');
});

test('login page loads OAuth callback helper and no longer calls getUser immediately in start()', () => {
  const html = fs.readFileSync(path.join(root, 'admin/login.html'), 'utf8');
  assert.match(html, /oauth-login-flow\.js/);
  assert.match(html, /waitForAuthSession\(supabaseClient/);
  assert.doesNotMatch(html, /const\{data\}=await supabaseClient\.auth\.getUser\(\);const user=data\?\.user/);
});

test('OAuth helper exposes the real provider error from the callback hash', () => {
  const oauth = require(path.join(root, 'js/oauth-login-flow.js'));
  assert.equal(
    oauth.oauthErrorFromHash('https://site.test/admin/login.html?oauth=1#error=access_denied&error_description=El+usuario+cancel%C3%B3'),
    'El usuario canceló'
  );
});

test('OAuth cleanup removes transient oauth invite and view parameters', () => {
  const oauth = require(path.join(root, 'js/oauth-login-flow.js'));
  assert.equal(
    oauth.cleanOAuthUrl('https://site.test/admin/login.html?oauth=1&invite=abc&view=register&plan=reserva#access_token=secret'),
    '/admin/login.html?plan=reserva'
  );
});

test('OAuth session wait times out even when getSession never resolves', async () => {
  const oauth = require(path.join(root, 'js/oauth-login-flow.js'));
  const client = {
    auth: {
      getSession(){ return new Promise(() => {}); },
      onAuthStateChange(){
        return { data: { subscription: { unsubscribe(){} } } };
      }
    }
  };
  const result = await Promise.race([
    oauth.waitForAuthSession(client, { timeoutMs: 30 }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('waitForAuthSession hung')), 120))
  ]);
  assert.equal(result, null);
});

test('Supabase client pins implicit OAuth flow explicitly', () => {
  const js = fs.readFileSync(path.join(root, 'js/supabase.js'), 'utf8');
  assert.match(js, /flowType\s*:\s*['\"]implicit['\"]/);
  assert.match(js, /detectSessionInUrl\s*:\s*true/);
});

test('login pins an exact Supabase JS SDK version and handles provider callback errors', () => {
  const html = fs.readFileSync(path.join(root, 'admin/login.html'), 'utf8');
  assert.doesNotMatch(html, /@supabase\/supabase-js@2(?:['\"/])/);
  assert.match(html, /oauthErrorFromHash\(location\.href\)/);
  assert.match(html, /Google no completó el inicio de sesión/);
});
