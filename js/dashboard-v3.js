(function(global){
  const $=id=>document.getElementById(id);

  function ensureLateKpi(){
    const grid=document.querySelector('.dash-kpis');
    if(!grid||$('kpi-late')) return;

    const card=document.createElement('article');
    card.className='kpi-card v3-kpi-late';
    card.innerHTML=`
      <div class="kpi-icon"><i data-lucide="triangle-alert"></i></div>
      <div class="kpi-copy">
        <span>Atrasadas</span>
        <strong id="kpi-late">—</strong>
        <small id="kpi-late-sub">Calculando puntualidad…</small>
      </div>
      <a id="kpi-late-link" href="#agenda">Revisar agenda <i data-lucide="arrow-right"></i></a>`;
    grid.insertBefore(card,grid.children[2]||null);

    [...grid.children].forEach((c,i)=>{
      c.classList.remove('purple','green','orange');
      c.classList.add(`v3-kpi-${i+1}`);
    });
  }

  function ensureAttentionCard(){
    const right=document.querySelector('.dash-right-col');
    if(!right||$('v3-attention-card')) return;
    const card=document.createElement('article');
    card.className='dash-card v3-attention-card';
    card.id='v3-attention-card';
    card.innerHTML=`
      <div class="card-head">
        <div><h2>Requiere tu atención</h2><p>Solo mostramos acciones que necesitan seguimiento.</p></div>
        <span id="v3-attention-count" class="v3-attention-count hidden"></span>
      </div>
      <div id="v3-attention-list" class="v3-attention-list"></div>`;
    right.insertBefore(card,right.firstChild);
  }

  function simplifyHealth(){
    const health=document.getElementById('business-health');
    if(!health||health.dataset.v3Ready) return;
    health.dataset.v3Ready='1';
    health.classList.add('v3-health-card');
    const kicker=health.querySelector('.health-kicker');
    if(kicker) kicker.textContent='ESTADO DEL NEGOCIO';
  }

  function hideDuplicateActions(){
    document.querySelector('.quick-card')?.classList.add('v3-hidden');
    document.getElementById('hero-new-appointment')?.classList.add('v3-hidden');
  }

  function lateAppointments(){
    try{
      if(typeof dashState==='undefined'||!dashState?.dashboardTimezone) return null;
      if(typeof businessNow!=='function'||typeof punctualityFor!=='function') return [];
      const today=businessNow()?.dateKey;
      if(!today) return [];
      return (dashState.appointments||[]).filter(a=>{
        const status=String(a.status||'').toLowerCase();
        if(a.appointment_date!==today||['cancelada','cancelled','completada','completed','no_show','no_asistio'].includes(status)) return false;
        return punctualityFor(a)?.key==='late';
      });
    }catch(_){ return []; }
  }

  function pendingCount(){
    try{
      if(typeof dashState==='undefined') return 0;
      const today=(typeof businessNow==='function'&&businessNow()?.dateKey) || new Date().toISOString().slice(0,10);
      return (dashState.appointments||[]).filter(a=>a.status==='pendiente'&&a.appointment_date>=today).length;
    }catch(_){ return 0; }
  }

  function renderLateKpi(){
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
  }

  function attentionRow(icon,title,text,tone='neutral',href='#agenda'){
    const a=document.createElement('a');
    a.className=`v3-attention-item ${tone}`;
    a.href=href;
    a.innerHTML=`
      <span class="v3-attention-icon"><i data-lucide="${icon}" aria-hidden="true"></i></span>
      <span><strong></strong><small></small></span>
      <i class="v3-attention-arrow" data-lucide="chevron-right" aria-hidden="true"></i>`;
    a.querySelector('strong').textContent=title;
    a.querySelector('small').textContent=text;
    return a;
  }

  function renderAttention(){
    const root=$('v3-attention-list');
    if(!root) return;
    root.replaceChildren();

    const items=[];
    const late=lateAppointments();
    if(Array.isArray(late)&&late.length){
      items.push(attentionRow('triangle-alert',`${late.length} cita${late.length===1?'':'s'} atrasada${late.length===1?'':'s'}`,'Revisa la agenda y actualiza su estado.','danger','#agenda'));
    }

    const pending=pendingCount();
    if(pending){
      items.push(attentionRow('clock-3',`${pending} cita${pending===1?'':'s'} por confirmar`,'Confirma o actualiza estas reservas.','warning','#agenda'));
    }

    let hasTimezone=false;
    try{ hasTimezone=Boolean(typeof dashState!=='undefined'&&dashState.dashboardTimezone); }catch(_){}
    if(!hasTimezone){
      items.push(attentionRow('clock-alert','Zona horaria pendiente','Configúrala para calcular correctamente la puntualidad.','warning','configuracion.html'));
    }

    if(!items.length){
      const empty=document.createElement('div');
      empty.className='v3-attention-empty';
      empty.innerHTML='<i data-lucide="circle-check-big"></i><div><strong>Todo bajo control</strong><small>No hay acciones urgentes en este momento.</small></div>';
      root.appendChild(empty);
    }else{
      items.forEach(x=>root.appendChild(x));
    }

    const badge=$('v3-attention-count');
    if(badge){
      badge.textContent=items.length;
      badge.classList.toggle('hidden',!items.length);
    }
    global.lucide?.createIcons();
  }

  function polishWelcome(){
    const welcome=document.querySelector('.dash-welcome');
    if(!welcome) return;
    welcome.classList.add('v3-welcome');
  }

  function refresh(){
    ensureLateKpi();
    ensureAttentionCard();
    simplifyHealth();
    hideDuplicateActions();
    polishWelcome();
    renderLateKpi();
    renderAttention();
    global.lucide?.createIcons();
  }

  function mount(){
    document.body.classList.add('dashboard-v3');
    refresh();
    setTimeout(refresh,700);
    setTimeout(refresh,1800);
    setInterval(refresh,60000);
  }

  global.MyCitaGoDashboardV3={mount};
})(window);
