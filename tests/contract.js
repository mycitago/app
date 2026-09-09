
const fs=require('fs'), p=require('path'), root=process.argv[2];
const H=fs.readFileSync(p.join(root,'admin','contabilidad.html'),'utf8');
const J=fs.readFileSync(p.join(root,'js','admin-accounting.js'),'utf8');
const S=fs.readFileSync(p.join(root,'sql','ALTER_SALES_IVA.sql'),'utf8');
let bad=false; function ok(c,m){if(!c){console.error('FAIL:',m);bad=true}}
ok(H.includes('report-load-status'),'falta estado de carga visible');
ok(H.includes('sale-vat-applies'),'falta toggle IVA');
ok(H.includes('admin-accounting.js?v=20260909-reportfix2'),'falta cache bust del JS');
ok(J.includes('Promise.allSettled'),'carga de datos sigue siendo todo-o-nada');
ok(J.includes("from('appointments').select('id,appointment_date,status,price_charged,booking_source,customer_id,service_id')"),'appointments sigue usando embeds fragiles');
ok(J.includes("from('services').select('id,name')"),'falta carga separada de servicios');
ok(J.includes('computeVatFromTotal'),'falta calculo IVA');
ok(J.includes('vat_applies'),'falta persistir aplica IVA');
ok(J.includes('0.16'),'falta tasa default 16%');
ok(S.includes('vat_applies boolean not null default true'),'SQL sin default IVA');
ok(S.includes('vat_rate numeric'),'SQL sin tasa IVA');
process.exit(bad?1:0);
