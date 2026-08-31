(function(global){
  const tenant=[
    ['inicio','Inicio','index.html','⌂'],['agenda','Agenda','agenda.html','▣'],
    ['servicios','Servicios','servicios.html','✂'],['clientes','Clientes','clientes.html','👥'],
    ['equipo','Equipo','equipo.html','♟'],['resenas','Reseñas','resenas.html','★'],
    ['reportes','Reportes','contabilidad.html','↗'],['finanzas','Finanzas','contabilidad.html#finanzas','$'],
    ['mi-pagina','Mi página','mi-pagina.html','◫'],['ayuda','Ayuda','ayuda.html','?'],
    ['configuracion','Configuración','configuracion.html','⚙']
  ];
  const platform=[
    ['resumen','Resumen','plataforma.html','⌂'],['negocios','Negocios','plataforma.html#negocios','▦'],
    ['suscripciones','Suscripciones','plataforma.html#suscripciones','◇'],['soporte','Soporte','plataforma.html#soporte','?'],
    ['plantillas','Plantillas','plataforma.html#plantillas','✦'],['pagos','Pagos','plataforma.html#pagos','$'],
    ['incidencias','Incidencias','plataforma.html#incidencias','!'],['integraciones','Integraciones','plataforma.html#integraciones','⛓'],
    ['auditoria','Auditoría','plataforma.html#auditoria','◎']
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function nav(items,active){return items.map(([id,label,href,icon])=>`<a class="${id===active?'active':''}" href="${href}"><i>${icon}</i><span>${label}</span></a>`).join('')}
  function findContent(){for(const sel of ['main','.adm-main','.svc-main','.dash-main','.creator-main','.page-main','.content-wrap']){const n=[...document.querySelectorAll(sel)].find(x=>!x.closest('#citago-shell'));if(n)return n}return null}
  function hideLegacy(){for(const sel of ['.adm-topbar','.adm-sidebar','.svc-mobile-topbar','.svc-sidebar','.svc-topbar','.dash-mobile-top','.dash-sidebar','.dash-topbar','.creator-topbar','.creator-sidebar','.creator-mobile-nav'])document.querySelectorAll(sel).forEach(n=>n.classList.add('legacy-shell-hidden'))}
  async function hydrate(){
    try{
      if(typeof requireAuth!=='function'||typeof getMyBusiness!=='function')return;
      const s=await requireAuth(); if(!s)return;
      const b=await getMyBusiness(s.user);
      if(b?.name){const e=document.getElementById('ct-business-name');if(e)e.textContent=b.name}
      const u=document.getElementById('ct-user-name');if(u)u.textContent=s.user?.user_metadata?.name||s.user?.email?.split('@')[0]||'Administrador';
    }catch(e){console.warn('[MyCitaGoShell]',e)}
  }
  function brandBlock(isPlatform){return `<div class="ct-brand-mark"><img src="../assets/brand/mycitago-icon.png" alt="MyCitaGo"></div><div class="ct-brand-copy"><strong>${isPlatform?'MyCitaGo Platform':'MyCitaGo'}</strong><small id="ct-business-name">${isPlatform?'Super Administrador':'Tu negocio, organizado'}</small></div>`}
  function mount({mode='tenant',activePage='inicio'}={}){
    const host=document.getElementById('citago-shell'); if(!host||host.dataset.mounted)return;
    const content=findContent(); hideLegacy(); document.body.classList.add('ct-shell-ready');
    const isPlatform=mode==='platform',items=isPlatform?platform:tenant;
    host.innerHTML=`<div class="ct-app"><aside class="ct-sidebar"><div class="ct-brand">${brandBlock(isPlatform)}</div><nav class="ct-nav">${nav(items,activePage)}</nav><div class="ct-side-foot"><strong>${isPlatform?'Centro de operaciones':'¿Necesitas ayuda?'}</strong><small>${isPlatform?'Negocios, soporte, cobros y crecimiento':'Habla con soporte MyCitaGo sin salir del panel'}</small><a class="ct-btn ct-btn-secondary" href="${isPlatform?'index.html':'ayuda.html'}">${isPlatform?'Abrir panel negocio':'Contactar soporte'}</a></div></aside><div class="ct-main"><header class="ct-topbar"><div class="ct-search">⌕ ${isPlatform?'Buscar negocios, tickets, pagos…':'Buscar clientes, citas, servicios…'}</div><div class="ct-top-actions">${isPlatform?'':'<a class="ct-btn ct-btn-primary" href="index.html#nueva-cita">+ Nueva cita</a>'}<button class="ct-theme-toggle" type="button" data-theme-toggle title="Cambiar tema" aria-label="Cambiar entre tema claro y oscuro"><span data-theme-icon>☾</span></button><div class="ct-user"><div class="ct-avatar">${isPlatform?'SA':'A'}</div><div><strong id="ct-user-name">${isPlatform?'Super Admin':'Administrador'}</strong><small>${isPlatform?'MyCitaGo Platform':'Administrador'}</small></div></div></div></header><main id="citago-content" class="ct-content"></main></div><nav class="ct-mobile">${nav(items.slice(0,5),activePage)}</nav></div>`;
    host.dataset.mounted='1';
    if(content){content.classList.add('ct-page-host');document.getElementById('citago-content').appendChild(content)}
    if(global.MyCitaGoTheme)global.MyCitaGoTheme.bind(host); if(!isPlatform)hydrate(); if(global.lucide?.createIcons)global.lucide.createIcons();
  }
  global.CitagoShell={mount};
})(window);
