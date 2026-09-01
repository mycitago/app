import fs from 'node:fs';
const s=fs.readFileSync('sql/consolidation_schema.sql','utf8');
for (const name of ['business_branches','business_staff','staff_services','branch_services','business_invites','business_category_change_requests','platform_incidents']) {
  if(!new RegExp(`create table if not exists public\\.${name}`,'i').test(s)) throw new Error(`missing ${name}`);
}
for (const fn of ['approve_business_category_change','create_business_invite']) if(!new RegExp(`function public\\.${fn}`,'i').test(s)) throw new Error(`missing ${fn}`);
console.log('consolidation schema contract OK');
