
const fs = require('fs');
const path = require('path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname,'..');

function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }
function ok(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } }

const dash = read('js/admin-dashboard-pro.js');
const v3 = read('js/dashboard-v3.js');
const html = read('admin/index.html');
const css = read('css/citago-v3.css');

ok(dash.includes('function operationalDateContext()'), 'falta operationalDateContext()');
ok(dash.includes("const today=operationalDateContext();"), 'renderKPIs no usa contexto operativo');
ok(!dash.includes("const today=dateKey();\n  const next7=addDaysKey(7);"), 'renderKPIs todavía usa fecha del dispositivo');
ok(dash.includes("Boolean(dashState.dashboardTimezone)"), 'timezone no participa en business health');
ok(dash.includes("missing.push('configura la zona horaria')"), 'timezone no aparece como requisito faltante');
ok(dash.includes("Configura la zona horaria para calcular las citas de hoy."), 'falta estado explícito sin timezone para KPI de hoy');
ok(dash.includes("Configura la zona horaria para mostrar la agenda de hoy."), 'agenda de hoy no bloquea dato no confiable');
ok(dash.includes("Configura la zona horaria para calcular próximas citas."), 'próximas citas no bloquea dato no confiable');
ok(html.includes('<div class="kpi-icon"><i data-lucide="clock-3"></i></div>'), 'Por confirmar no usa icono pendiente');
ok(v3.includes("function setLateKpiVisualState(card,state)"), 'Atrasadas no tiene estado visual semántico');
ok(v3.includes("setLateKpiVisualState(card,'config')"), 'Atrasadas no usa estado config cuando falta timezone');
ok(v3.includes("setLateKpiVisualState(card,late.length?'late':'clear')"), 'Atrasadas no distingue atraso real de estado limpio');
ok(!v3.includes("new Date().toISOString().slice(0,10)"), 'V3 todavía cae a fecha del dispositivo');
ok(css.includes('.v3-kpi-late-config .kpi-icon'), 'CSS no neutraliza Atrasadas cuando falta configuración');
ok(css.includes('.v3-kpi-late-danger .kpi-icon'), 'CSS no reserva rojo para atraso real');

if(!process.exitCode) console.log('PASS dashboard operational-date contract');
