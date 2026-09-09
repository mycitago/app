
const fs=require('fs');
const branch=fs.readFileSync(process.argv[2],'utf8');
const dash=fs.readFileSync(process.argv[3],'utf8');
const html=fs.readFileSync(process.argv[4],'utf8');
let fail=false;
function ok(c,m){if(!c){console.error('FAIL:',m);fail=true}}
ok(branch.includes("opts.focus!=='timezone'"),'falta deep-link de timezone');
ok(branch.includes("branches.find(x=>x.is_primary)"),'no abre sucursal principal');
ok(branch.includes("Intl.DateTimeFormat('es-MX',{timeZone:timezone})"),'no valida IANA timezone');
ok(dash.includes("sucursales.html?focus=timezone&return=index.html"),'dashboard no apunta a sucursales');
ok(dash.includes("Boolean(dashState.dashboardTimezone)"),'health no incluye timezone');
ok(dash.includes("const today=op.dateKey"),'KPIs no usan fecha operativa');
ok(html.includes('America/Mexico_City'),'falta zona Centro de México');
ok(html.includes('Para Veracruz'),'falta orientación Veracruz');
process.exit(fail?1:0);
