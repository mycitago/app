import fs from 'node:fs';
const h=fs.readFileSync('admin/plataforma.html','utf8'), j=fs.readFileSync('js/admin-platform.js','utf8'), s=fs.readFileSync('sql/platform_dashboard_rpc.sql','utf8');
for(const id of ['invite-business','invite-business-dialog','platform-invites','category-requests']) if(!h.includes(`id="${id}"`)) throw new Error(`missing ${id}`);
if(!j.includes('create_business_invite')) throw new Error('invite RPC not used');
if(!j.includes('approve_business_category_change')) throw new Error('category approval not used');
if(!s.includes("to_regclass('public.platform_incidents')")) throw new Error('snapshot not resilient');
console.log('platform operations contract OK');
