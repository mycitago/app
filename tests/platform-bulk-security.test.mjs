import assert from 'node:assert/strict';
import fs from 'node:fs';

assert.ok(fs.existsSync('sql/platform_bulk_operations.sql'), 'missing additive bulk operations migration');
const sql=fs.readFileSync('sql/platform_bulk_operations.sql','utf8');
const api=fs.readFileSync('js/platform-api.js','utf8');
for(const sig of [
  ['platform_bulk_suspend','uuid[]'],
  ['platform_bulk_reactivate','uuid[],integer']
]){
  const [name,args]=sig;
  assert.match(sql,new RegExp(`function public\\.${name}\\(`,'i'),`missing ${name}`);
  const start=sql.toLowerCase().indexOf(`function public.${name}(`);
  const next=sql.toLowerCase().indexOf('create or replace function public.',start+1);
  const fn=sql.slice(start,next===-1?sql.length:next);
  assert.match(fn,/security definer/i,`${name} must be SECURITY DEFINER`);
  assert.match(fn,/set search_path\s*=\s*public\s*,\s*pg_temp/i,`${name} must fix search_path`);
  assert.ok(fn.includes('public.is_platform_admin(auth.uid())'),`${name} must authorize internally`);
  assert.ok(fn.includes("raise exception 'forbidden'"),`${name} must reject non-admin`);
  assert.match(fn,/foreach\s+v_business_id\s+in\s+array/i,`${name} must process businesses individually`);
  assert.ok(sql.includes(`revoke all on function public.${name}(${args}) from public;`),`${name} public grant must be revoked`);
  assert.ok(sql.includes(`grant execute on function public.${name}(${args}) to authenticated;`),`${name} authenticated grant missing`);
}
assert.ok((sql.match(/insert into public\.audit_logs/gi)||[]).length>=2,'bulk operations must write per-business audit rows');
assert.ok(!/p_table|table_name|execute\s+format/i.test(sql),'generic/dynamic SQL forbidden');
assert.ok(api.includes("rpc('platform_bulk_suspend'"),'browser API must expose platform_bulk_suspend');
assert.ok(api.includes("rpc('platform_bulk_reactivate'"),'browser API must expose platform_bulk_reactivate');
console.log('platform bulk security contract OK');
