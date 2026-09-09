function pad(n){ return String(n).padStart(2,'0'); }
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
}
function setDates(){
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
}
async function renderBusinessHealth(){
  const activeServices=dashState.services.filter(s=>s.active!==false).length;
  let brandingPublished=false,supportOpen=0,teamCount=0;
  const checks=[activeServices>0,brandingPublished,teamCount>0,Boolean(dashState.business?.opening_hours),Boolean(dashState.business?.whatsapp||dashState.business?.phone),Boolean(dashState.dashboardTimezone)];
  const score=Math.round(checks.filter(Boolean).length/checks.length*100);
  const missing=[];if(!activeServices)missing.push('agrega un servicio');if(!teamCount)missing.push('agrega equipo');if(!brandingPublished)missing.push('publica tu página');if(!dashState.dashboardTimezone)missing.push('configura la zona horaria');if($('health-note'))$('health-note').textContent=missing.length?`Siguiente recomendado: ${missing[0]}.`:'Todo lo esencial está configurado. Revisa reportes y reseñas para seguir creciendo.';
}
function renderKPIs(){
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
}
function renderToday(){
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

  if(!rows.length){
    const e=document.createElement('div');
    e.className='empty-card';
    e.textContent='No hay citas programadas para hoy.';
    root.appendChild(e);
    return;
  }
}
function renderUpcoming(){
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

  if(!rows.length){
    const e=document.createElement('div');
    e.className='empty-card';
    e.textContent='No hay próximas citas.';
    root.appendChild(e);return;
  }
}
