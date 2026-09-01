import fs from 'node:fs';
const th=fs.readFileSync('admin/equipo.html','utf8'), tj=fs.readFileSync('js/admin-team.js','utf8'), bh=fs.readFileSync('admin/sucursales.html','utf8'), bj=fs.readFileSync('js/admin-branches.js','utf8'), shell=fs.readFileSync('js/citago-shell.js','utf8');
if(/backend no configurado|backend está corriendo/i.test(th+tj)) throw new Error('legacy backend remains');
if(!tj.includes("from('staff')") || !tj.includes("from('service_staff')")) throw new Error('team not aligned with V6 staff model');
if(tj.includes("from('business_staff')") || tj.includes("from('staff_services')")) throw new Error('duplicate V5 team tables remain');
if(!bj.includes("from('business_branches')")) throw new Error('branches not Supabase native');
if(!shell.includes("['sucursales','Sucursales'")) throw new Error('branch nav missing');
console.log('team branches contract OK');
