import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('admin/login.html','utf8');
const supabase = fs.readFileSync('js/supabase.js','utf8');

test('Google login is self-contained in the active login page', () => {
  assert.match(html, /window\.MyCitaGoOAuth\s*=/);
  assert.doesNotMatch(html, /oauth-login-flow\.js/);
});

test('Google login navigates through direct Supabase authorize URL', () => {
  assert.match(html, /buildOAuthAuthorizeUrl/);
  assert.match(html, /window\.location\.assign\(authorizeUrl\)/);
  assert.doesNotMatch(html, /signInWithOAuth\s*\(/);
});

test('Google login has visible error handling and timeout recovery', () => {
  assert.match(html, /try\s*\{/);
  assert.match(html, /catch\s*\(/);
  assert.match(html, /showError/);
  assert.match(html, /timeoutMs/);
});

test('Supabase auth keeps implicit flow explicit for static GitHub Pages', () => {
  assert.match(supabase, /flowType\s*:\s*['"]implicit['"]/);
});
