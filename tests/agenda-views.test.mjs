import fs from 'node:fs';
const h=fs.readFileSync('admin/agenda.html','utf8'), j=fs.readFileSync('js/admin-agenda.js','utf8');
for(const v of ['day','3day','week','month','list']) if(!h.includes(`data-agenda-view="${v}"`)) throw new Error(`missing view ${v}`);
if(!h.includes('agenda-branch-filter')||!h.includes('agenda-staff-filter')||!h.includes('agenda-service-filter')) throw new Error('missing agenda filters');
if((h.match(/Nueva cita/g)||[]).length>1) throw new Error('duplicate agenda new appointment action');
if(!j.includes('mycitago:agenda:view')) throw new Error('view preference not persisted');
console.log('agenda views contract OK');
