
const dashState = {
  session:null,
  business:null,
  appointments:[],
  services:[],
  customers:[],
  selectedAppointment:null
};

const $ = id => document.getElementById(id);

function pad(n){ return String(n).padStart(2,'0'); }
function dateKey(d=new Date()){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthKey(){ return dateKey().slice(0,7); }
function monthStart(){ return `${monthKey()}-01`; }
function addDaysKey(days){
  const d=new Date();
  d.setDate(d.getDate()+days);
  return dateKey(d);
}
function money(n){ return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0); }
function hour(t){ return String(t||'').slice(0,5); }
function safeText(v){ return String(v ?? ''); }
function activeStatus(s){ return ['pendiente','confirmada'].includes(s); }

function toast(msg){
  const el=$('toast');
  if(!el) return;
  el.textContent=msg;
  el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),2500);
}

function setBusinessIdentity(){
  const b=dashState.business;
  const name=b?.name || 'CITAS';
  $('sidebar-biz').textContent=name;
  $('mobile-biz-name').textContent=name;

  const logos=[$('brand-logo'),$('mobile-logo')];
  logos.forEach(box=>{
    box.replaceChildren();
    if(b?.logo_url){
      const img=document.createElement('img');
      img.src=b.logo_url; img.alt='';
      box.appendChild(img);
    } else {
      box.textContent=name.slice(0,1).toUpperCase();
    }
  });
}

function setUserIdentity(){
  const user=dashState.session?.user;
  const rawName=user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrador';
  const display=rawName.split(/[._-]/).map(x=>x?x[0].toUpperCase()+x.slice(1):'').join(' ').trim();
  $('user-name').textContent=display || 'Administrador';
  $('user-avatar').textContent=(display || 'A').slice(0,2).toUpperCase();

  const first=(display || 'Administrador').split(' ')[0];
  $('welcome-title').textContent=`¡Hola, ${first}! 👋`;
}

function setDates(){
  const now=new Date();
  const long=now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('today-label').textContent=`Aquí tienes el resumen de tu negocio para ${long}.`;
  $('agenda-date').textContent=long.charAt(0).toUpperCase()+long.slice(1);
  $('month-label').textContent=now.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
}

async function fetchAppointments(){
  const baseFields='id,appointment_date,start_time,end_time,status,notes,created_at,service_id,customers(name,whatsapp),services(name,price,duration_minutes,image_url)';
  let res=await supabaseClient
    .from('appointments')
    .select(baseFields+',price_charged,duration_charged,staff_id')
    .eq('business_id',dashState.business.id)
    .gte('appointment_date',monthStart())
    .order('appointment_date',{ascending:true})
    .order('start_time',{ascending:true});

  if(res.error && String(res.error.message||'').includes('price_charged')){
    res=await supabaseClient
      .from('appointments')
      .select(baseFields)
      .eq('business_id',dashState.business.id)
      .gte('appointment_date',monthStart())
      .order('appointment_date',{ascending:true})
      .order('start_time',{ascending:true});
  }

  if(res.error) throw res.error;
  dashState.appointments=res.data || [];
}

async function fetchServices(){
  const {data,error}=await supabaseClient
    .from('services')
    .select('id,name,price,duration_minutes,image_url,active,created_at')
    .eq('business_id',dashState.business.id)
    .order('created_at',{ascending:false});
  if(error) throw error;
  dashState.services=data || [];
}

async function fetchCustomers(){
  const {data,error}=await supabaseClient
    .from('customers')
    .select('id,name,whatsapp,created_at')
    .eq('business_id',dashState.business.id)
    .order('created_at',{ascending:false})
    .limit(80);
  if(error) throw error;
  dashState.customers=data || [];
}

function appointmentPrice(a){
  return Number(a.price_charged ?? a.services?.price ?? 0);
}

function renderMiniChart(id,values,color){
  const root=$(id);
  if(!root) return;
  root.replaceChildren();
  const vals=values.length?values:[0,0,0,0,0,0,0];
  const max=Math.max(...vals,1);
  const points=vals.map((v,i)=>{
    const x=(i/(vals.length-1||1))*100;
    const y=30-(v/max)*22;
    return `${x},${y}`;
  }).join(' ');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 100 34');
  svg.setAttribute('preserveAspectRatio','none');
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  line.setAttribute('points',points);
  line.setAttribute('fill','none');
  line.setAttribute('stroke',color);
  line.setAttribute('stroke-width','1.6');
  line.setAttribute('vector-effect','non-scaling-stroke');
  svg.appendChild(line);
  root.appendChild(svg);
}

function statsByDay(filterFn,mapper=()=>1){
  const vals=[];
  for(let i=-6;i<=0;i++){
    const d=new Date();
    d.setDate(d.getDate()+i);
    const key=dateKey(d);
    vals.push(dashState.appointments.filter(a=>a.appointment_date===key && filterFn(a)).reduce((s,a)=>s+mapper(a),0));
  }
  return vals;
}

function renderKPIs(){
  const today=dateKey();
  const next7=addDaysKey(7);
  const todayItems=dashState.appointments.filter(a=>a.appointment_date===today && a.status!=='cancelada');
  const upcoming=dashState.appointments.filter(a=>a.appointment_date>today && a.appointment_date<=next7 && activeStatus(a.status));
  const pending=dashState.appointments.filter(a=>a.status==='pendiente' && a.appointment_date>=today);
  const revenue=dashState.appointments
    .filter(a=>a.appointment_date.startsWith(monthKey()) && ['confirmada','completada'].includes(a.status))
    .reduce((s,a)=>s+appointmentPrice(a),0);

  $('kpi-today').textContent=todayItems.length;
  $('kpi-upcoming').textContent=upcoming.length;
  $('kpi-pending').textContent=pending.length;
  $('kpi-revenue').textContent=money(revenue);
  $('kpi-today-sub').textContent=`${todayItems.filter(a=>a.status==='confirmada').length} confirmada${todayItems.filter(a=>a.status==='confirmada').length===1?'':'s'}`;

  const notify=pending.length;
  const badge=$('notification-count');
  badge.textContent=notify;
  badge.classList.toggle('hidden',!notify);

  renderMiniChart('chart-today',statsByDay(a=>a.status!=='cancelada'),'#6d35ef');
  renderMiniChart('chart-upcoming',statsByDay(a=>activeStatus(a.status)),'#2384f5');
  renderMiniChart('chart-pending',statsByDay(a=>a.status==='pendiente'),'#11a36b');
  renderMiniChart('chart-revenue',statsByDay(a=>['confirmada','completada'].includes(a.status),appointmentPrice),'#f47a21');
}

function statusPill(status){
  const span=document.createElement('span');
  span.className=`status-pill ${status}`;
  span.textContent=safeText(status).replace('_',' ');
  return span;
}

function appointmentCard(a){
  const card=document.createElement('article');
  card.className='appointment-card';
  card.addEventListener('click',()=>openAppointment(a));

  const left=document.createElement('div');
  const h=document.createElement('h3');
  h.textContent=a.customers?.name || 'Cliente';
  const p=document.createElement('p');
  p.textContent=a.services?.name || 'Servicio';
  const meta=document.createElement('div');
  meta.className='appointment-meta';

  const duration=Number(a.duration_charged ?? a.services?.duration_minutes ?? 0);
  const m1=document.createElement('span');
  m1.innerHTML='<i data-lucide="clock-3"></i>';
  m1.append(document.createTextNode(` ${duration} min`));
  const m2=document.createElement('span');
  m2.innerHTML='<i data-lucide="clock"></i>';
  m2.append(document.createTextNode(` ${hour(a.start_time)} – ${hour(a.end_time)}`));
  meta.append(m1,m2);
  left.append(h,p,meta);

  card.append(left,statusPill(a.status));
  return card;
}

function renderToday(){
  const root=$('today-timeline');
  root.replaceChildren();
  const rows=dashState.appointments.filter(a=>a.appointment_date===dateKey() && a.status!=='cancelada');

  if(!rows.length){
    const e=document.createElement('div');
    e.className='empty-card';
    e.textContent='No hay citas programadas para hoy.';
    root.appendChild(e);
    return;
  }

  rows.forEach((a,idx)=>{
    const row=document.createElement('div');
    row.className='timeline-row';
    const time=document.createElement('div');
    time.className='timeline-time';
    time.textContent=hour(a.start_time);
    const line=document.createElement('div');
    line.className='timeline-dot-col';
    const dot=document.createElement('i');dot.className='timeline-dot';
    line.appendChild(dot);
    if(idx<rows.length-1){const l=document.createElement('i');l.className='timeline-line';line.appendChild(l)}
    row.append(time,line,appointmentCard(a));
    root.appendChild(row);
  });
}

function renderUpcoming(){
  const root=$('upcoming-list');
  root.replaceChildren();
  const today=dateKey();
  const rows=dashState.appointments.filter(a=>a.appointment_date>today && activeStatus(a.status)).slice(0,5);

  if(!rows.length){
    const e=document.createElement('div');
    e.className='empty-card';
    e.textContent='No hay próximas citas.';
    root.appendChild(e);return;
  }

  rows.forEach(a=>{
    const row=document.createElement('div');
    row.className='upcoming-row';
    row.addEventListener('click',()=>openAppointment(a));

    const date=new Date(`${a.appointment_date}T12:00:00`);
    const tile=document.createElement('div');tile.className='date-tile';
    const sm=document.createElement('small');sm.textContent=date.toLocaleDateString('es-MX',{weekday:'short'}).replace('.','');
    const b=document.createElement('b');b.textContent=String(date.getDate()).padStart(2,'0');
    tile.append(sm,b);

    const info=document.createElement('div');
    const h=document.createElement('h3');h.textContent=a.customers?.name || 'Cliente';
    const p=document.createElement('p');p.textContent=a.services?.name || 'Servicio';
    const meta=document.createElement('div');meta.className='upcoming-meta';
    const dur=Number(a.duration_charged ?? a.services?.duration_minutes ?? 0);
    meta.textContent=`${dur} min  ·  ${hour(a.start_time)}`;
    info.append(h,p,meta);

    row.append(tile,info,statusPill(a.status));
    root.appendChild(row);
  });
}

function relativeTime(dateStr){
  if(!dateStr) return '';
  const d=new Date(dateStr);
  const diff=Date.now()-d.getTime();
  const min=Math.max(1,Math.round(diff/60000));
  if(min<60) return `Hace ${min} min`;
  const h=Math.round(min/60);if(h<24) return `Hace ${h} h`;
  const days=Math.round(h/24);return `Hace ${days} d`;
}

function renderActivity(){
  const root=$('recent-activity');
  root.replaceChildren();
  const rows=[...dashState.appointments]
    .sort((a,b)=>new Date(b.created_at||b.appointment_date)-new Date(a.created_at||a.appointment_date))
    .slice(0,6);

  if(!rows.length){root.innerHTML='<div class="empty-card">Todavía no hay actividad reciente.</div>';return}

  rows.forEach((a,i)=>{
    const item=document.createElement('div');item.className='activity-row';
    const icon=document.createElement('div');
    icon.className=`activity-icon ${a.status==='confirmada'?'green':a.status==='pendiente'?'purple':'orange'}`;
    icon.innerHTML=`<i data-lucide="${a.status==='confirmada'?'circle-check-big':a.status==='pendiente'?'calendar-plus':'calendar-clock'}"></i>`;
    const body=document.createElement('div');
    const b=document.createElement('b');
    b.textContent=a.status==='confirmada'?'Cita confirmada':a.status==='pendiente'?'Nueva cita creada':`Cita ${a.status}`;
    const p=document.createElement('p');p.textContent=`${a.customers?.name||'Cliente'} · ${a.services?.name||'Servicio'}`;
    body.append(b,p);
    const time=document.createElement('time');time.textContent=relativeTime(a.created_at);
    item.append(icon,body,time);
    root.appendChild(item);
  });
}

function renderTopServices(){
  const root=$('top-services');root.replaceChildren();
  const counts=new Map();
  dashState.appointments.forEach(a=>{
    if(a.status==='cancelada') return;
    const id=a.service_id || a.services?.name;
    if(!id) return;
    const cur=counts.get(id)||{count:0,name:a.services?.name||'Servicio',image:a.services?.image_url||null};
    cur.count++;counts.set(id,cur);
  });
  const rows=[...counts.values()].sort((a,b)=>b.count-a.count).slice(0,4);
  const max=Math.max(...rows.map(x=>x.count),1);

  if(!rows.length){root.innerHTML='<div class="empty-card">Tus servicios más reservados aparecerán aquí.</div>';return}

  rows.forEach(s=>{
    const card=document.createElement('article');card.className='top-service';
    const thumb=document.createElement('div');thumb.className='service-thumb';
    if(s.image){const img=document.createElement('img');img.src=s.image;img.alt='';thumb.appendChild(img)}
    else thumb.innerHTML='<i data-lucide="scissors"></i>';
    const info=document.createElement('div');
    const b=document.createElement('b');b.textContent=s.name;
    const span=document.createElement('span');span.textContent=`${s.count} reserva${s.count===1?'':'s'}`;
    const bar=document.createElement('div');bar.className='service-bar';
    const fill=document.createElement('i');fill.style.width=`${Math.max(10,(s.count/max)*100)}%`;bar.appendChild(fill);
    info.append(b,span,bar);
    card.append(thumb,info);
    root.appendChild(card);
  });
}

function openAppointment(a){
  dashState.selectedAppointment=a;
  $('drawer-client').textContent=a.customers?.name || 'Cliente';
  const root=$('drawer-content');root.replaceChildren();

  const grid=document.createElement('div');grid.className='drawer-info-grid';
  const values=[
    ['Servicio',a.services?.name||'Servicio'],
    ['Fecha',new Date(`${a.appointment_date}T12:00:00`).toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})],
    ['Horario',`${hour(a.start_time)} – ${hour(a.end_time)}`],
    ['Importe',money(appointmentPrice(a))]
  ];
  values.forEach(([label,value])=>{
    const box=document.createElement('div');box.className='drawer-info';
    const s=document.createElement('span');s.textContent=label;
    const b=document.createElement('b');b.textContent=value;
    box.append(s,b);grid.appendChild(box);
  });

  const status=document.createElement('div');status.style.marginTop='14px';
  status.appendChild(statusPill(a.status));

  const actions=document.createElement('div');actions.className='drawer-actions';
  if(a.customers?.whatsapp){
    const wa=document.createElement('a');wa.href=`https://wa.me/${String(a.customers.whatsapp).replace(/\D/g,'')}`;wa.target='_blank';wa.rel='noopener';wa.textContent='Abrir WhatsApp';actions.appendChild(wa);
  }
  if(a.status==='pendiente') actions.appendChild(actionButton('Confirmar cita','confirmada','primary'));
  if(a.status==='confirmada') actions.appendChild(actionButton('Marcar como completada','completada','primary'));
  if(activeStatus(a.status)) actions.appendChild(actionButton('Cancelar cita','cancelada','danger'));

  root.append(grid,status,actions);
  $('appointment-drawer').classList.remove('hidden');
  window.lucide?.createIcons();
}

function actionButton(label,status,cls){
  const btn=document.createElement('button');btn.type='button';btn.textContent=label;if(cls)btn.className=cls;
  btn.addEventListener('click',async()=>{
    btn.disabled=true;
    const {error}=await supabaseClient.from('appointments').update({status}).eq('id',dashState.selectedAppointment.id);
    if(error){toast(error.message);btn.disabled=false;return}
    $('appointment-drawer').classList.add('hidden');
    toast('Cita actualizada');
    await refreshData();
  });
  return btn;
}

function closeDrawer(){ $('appointment-drawer').classList.add('hidden'); }

function publicBooking(){
  const url=buildPublicBookingUrl(dashState.business);
  if(!url) return toast('Configura primero el enlace público de tu negocio.');
  window.open(url,'_blank','noopener,noreferrer');
}

function renderPlan(){
  const sub=dashState.business?.subscription;
  $('plan-loading')?.remove();
  $('plan-name').classList.remove('hidden');$('plan-date').classList.remove('hidden');
  $('plan-name').textContent=sub?.plan_id || sub?.plan || 'Plan activo';
  $('plan-date').textContent=sub?.current_period_end
    ? `Activo hasta ${new Date(sub.current_period_end+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}`
    : 'Suscripción activa';
}

function normalizeSearch(v){ return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

function performSearch(){
  const q=normalizeSearch($('global-search').value.trim());
  const root=$('search-results');root.replaceChildren();
  if(q.length<2){root.classList.add('hidden');return}

  const results=[];
  dashState.customers.filter(c=>normalizeSearch(c.name).includes(q)||normalizeSearch(c.whatsapp).includes(q)).slice(0,4).forEach(c=>results.push({type:'Cliente',name:c.name,sub:c.whatsapp,icon:'user',href:'clientes.html'}));
  dashState.services.filter(s=>normalizeSearch(s.name).includes(q)).slice(0,4).forEach(s=>results.push({type:'Servicio',name:s.name,sub:money(s.price),icon:'scissors',href:'servicios.html'}));
  dashState.appointments.filter(a=>normalizeSearch(a.customers?.name).includes(q)||normalizeSearch(a.services?.name).includes(q)).slice(0,4).forEach(a=>results.push({type:'Cita',name:a.customers?.name||'Cliente',sub:`${a.services?.name||'Servicio'} · ${a.appointment_date}`,icon:'calendar',appointment:a}));

  if(!results.length){root.innerHTML='<div class="empty-card">Sin resultados.</div>';root.classList.remove('hidden');return}
  results.slice(0,8).forEach(r=>{
    const btn=document.createElement('button');btn.type='button';btn.className='search-item';
    const ico=document.createElement('span');ico.innerHTML=`<i data-lucide="${r.icon}"></i>`;
    const info=document.createElement('div');const b=document.createElement('b');b.textContent=r.name;const sm=document.createElement('small');sm.textContent=`${r.type} · ${r.sub||''}`;info.append(b,sm);btn.append(ico,info);
    btn.addEventListener('click',()=>{root.classList.add('hidden');if(r.appointment)openAppointment(r.appointment);else location.href=r.href});
    root.appendChild(btn);
  });
  root.classList.remove('hidden');window.lucide?.createIcons();
}

async function refreshData(){
  try{
    await Promise.all([fetchAppointments(),fetchServices(),fetchCustomers()]);
    renderKPIs();renderToday();renderUpcoming();renderActivity();renderTopServices();
    window.lucide?.createIcons();
  }catch(e){
    console.error(e);
    toast('No pudimos actualizar el panel.');
  }
}

function bind(){
  $('btn-logout').addEventListener('click',logout);
  ['new-appointment','hero-new-appointment','quick-new','mobile-new','mobile-bottom-new']
    .forEach(id=>$(id)?.addEventListener('click',publicBooking));
  $('drawer-close').addEventListener('click',closeDrawer);$('drawer-backdrop').addEventListener('click',closeDrawer);
  $('global-search').addEventListener('input',performSearch);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('global-search').focus()}if(e.key==='Escape'){closeDrawer();$('search-results').classList.add('hidden')}});
  $('mobile-menu')?.addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('.dash-nav a').forEach(a=>{
    a.addEventListener('click',()=>{
      if(window.innerWidth<=820) $('sidebar')?.classList.remove('open');
    });
  });
}

async function init(){
  const session=await requireAuth();
  if(!session) return;
  dashState.session=session;

  const business=await getMyBusiness(session.user);
  if(!business) return;
  dashState.business=business;

  setBusinessIdentity();setUserIdentity();setDates();renderPlan();bind();
  await refreshData();
}

document.addEventListener('DOMContentLoaded',init);
