from pathlib import Path
import shutil, datetime, sys

ROOT=Path(__file__).resolve().parent
if not (ROOT/"js/admin-dashboard-pro.js").exists() and (ROOT.parent/"js/admin-dashboard-pro.js").exists():
    ROOT=ROOT.parent

targets=[
    "js/admin-dashboard-pro.js",
    "js/dashboard-v3.js",
    "admin/index.html",
    "css/citago-v3.css",
]
missing=[p for p in targets if not (ROOT/p).exists()]
if missing:
    raise SystemExit("Faltan archivos:\n- "+"\n- ".join(missing))

texts={p:(ROOT/p).read_text(encoding="utf-8") for p in targets}

def replace_once(rel,old,new,label):
    count=texts[rel].count(old)
    if count!=1:
        raise RuntimeError(f"{label}: esperaba exactamente 1 coincidencia en {rel}, encontré {count}. NO se escribió ningún archivo.")
    texts[rel]=texts[rel].replace(old,new,1)

# 1) Fuente única de fecha operativa.
replace_once(
"js/admin-dashboard-pro.js",
"""function pad(n){ return String(n).padStart(2,'0'); }
function dateKey(d=new Date()){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthKey(){ return dateKey().slice(0,7); }
function monthStart(){ return `${monthKey()}-01`; }
function addDaysKey(days){
  const d=new Date();
  d.setDate(d.getDate()+days);
  return dateKey(d);
}""",
"""function pad(n){ return String(n).padStart(2,'0'); }
function dateKey(d=new Date()){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function addDaysToDateKey(key,days){
  const d=new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate()+Number(days||0));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}

function operationalDateContext(){
  const now=businessNow();
  if(!now?.dateKey) return null;
  const month=now.dateKey.slice(0,7);
  return {
    today:now.dateKey,
    next7:addDaysToDateKey(now.dateKey,7),
    month,
    monthStart:`${month}-01`
  };
}

function monthStart(){
  return operationalDateContext()?.monthStart || `${dateKey().slice(0,7)}-01`;
}""",
"dashboard-operational-date-helpers"
)

# 2) Etiquetas de fecha: sin timezone no se usa la fecha del dispositivo como si fuera la del negocio.
replace_once(
"js/admin-dashboard-pro.js",
"""function setDates(){
  const now=new Date();
  const timezone=dashState.dashboardTimezone;
  const long=timezone
    ? DashboardPunctuality.formatBusinessDate(now,timezone)
    : now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('today-label').textContent=`Aquí tienes el resumen de tu negocio para ${long}.`;
  $('agenda-date').textContent=long.charAt(0).toUpperCase()+long.slice(1);
  $('month-label').textContent=new Intl.DateTimeFormat('es-MX',{
    timeZone:timezone || undefined,
    month:'long',year:'numeric'
  }).format(now);
}""",
"""function setDates(){
  const now=new Date();
  const timezone=dashState.dashboardTimezone;

  if(!timezone){
    $('today-label').textContent='Configura la zona horaria para definir el día operativo del negocio.';
    $('agenda-date').textContent='Fecha pendiente de configuración';
    $('month-label').textContent='Zona horaria pendiente';
    return;
  }

  const long=DashboardPunctuality.formatBusinessDate(now,timezone);
  $('today-label').textContent=`Aquí tienes el resumen de tu negocio para ${long}.`;
  $('agenda-date').textContent=long.charAt(0).toUpperCase()+long.slice(1);
  $('month-label').textContent=new Intl.DateTimeFormat('es-MX',{
    timeZone:timezone,
    month:'long',year:'numeric'
  }).format(now);
}""",
"dashboard-set-dates"
)

# 3) Timezone entra al porcentaje de completitud y al siguiente pendiente.
replace_once(
"js/admin-dashboard-pro.js",
"""  const checks=[activeServices>0,brandingPublished,teamCount>0,Boolean(dashState.business?.opening_hours),Boolean(dashState.business?.whatsapp||dashState.business?.phone)];""",
"""  const checks=[activeServices>0,brandingPublished,teamCount>0,Boolean(dashState.business?.opening_hours),Boolean(dashState.business?.whatsapp||dashState.business?.phone),Boolean(dashState.dashboardTimezone)];""",
"dashboard-health-timezone-check"
)

replace_once(
"js/admin-dashboard-pro.js",
"""  const missing=[];if(!activeServices)missing.push('agrega un servicio');if(!teamCount)missing.push('agrega equipo');if(!brandingPublished)missing.push('publica tu página');if($('health-note'))$('health-note').textContent=missing.length?`Siguiente recomendado: ${missing[0]}.`:'Todo lo esencial está configurado. Revisa reportes y reseñas para seguir creciendo.';""",
"""  const missing=[];if(!activeServices)missing.push('agrega un servicio');if(!teamCount)missing.push('agrega equipo');if(!brandingPublished)missing.push('publica tu página');if(!dashState.dashboardTimezone)missing.push('configura la zona horaria');if($('health-note'))$('health-note').textContent=missing.length?`Siguiente recomendado: ${missing[0]}.`:'Todo lo esencial está configurado. Revisa reportes y reseñas para seguir creciendo.';""",
"dashboard-health-timezone-missing"
)

# 4) KPI usan exclusivamente la fecha operativa; sin timezone no presentan cifras confiables.
replace_once(
"js/admin-dashboard-pro.js",
"""function renderKPIs(){
  const today=dateKey();
  const next7=addDaysKey(7);
  const todayItems=dashState.appointments.filter(a=>a.appointment_date===today && a.status!=='cancelada');
  const upcoming=dashState.appointments.filter(a=>a.appointment_date>today && a.appointment_date<=next7 && activeStatus(a.status));
  const pending=dashState.appointments.filter(a=>a.status==='pendiente' && a.appointment_date>=today);
  const revenue=dashState.appointments
    .filter(a=>a.appointment_date.startsWith(monthKey()) && ['confirmada','completada'].includes(a.status))
    .reduce((s,a)=>s+appointmentPrice(a),0);

  $('kpi-today').textContent=todayItems.length;
  if($('kpi-upcoming'))$('kpi-upcoming').textContent=upcoming.length;
  $('kpi-pending').textContent=pending.length;
  $('kpi-revenue').textContent=money(revenue);
  $('kpi-today-sub').textContent=`${todayItems.filter(a=>a.status==='confirmada').length} confirmada${todayItems.filter(a=>a.status==='confirmada').length===1?'':'s'}`;

  const notify=pending.length;
  const badge=$('notification-count');
  badge.textContent=notify;
  badge.classList.toggle('hidden',!notify);
}""",
"""function renderKPIs(){
  const today=operationalDateContext();
  const badge=$('notification-count');

  if(!today){
    $('kpi-today').textContent='—';
    if($('kpi-upcoming')) $('kpi-upcoming').textContent='—';
    $('kpi-pending').textContent='—';
    $('kpi-revenue').textContent='—';
    $('kpi-today-sub').textContent='Configura la zona horaria para calcular las citas de hoy.';
    badge.textContent='';
    badge.classList.add('hidden');
    return;
  }

  const todayItems=dashState.appointments.filter(a=>a.appointment_date===today.today && a.status!=='cancelada');
  const upcoming=dashState.appointments.filter(a=>a.appointment_date>today.today && a.appointment_date<=today.next7 && activeStatus(a.status));
  const pending=dashState.appointments.filter(a=>a.status==='pendiente' && a.appointment_date>=today.today);
  const revenue=dashState.appointments
    .filter(a=>a.appointment_date.startsWith(today.month) && ['confirmada','completada'].includes(a.status))
    .reduce((s,a)=>s+appointmentPrice(a),0);

  $('kpi-today').textContent=todayItems.length;
  if($('kpi-upcoming')) $('kpi-upcoming').textContent=upcoming.length;
  $('kpi-pending').textContent=pending.length;
  $('kpi-revenue').textContent=money(revenue);
  const confirmed=todayItems.filter(a=>a.status==='confirmada').length;
  $('kpi-today-sub').textContent=`${confirmed} confirmada${confirmed===1?'':'s'}`;

  const notify=pending.length;
  badge.textContent=notify;
  badge.classList.toggle('hidden',!notify);
}""",
"dashboard-render-kpis"
)

# 5) Agenda de hoy y próximas citas usan la misma fecha; sin timezone muestran dependencia explícita.
replace_once(
"js/admin-dashboard-pro.js",
"""function renderToday(){
  const root=$('today-timeline');
  root.replaceChildren();
  const rows=dashState.appointments.filter(a=>a.appointment_date===dateKey() && a.status!=='cancelada');

  if(!rows.length){""",
"""function renderToday(){
  const root=$('today-timeline');
  root.replaceChildren();
  const today=operationalDateContext();

  if(!today){
    const e=document.createElement('div');
    e.className='empty-card';
    e.textContent='Configura la zona horaria para mostrar la agenda de hoy.';
    root.appendChild(e);
    return;
  }

  const rows=dashState.appointments.filter(a=>a.appointment_date===today.today && a.status!=='cancelada');

  if(!rows.length){""",
"dashboard-render-today"
)

replace_once(
"js/admin-dashboard-pro.js",
"""function renderUpcoming(){
  const root=$('upcoming-list');
  root.replaceChildren();
  const today=dateKey();
  const rows=dashState.appointments.filter(a=>a.appointment_date>today && activeStatus(a.status)).slice(0,5);

  if(!rows.length){""",
"""function renderUpcoming(){
  const root=$('upcoming-list');
  root.replaceChildren();
  const today=operationalDateContext();

  if(!today){
    const e=document.createElement('div');
    e.className='empty-card';
    e.textContent='Configura la zona horaria para calcular próximas citas.';
    root.appendChild(e);
    return;
  }

  const rows=dashState.appointments.filter(a=>a.appointment_date>today.today && activeStatus(a.status)).slice(0,5);

  if(!rows.length){""",
"dashboard-render-upcoming"
)

# 6) Semántica de Por confirmar.
replace_once(
"admin/index.html",
"""          <div class="kpi-icon"><i data-lucide="circle-check-big"></i></div>
          <div class="kpi-copy"><span>Por confirmar</span><strong id="kpi-pending">–</strong><small>Citas pendientes</small></div>""",
"""          <div class="kpi-icon"><i data-lucide="clock-3"></i></div>
          <div class="kpi-copy"><span>Por confirmar</span><strong id="kpi-pending">–</strong><small>Citas pendientes</small></div>""",
"dashboard-pending-icon"
)

# 7) V3: el origen real de Atrasadas. Sin timezone no usa fecha del dispositivo ni icono rojo.
replace_once(
"js/dashboard-v3.js",
"""  function pendingCount(){
    try{
      if(typeof dashState==='undefined') return 0;
      const today=(typeof businessNow==='function'&&businessNow()?.dateKey) || new Date().toISOString().slice(0,10);
      return (dashState.appointments||[]).filter(a=>a.status==='pendiente'&&a.appointment_date>=today).length;
    }catch(_){ return 0; }
  }

  function renderLateKpi(){""",
"""  function pendingCount(){
    try{
      if(typeof dashState==='undefined'||!dashState?.dashboardTimezone) return null;
      if(typeof businessNow!=='function') return null;
      const today=businessNow()?.dateKey;
      if(!today) return null;
      return (dashState.appointments||[]).filter(a=>a.status==='pendiente'&&a.appointment_date>=today).length;
    }catch(_){ return null; }
  }

  function setLateKpiVisualState(card,state){
    if(!card) return;
    card.classList.remove('v3-kpi-late-config','v3-kpi-late-danger','v3-kpi-late-clear');
    const className=state==='late'?'v3-kpi-late-danger':state==='clear'?'v3-kpi-late-clear':'v3-kpi-late-config';
    card.classList.add(className);

    const iconName=state==='late'?'triangle-alert':state==='clear'?'clock-3':'settings';
    const iconWrap=card.querySelector('.kpi-icon');
    if(iconWrap && iconWrap.dataset.semanticIcon!==iconName){
      iconWrap.dataset.semanticIcon=iconName;
      iconWrap.innerHTML=`<i data-lucide="${iconName}" aria-hidden="true"></i>`;
    }
  }

  function renderLateKpi(){""",
"dashboard-v3-pending-and-late-state"
)

replace_once(
"js/dashboard-v3.js",
"""  function renderLateKpi(){
    const value=$('kpi-late'),sub=$('kpi-late-sub'),link=$('kpi-late-link');
    if(!value) return;

    let hasTimezone=false;
    try{ hasTimezone=Boolean(typeof dashState!=='undefined'&&dashState.dashboardTimezone); }catch(_){}

    if(!hasTimezone){
      value.textContent='—';
      sub.textContent='Configura la zona horaria';
      if(link){link.textContent='Configurar zona horaria →';link.href='configuracion.html';}
      return;
    }

    const late=lateAppointments()||[];
    value.textContent=late.length;
    sub.textContent=late.length===1?'Cita fuera de horario':'Citas fuera de horario';
    if(link){link.innerHTML='Revisar agenda <i data-lucide="arrow-right"></i>';link.href='#agenda';}
  }""",
"""  function renderLateKpi(){
    const value=$('kpi-late'),sub=$('kpi-late-sub'),link=$('kpi-late-link');
    if(!value) return;
    const card=value.closest('.kpi-card');

    let hasTimezone=false;
    try{ hasTimezone=Boolean(typeof dashState!=='undefined'&&dashState.dashboardTimezone); }catch(_){}

    if(!hasTimezone){
      setLateKpiVisualState(card,'config');
      value.textContent='—';
      sub.textContent='Configura la zona horaria';
      if(link){link.textContent='Configurar zona horaria →';link.href='configuracion.html';}
      return;
    }

    const late=lateAppointments()||[];
    setLateKpiVisualState(card,late.length?'late':'clear');
    value.textContent=late.length;
    sub.textContent=late.length===0?'Sin citas atrasadas':late.length===1?'1 cita atrasada':`${late.length} citas atrasadas`;
    if(link){link.innerHTML='Revisar agenda <i data-lucide="arrow-right"></i>';link.href='#agenda';}
  }""",
"dashboard-v3-render-late-kpi"
)

# 8) CSS semántico: rojo solo para atraso real; config/clear neutros.
replace_once(
"css/citago-v3.css",
""".dashboard-v3 .v3-kpi-3 .kpi-icon{background:var(--v3-danger-soft)!important;color:var(--v3-danger)!important}""",
""".dashboard-v3 .v3-kpi-3 .kpi-icon{background:var(--v3-card-soft)!important;color:var(--v3-muted)!important}
.dashboard-v3 .v3-kpi-late.v3-kpi-late-config .kpi-icon{background:var(--v3-card-soft)!important;color:var(--v3-muted)!important}
.dashboard-v3 .v3-kpi-late.v3-kpi-late-clear .kpi-icon{background:var(--v3-info-soft)!important;color:var(--v3-info)!important}
.dashboard-v3 .v3-kpi-late.v3-kpi-late-danger .kpi-icon{background:var(--v3-danger-soft)!important;color:var(--v3-danger)!important}""",
"dashboard-v3-late-semantic-colors"
)

# Validate before writing.
required={
"js/admin-dashboard-pro.js":[
    "function operationalDateContext()",
    "const today=operationalDateContext();",
    "missing.push('configura la zona horaria')",
    "Configura la zona horaria para mostrar la agenda de hoy.",
],
"js/dashboard-v3.js":[
    "function setLateKpiVisualState(card,state)",
    "setLateKpiVisualState(card,'config')",
    "setLateKpiVisualState(card,late.length?'late':'clear')",
],
"admin/index.html":["data-lucide=\"clock-3\""],
"css/citago-v3.css":[".v3-kpi-late-danger .kpi-icon"],
}
for rel,tokens in required.items():
    for token in tokens:
        if token not in texts[rel]:
            raise RuntimeError(f"Validación previa falló: {rel} no contiene {token}")

stamp=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup=ROOT/f"_backup_DASHBOARD_FECHA_OPERATIVA_{stamp}"
for rel in targets:
    dst=backup/rel
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/rel,dst)

for rel in targets:
    (ROOT/rel).write_text(texts[rel],encoding="utf-8")

print("Dashboard fecha operativa aplicado correctamente.")
print("Archivos modificados:")
for rel in targets: print("-",rel)
print("Backup:",backup)
print("No se modificó Supabase, RLS, shell ni otras páginas.")
