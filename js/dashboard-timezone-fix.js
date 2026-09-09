/* MyCitaGo · Dashboard timezone fix
   Cargar DESPUÉS de admin-dashboard-pro.js.
   No modifica Supabase ni el shell.
*/
(function(){
  'use strict';

  function operationalNow(){
    if(!dashState.dashboardTimezone)return null;
    return DashboardPunctuality.businessNowParts(new Date(),dashState.dashboardTimezone);
  }

  function addDaysToKey(key,days){
    const [y,m,d]=String(key).split('-').map(Number);
    const dt=new Date(Date.UTC(y,m-1,d));
    dt.setUTCDate(dt.getUTCDate()+days);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  }

  function operationalMonth(){
    return operationalNow()?.dateKey?.slice(0,7)||null;
  }

  const originalBusinessHealth=window.renderBusinessHealth;

  window.renderBusinessHealth=async function(){
    const activeServices=dashState.services.filter(s=>s.active!==false).length;
    let brandingPublished=false,teamCount=0;

    const [branding,team]=await Promise.allSettled([
      supabaseClient.from('business_branding').select('published_at').eq('business_id',dashState.business.id).maybeSingle(),
      supabaseClient.from('staff').select('id',{count:'exact',head:true}).eq('business_id',dashState.business.id).eq('active',true)
    ]);

    if(branding.status==='fulfilled'&&!branding.value.error){
      brandingPublished=Boolean(branding.value.data?.published_at);
    }
    if(team.status==='fulfilled'&&!team.value.error){
      teamCount=team.value.count||0;
    }

    const checks=[
      activeServices>0,
      brandingPublished,
      teamCount>0,
      Boolean(dashState.business?.opening_hours),
      Boolean(dashState.business?.whatsapp||dashState.business?.phone),
      Boolean(dashState.dashboardTimezone)
    ];

    const score=Math.round(checks.filter(Boolean).length/checks.length*100);
    const scoreEl=$('health-score'),progress=$('health-progress');

    if(scoreEl)scoreEl.textContent=`${score}% listo`;
    if(progress)progress.style.width=`${score}%`;

    if($('health-title')){
      $('health-title').textContent=score===100
        ?'Tu negocio está listo para crecer'
        :score>=60
          ?'Completa los últimos pasos de tu negocio'
          :'Termina la configuración esencial';
    }

    const missing=[];
    if(!dashState.dashboardTimezone)missing.push('configura la zona horaria');
    if(!activeServices)missing.push('agrega un servicio');
    if(!teamCount)missing.push('agrega equipo');
    if(!brandingPublished)missing.push('publica tu página');

    if($('health-note')){
      $('health-note').textContent=missing.length
        ?`Siguiente recomendado: ${missing[0]}.`
        :'Todo lo esencial está configurado. Revisa reportes y reseñas para seguir creciendo.';
    }
  };

  window.renderKPIs=function(){
    const op=operationalNow();

    if(!op){
      $('kpi-today').textContent='—';
      $('kpi-pending').textContent='—';
      $('kpi-revenue').textContent='—';
      $('kpi-today-sub').textContent='Configura la zona horaria';
      const badge=$('notification-count');
      if(badge){badge.textContent='';badge.classList.add('hidden');}
      return;
    }

    const today=op.dateKey;
    const next7=addDaysToKey(today,7);
    const month=today.slice(0,7);

    const todayItems=dashState.appointments.filter(a=>
      a.appointment_date===today &&
      !['cancelada','cancelled'].includes(String(a.status||'').toLowerCase())
    );

    const pending=dashState.appointments.filter(a=>
      a.status==='pendiente' &&
      a.appointment_date>=today
    );

    const upcoming=dashState.appointments.filter(a=>
      a.appointment_date>today &&
      a.appointment_date<=next7 &&
      activeStatus(a.status)
    );

    const revenue=dashState.appointments
      .filter(a=>a.appointment_date.startsWith(month) && ['confirmada','completada'].includes(a.status))
      .reduce((s,a)=>s+appointmentPrice(a),0);

    $('kpi-today').textContent=todayItems.length;
    if($('kpi-upcoming'))$('kpi-upcoming').textContent=upcoming.length;
    $('kpi-pending').textContent=pending.length;
    $('kpi-revenue').textContent=money(revenue);

    const confirmed=todayItems.filter(a=>a.status==='confirmada').length;
    $('kpi-today-sub').textContent=`${confirmed} confirmada${confirmed===1?'':'s'}`;

    const badge=$('notification-count');
    if(badge){
      badge.textContent=pending.length;
      badge.classList.toggle('hidden',!pending.length);
    }
  };

  window.renderToday=function(){
    const root=$('today-timeline');
    root.replaceChildren();

    const today=operationalNow()?.dateKey;
    if(!today){
      const e=document.createElement('div');
      e.className='empty-card';
      e.textContent='Configura la zona horaria para calcular la agenda de hoy.';
      root.appendChild(e);
      return;
    }

    const rows=dashState.appointments.filter(a=>
      a.appointment_date===today &&
      !['cancelada','cancelled'].includes(String(a.status||'').toLowerCase())
    );

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
      const dot=document.createElement('i');
      dot.className='timeline-dot';
      line.appendChild(dot);

      if(idx<rows.length-1){
        const l=document.createElement('i');
        l.className='timeline-line';
        line.appendChild(l);
      }

      row.append(time,line,appointmentCard(a));
      root.appendChild(row);
    });
  };

  window.renderUpcoming=function(){
    const root=$('upcoming-list');
    root.replaceChildren();

    const today=operationalNow()?.dateKey;
    if(!today){
      const e=document.createElement('div');
      e.className='empty-card';
      e.textContent='Configura la zona horaria para calcular las próximas citas.';
      root.appendChild(e);
      return;
    }

    const rows=dashState.appointments
      .filter(a=>a.appointment_date>today && activeStatus(a.status))
      .slice(0,5);

    if(!rows.length){
      const e=document.createElement('div');
      e.className='empty-card';
      e.textContent='No hay próximas citas.';
      root.appendChild(e);
      return;
    }

    rows.forEach(a=>{
      const row=document.createElement('div');
      row.className='upcoming-row';
      row.addEventListener('click',()=>openAppointment(a));

      const date=new Date(`${a.appointment_date}T12:00:00`);
      const tile=document.createElement('div');
      tile.className='date-tile';

      const sm=document.createElement('small');
      sm.textContent=date.toLocaleDateString('es-MX',{weekday:'short'}).replace('.','');
      const b=document.createElement('b');
      b.textContent=String(date.getDate()).padStart(2,'0');
      tile.append(sm,b);

      const info=document.createElement('div');
      const h=document.createElement('h3');
      h.textContent=a.customers?.name||'Cliente';
      const p=document.createElement('p');
      p.textContent=a.services?.name||'Servicio';
      const meta=document.createElement('div');
      meta.className='upcoming-meta';
      const dur=Number(a.duration_charged??a.services?.duration_minutes??0);
      meta.textContent=`${dur} min  ·  ${hour(a.start_time)}`;
      info.append(h,p,meta);

      const statusWrap=document.createElement('div');
      statusWrap.className='appointment-status-stack';
      const punctuality=buildPunctualityBadge(a);
      if(punctuality)statusWrap.appendChild(punctuality);
      statusWrap.appendChild(statusPill(a.status));

      row.append(tile,info,statusWrap);
      root.appendChild(row);
    });
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const link=document.querySelector('#business-timezone-warning a');
    if(link){
      link.href='sucursales.html?focus=timezone&return=index.html';
      link.textContent='Configurar zona horaria';
    }
  });
})();
