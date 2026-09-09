
const fs=require('fs');
const sql=fs.readFileSync(process.argv[2],'utf8');
let bad=false;
function ok(c,m){if(!c){console.error('FAIL:',m);bad=true}}
ok(sql.includes('alter extension pgcrypto set schema extensions'),'no fuerza pgcrypto al schema extensions');
ok(sql.includes('extensions.gen_random_bytes(24)'),'gen_random_bytes no esta calificado');
ok(sql.includes('extensions.digest('),'digest no esta calificado');
ok(sql.includes('create or replace function public.create_review_request'),'falta RPC create_review_request');
ok(sql.includes('grant execute on function public.create_review_request(uuid) to authenticated'),'falta grant autenticado');
ok(sql.includes('notify pgrst'), 'falta recarga de schema');
process.exit(bad?1:0);
