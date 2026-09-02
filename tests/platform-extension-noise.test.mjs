import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const file = new URL('../js/extension-noise.js', import.meta.url);

test('silences only the known injected-extension 403 rejection shape', () => {
  assert.equal(fs.existsSync(file), true, 'extension-noise.js must exist');
  const source = fs.readFileSync(file, 'utf8');
  const listeners = {};
  const window = { addEventListener(type, fn){ listeners[type] = fn; } };
  const context = { window, globalThis: window };
  vm.runInNewContext(source, context, { filename: 'extension-noise.js' });
  assert.equal(typeof window.MyCitaGoConsoleGuard?.isInjectedExtension403, 'function');

  const injected = { name:'n', httpError:false, httpStatus:200, httpStatusText:'', code:403 };
  assert.equal(window.MyCitaGoConsoleGuard.isInjectedExtension403(injected), true);

  const postgrest = { code:'42501', message:'permission denied', details:null, hint:null };
  assert.equal(window.MyCitaGoConsoleGuard.isInjectedExtension403(postgrest), false);

  let prevented = false;
  listeners.unhandledrejection({ reason: injected, preventDefault(){ prevented = true; } });
  assert.equal(prevented, true, 'known extension noise should be suppressed');

  prevented = false;
  listeners.unhandledrejection({ reason: postgrest, preventDefault(){ prevented = true; } });
  assert.equal(prevented, false, 'real Supabase errors must remain visible');
});

test('platform loads the console guard before application scripts', () => {
  const html = fs.readFileSync(new URL('../admin/plataforma.html', import.meta.url), 'utf8');
  const guard = html.indexOf('../js/extension-noise.js');
  const app = html.indexOf('../js/admin-platform.js');
  assert.ok(guard >= 0, 'plataforma.html must load extension-noise.js');
  assert.ok(guard < app, 'console guard must load before admin-platform.js');
});
