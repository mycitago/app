/* CITAGO — navegación única del panel admin */
(function(global){
  const NAV_ITEMS=[
    {id:'resumen',label:'Resumen',href:'index.html',icon:'⌂'},
    {id:'clientes',label:'Clientes',href:'clientes.html',icon:'👥'},
    {id:'servicios',label:'Servicios',href:'servicios.html',icon:'✂'},
    {id:'equipo',label:'Equipo',href:'equipo.html',icon:'♟'},
    {id:'contabilidad',label:'Contabilidad',href:'contabilidad.html',icon:'$'},
    {id:'integraciones',label:'Integraciones',href:'integraciones.html',icon:'⛓'},
    {id:'planes',label:'Planes',href:'planes.html',icon:'◇'},
    {id:'configuracion',label:'Configuración',href:'configuracion.html',icon:'⚙'}
  ];
  const PAGE_MAP={
    'index.html':'resumen','':'resumen','clientes.html':'clientes','servicios.html':'servicios',
    'equipo.html':'equipo','contabilidad.html':'contabilidad','integraciones.html':'integraciones',
    'planes.html':'planes','configuracion.html':'configuracion'
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentFile=()=>location.pathname.split('/').pop().toLowerCase();
  const inferActive=()=>PAGE_MAP[currentFile()]||'resumen';
  function sidebar(active,o){
    const items=NAV_ITEMS.map(i=>`<li class="nav-item ${i.id===active?'active':''}"><a href="${i.href}"><span class="nav-icon">${i.icon}</span><span>${i.label}</span></a></li>`).join('');
    return `<aside class="sidebar"><div class="sidebar-brand"><div class="logo-badge">${esc((o.businessInitial||o.businessName||'C').slice(0,1).toUpperCase())}</div><div><div class="brand-name" id="admin-nav-business">${esc(o.businessName||'CITAGO')}</div><div class="brand-sub">Panel de control</div></div></div><ul class="nav-list">${items}</ul><div class="sidebar-plan"><div class="plan-label">Plan actual</div><div class="plan-name" id="admin-nav-plan">${esc(o.planName||'')}</div><div class="plan-expiry" id="admin-nav-expiry">${esc(o.planExpiry||'')}</div><a class="btn btn-secondary btn-block btn-sm" href="planes.html">Ver mi plan</a></div></aside>`;
  }
  function topbar(o){
    const initials=(o.userName||'?').slice(0,2).toUpperCase();
    return `<header class="topbar"><div class="topbar-search">⌕ Buscar clientes, citas, servicios…</div><div class="topbar-actions"><a class="btn btn-primary btn-sm" href="index.html#nueva-cita">+ Nueva cita</a><div class="topbar-user"><div class="avatar">${esc(initials)}</div><div><div class="user-name" id="admin-nav-user">${esc(o.userName||'')}</div><div class="user-role" id="admin-nav-role">${esc(o.userRole||'Administrador')}</div></div></div></div></header>`;
  }
  function mobile(active){
    return `<nav class="mobile-nav" aria-label="Navegación móvil"><a href="index.html" class="${active==='resumen'?'active':''}"><b>⌂</b><span>Inicio</span></a><a href="servicios.html" class="${active==='servicios'?'active':''}"><b>✂</b><span>Servicios</span></a><a href="index.html#nueva-cita" class="mobile-add" aria-label="Nueva cita">＋</a><a href="clientes.html" class="${active==='clientes'?'active':''}"><b>👥</b><span>Clientes</span></a><a href="configuracion.html" class="${active==='configuracion'?'active':''}"><b>•••</b><span>Más</span></a></nav>`;
  }
  function hideLegacy(){
    document.querySelectorAll('.adm-sidebar,.legacy-sidebar,body > aside:not(.sidebar),.adm-topbar,body > header:not(.topbar)').forEach(el=>el.classList.add('legacy-shell-hidden'));
  }
  function findContent(){
    const selectors=['main','.adm-main','.page-main','.content-wrap','.adm-content'];
    for(const selector of selectors){
      const el=[...document.querySelectorAll(selector)].find(n=>!n.closest('#app-shell'));
      if(el) return el;
    }
    return null;
  }
  function render(opts){
    opts=opts||{};
    const shell=document.getElementById('app-shell');
    if(!shell) return;
    if(shell.dataset.rendered==='1') return;
    const active=opts.activePage||inferActive();
    hideLegacy();
    const contentNode=findContent();
    shell.innerHTML=`${sidebar(active,opts)}<div class="app-main">${topbar(opts)}<main class="app-content" id="app-content"></main></div>${mobile(active)}`;
    shell.dataset.rendered='1';
    const host=document.getElementById('app-content');
    if(opts.contentHTML) host.innerHTML=opts.contentHTML;
    else if(contentNode){contentNode.classList.add('page-content-host');host.appendChild(contentNode);}
    hydrate(opts);
  }
  async function hydrate(opts){
    try{
      if(typeof requireAuth!=='function'||typeof getMyBusiness!=='function') return;
      const session=await requireAuth(); if(!session) return;
      const biz=await getMyBusiness(session.user);
      if(biz?.name){const e=document.getElementById('admin-nav-business');if(e)e.textContent=biz.name;}
      const u=document.getElementById('admin-nav-user');
      if(u)u.textContent=session.user?.user_metadata?.name||session.user?.email?.split('@')[0]||'Usuario';
      if(typeof getMySubscription==='function'&&biz?.id){
        const sub=await getMySubscription(biz.id);
        const p=document.getElementById('admin-nav-plan');if(p&&sub?.plan)p.textContent=sub.plan;
        const x=document.getElementById('admin-nav-expiry');
        if(x&&sub?.current_period_end)x.textContent=`Vigente hasta ${new Date(sub.current_period_end+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}`;
      }
    }catch(err){console.warn('[AdminNav] Contexto no disponible',err);}
  }
  function autoRender(){
    if(document.getElementById('app-shell')) render({});
  }
  global.AdminNav={render,hydrate,NAV_ITEMS,inferActive};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',autoRender,{once:true});
  else autoRender();
})(window);
