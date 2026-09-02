import assert from 'node:assert/strict';
import fs from 'node:fs';

const rpcNames = [
  'platform_read_support',
  'platform_read_service_templates',
  'platform_read_business_categories',
  'platform_read_business_invites',
  'platform_read_category_change_requests',
  'platform_read_audit_logs'
];

assert.ok(fs.existsSync('sql/platform_read_api.sql'), 'missing additive platform read API migration');
assert.ok(fs.existsSync('js/platform-api.js'), 'missing browser platform API adapter');

const sql = fs.readFileSync('sql/platform_read_api.sql', 'utf8');
const api = fs.readFileSync('js/platform-api.js', 'utf8');
const admin = fs.readFileSync('js/admin-platform.js', 'utf8');
const html = fs.readFileSync('admin/plataforma.html', 'utf8');

for (const rpc of rpcNames) {
  assert.ok(sql.includes(`function public.${rpc}()`), `missing ${rpc} SQL function`);
  const start = sql.indexOf(`function public.${rpc}()`);
  const next = sql.indexOf('create or replace function public.', start + 1);
  const fn = sql.slice(start, next === -1 ? sql.length : next);
  assert.match(fn, /security definer/i, `${rpc} must be SECURITY DEFINER`);
  assert.match(fn, /set search_path\s*=\s*public\s*,\s*pg_temp/i, `${rpc} must fix search_path`);
  assert.ok(fn.includes('public.is_platform_admin(auth.uid())'), `${rpc} must authorize auth.uid() internally`);
  assert.ok(fn.includes("raise exception 'forbidden'"), `${rpc} must reject non-admin callers`);
  assert.ok(sql.includes(`revoke all on function public.${rpc}() from public;`), `${rpc} public execute must be revoked`);
  assert.ok(sql.includes(`grant execute on function public.${rpc}() to authenticated;`), `${rpc} authenticated execute grant missing`);
  assert.ok(api.includes(`rpc('${rpc}')`), `platform-api.js must call ${rpc}`);
}

assert.match(sql, /function public\.is_platform_admin\(p_user_id uuid\)/, 'explicit UUID authorization overload missing');
assert.ok(!sql.includes('grant execute on function public.is_platform_admin(uuid) to authenticated;'), 'UUID helper must not be directly executable by authenticated users');
assert.ok(!/execute\s+format/i.test(sql), 'dynamic SQL is forbidden');
assert.ok(!/p_table|table_name|regclass/i.test(sql), 'generic table-name reader is forbidden');

const forbiddenDirectReads = [
  "from('support_tickets').select",
  "from('service_templates').select",
  "from('business_categories').select",
  "from('business_invites').select",
  "from('business_category_change_requests').select",
  "from('audit_logs').select"
];
for (const direct of forbiddenDirectReads) {
  assert.ok(!admin.includes(direct), `admin-platform.js still has sensitive direct read: ${direct}`);
}

for (const method of [
  'readSupport',
  'readServiceTemplates',
  'readBusinessCategories',
  'readBusinessInvites',
  'readCategoryChangeRequests',
  'readAuditLogs'
]) {
  assert.ok(api.includes(method), `missing PlatformAPI.${method}`);
  assert.ok(admin.includes(`PlatformAPI.${method}()`), `admin-platform.js must consume PlatformAPI.${method}`);
}

const apiPos = html.indexOf('../js/platform-api.js');
const adminPos = html.indexOf('../js/admin-platform.js');
assert.ok(apiPos >= 0, 'plataforma.html must load platform-api.js');
assert.ok(adminPos > apiPos, 'platform-api.js must load before admin-platform.js');

console.log('platform read API security contract OK');
