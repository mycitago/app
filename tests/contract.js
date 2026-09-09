
const fs=require('fs');
const js=fs.readFileSync(process.argv[2],'utf8');
let bad=false; function ok(c,m){if(!c){console.error('FAIL',m);bad=true}}
ok(!js.includes("customers(name,full_name)"),'todavia usa embed customers fragil');
ok(js.includes("services(id,name)"),'perdio relacion de servicios');
ok(js.includes("No se pudieron cargar los reportes (${source})"),'falta diagnostico por fuente');
ok(js.includes("function customerName(a){return 'Cliente'}"),'falta fallback seguro de cliente');
process.exit(bad?1:0);
