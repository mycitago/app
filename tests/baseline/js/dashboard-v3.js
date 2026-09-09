(function(global){
  const $=id=>document.getElementById(id);

  function pendingCount(){
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

  function renderLateKpi(){
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
  }
})(window);
