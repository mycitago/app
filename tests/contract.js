
const fs=require('fs');
const sql=fs.readFileSync(process.argv[2],'utf8');
const js=fs.readFileSync(process.argv[3],'utf8');
let bad=false;
function ok(c,m){if(!c){console.error('FAIL:',m);bad=true}}
ok(sql.includes('add column if not exists verified boolean'),'falta verified');
ok(sql.includes('add column if not exists verified_at timestamptz'),'falta verified_at');
ok(sql.includes('add column if not exists appointment_id uuid'),'falta appointment_id');
ok(sql.includes('add column if not exists customer_id uuid'),'falta customer_id');
ok(sql.includes('create or replace function public.submit_internal_review'),'falta RPC submit');
ok(sql.includes("md5(coalesce(p_token,''))"),'submit no usa hash actual');
ok(js.includes("error?.message"),'frontend no muestra error real');
ok(js.includes("request_already_used"),'frontend no traduce enlace usado');
process.exit(bad?1:0);
