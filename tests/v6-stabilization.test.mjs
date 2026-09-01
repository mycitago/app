import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('Agenda uses V6 staff model and never queries business_staff', () => {
  const js = read('js/admin-agenda.js');
  assert.match(js, /from\(['"]staff['"]\)/);
  assert.doesNotMatch(js, /from\(['"]business_staff['"]\)/);
});

test('Equipo uses staff + service_staff and never duplicate V5 table names', () => {
  const js = read('js/admin-team.js');
  assert.match(js, /from\(['"]staff['"]\)/);
  assert.match(js, /from\(['"]service_staff['"]\)/);
  assert.doesNotMatch(js, /from\(['"]business_staff['"]\)/);
  assert.doesNotMatch(js, /from\(['"]staff_services['"]\)/);
});

test('Reportes has no legacy shell IDs and uses historical appointment price', () => {
  const js = read('js/admin-accounting.js');
  assert.doesNotMatch(js, /biz-name|btn-logout/);
  assert.match(js, /price_charged/);
  assert.doesNotMatch(js, /services\?\.price/);
});

test('Reviews are controlled when GBP Edge Functions are not enabled', () => {
  const js = read('js/admin-reviews.js');
  assert.match(js, /Integración no configurada/);
  assert.match(js, /MYCITAGO_GOOGLE_REVIEWS_ENABLED/);
});

test('V6 master SQL is included', () => {
  const sql = read('SUPABASE_V6_MASTER.sql');
  assert.match(sql, /business_branches/);
  assert.match(sql, /appointments/);
  assert.match(sql, /branch_id/);
});
