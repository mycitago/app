/* CITAGO — navegación única del panel admin */
(function(global){
  const NAV_ITEMS=[
    {id:'resumen',label:'Resumen',href:'index.html',icon:'🏠'},
    {id:'citas',label:'Citas',href:'citas.html',icon:'📅'},
    {id:'calendario',label:'Calendario',href:'calendario.html',icon:'🗓️'},
    {id:'clientes',label:'Clientes',href:'clientes.html',icon:'👥'},
    {id:'servicios',label:'Servicios',href:'servicios.html',icon:'✂️'},
    {id:'promociones',label:'Promociones',href:'promociones.html',icon:'📣'},
    {id:'mi-pagina',label:'Mi página',href:'mi-pagina.html',icon:'🎨'},
    {id:'equipo',label:'Equipo',href:'equipo.html',icon:'🧑‍🤝‍🧑'},
    {id:'contabilidad',label:'Contabilidad',href:'contabilidad.html',icon:'💰'},
    {id:'reportes',label:'Reportes',href:'reportes.html',icon:'📈'},
    {id:'mensajes',label:'Mensajes',href:'mensajes.html',icon:'💬'},
    {id:'configuracion',label:'Configuración',href:'configuracion.html',icon:'⚙️'}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sidebar(active,o){
    const items=NAV_ITEMS.map(i=>`<li class="nav-item ${i.id===active?'active':''}"><a href="${i.href}"><span>${i.icon}</span><span>${i.label}</span></a></li>`).join('');
    return `<aside class="sidebar"><div class="sidebar-brand"><div class="logo-badge">${esc((o.businessInitial||o.businessName||'C').slice(0,1).toUpperCase())}</div><div><div class="brand-name" id="admin-nav-business">${esc(o.businessName||'CITAGO')}</div><div class="brand-sub">Panel de control</div></div></div><ul class="nav-list">${items}</ul><div class="sidebar-plan"><div class="plan-label">Plan actual</div><div class="plan-name" id="admin-nav-plan">${esc(o.planName||'')}</div><div class="plan-expiry" id="admin-nav-expiry">${esc(o.planExpiry||'')}</div><a class="btn btn-secondary btn-block btn-sm" href="planes.html">Ver mi plan</a></div></aside>`;
  }
  function topbar(o){
    const initials=(o.userName||'?').slice(0,2).toUpperCase();
    return `<header class="topbar"><div class="topbar-search">🔍 Buscar clientes, citas, servicios…</div><div class="topbar-actions"><a class="btn btn-primary btn-sm" href="index.html#nueva-cita">+ Nueva cita</a><div class="topbar-user"><div class="avatar">${esc(initials)}</div><div><div class="user-name" id="admin-nav-user">${esc(o.userName||'')}</div><div class="user-role" id="admin-nav-role">${esc(o.userRole||'')}</div></div></div></div></header>`;
  }
  function mobile(active){
    return `<nav class="mobile-nav" aria-label="Navegación móvil"><a href="index.html" class="${active==='resumen'?'active':''}"><b>🏠</b><span>Inicio</span></a><a href="citas.html" class="${active==='citas'?'active':''}"><b>📅</b><span>Citas</span></a><a href="index.html#nueva-cita" class="mobile-add" aria-label="Nueva cita">＋</a><a href="clientes.html" class="${active==='clientes'?'active':''}"><b>👥</b><span>Clientes</span></a><a href="configuracion.html" class="${active==='configuracion'?'active':''}"><b>•••</b><span>Más</span></a></nav>`;
  }
  function hideLegacy(){
    document.querySelectorAll('.adm-sidebar,.legacy-sidebar,body > aside:not(.sidebar),.adm-topbar,body > header:not(.topbar)').forEach(el=>el.classList.add('legacy-shell-hidden'));
  }
  function render(opts){
    opts=opts||{}; const shell=document.getElementById('app-shell'); if(!shell) throw new Error('Falta #app-shell');
    hideLegacy();
    let contentNode=null;
    const selector=opts.contentSelector||'main';
    const candidates=[...document.querySelectorAll(selector)].filter(el=>!el.closest('#app-shell'));
    if(candidates.length) contentNode=candidates[0];
    shell.innerHTML=`${sidebar(opts.activePage,opts)}<div class="app-main">${topbar(opts)}<main class="app-content" id="app-content"></main></div>${mobile(opts.activePage)}`;
    const host=document.getElementById('app-content');
    if(opts.contentHTML) host.innerHTML=opts.contentHTML;
    else if(contentNode){ contentNode.classList.add('page-content-host'); host.appendChild(contentNode); }
    hydrate(opts);
  }
  async function hydrate(opts){
    try{
      if(typeof requireAuth!=='function'||typeof getMyBusiness!=='function') return;
      const session=await requireAuth(); if(!session) return;
      const biz=await getMyBusiness(session.user);
      if(biz?.name){ const e=document.getElementById('admin-nav-business'); if(e)e.textContent=biz.name; }
      const u=document.getElementById('admin-nav-user'); if(u&&!u.textContent)u.textContent=session.user?.email?.split('@')[0]||'Usuario';
      if(typeof getMySubscription==='function'&&biz?.id){
        const sub=await getMySubscription(biz.id);
        const p=document.getElementById('admin-nav-plan'); if(p&&sub?.plan)p.textContent=sub.plan;
        const x=document.getElementById('admin-nav-expiry'); if(x&&sub?.current_period_end)x.textContent=`Vigente hasta ${new Date(sub.current_period_end+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}`;
      }
    }catch(err){ console.warn('[AdminNav] No se pudo hidratar contexto',err); }
  }
  global.AdminNav={render,hydrate,NAV_ITEMS};
})(window);
