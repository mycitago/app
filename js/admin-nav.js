(function(global){
 const TENANT=[
  ['resumen','Resumen','index.html','⌂'],['clientes','Clientes','clientes.html','👥'],
  ['servicios','Servicios','servicios.html','✂'],['equipo','Equipo','equipo.html','♟'],
  ['contabilidad','Contabilidad','contabilidad.html','$'],['integraciones','Integraciones','integraciones.html','⛓'],
  ['planes','Planes','planes.html','◇'],['configuracion','Configuración','configuracion.html','⚙']
 ];
 const PLATFORM=[
  ['plataforma','Resumen plataforma','plataforma.html','⌂'],
  ['negocios','Negocios','plataforma.html#negocios','▦'],
  ['suscripciones','Suscripciones','plataforma.html#suscripciones','◇'],
  ['pagos','Pagos','plataforma.html#pagos','$'],
  ['incidencias','Incidencias','plataforma.html#incidencias','!'],
  ['panel-negocio','Panel de negocio','index.html','↗']
 ];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const file=()=>location.pathname.split('/').pop().toLowerCase();
 const platform=()=>file()==='plataforma.html';
 const active=()=>{
  const f=file(); const m={'':'resumen','index.html':'resumen','clientes.html':'clientes','servicios.html':'servicios','equipo.html':'equipo','contabilidad.html':'contabilidad','integraciones.html':'integraciones','planes.html':'planes','configuracion.html':'configuracion','plataforma.html':'plataforma'};
  if(platform() && location.hash) return location.hash.slice(1);
  return m[f]||'resumen'
 };
 function nav(items,a){return items.map(([id,label,href,icon])=>`<li><a class="${id===a?'active':''}" href="${href}"><span class="ct-nav-icon">${icon}</span><span>${label}</span></a></li>`).join('')}
 function findContent(){
  const sels=['main','.adm-main','.page-main','.content-wrap','.adm-content','.platform-main','#platform-content'];
  for(const s of sels){const n=[...document.querySelectorAll(s)].find(x=>!x.closest('#app-shell'));if(n)return n}
  // fallback: move all meaningful direct body children except scripts/style/shell
  const wrapper=document.createElement('main'); wrapper.className='page-content-host';
  const nodes=[...document.body.children].filter(n=>n.id!=='app-shell'&&!['SCRIPT','STYLE','LINK'].includes(n.tagName));
  if(nodes.length){nodes.forEach(n=>wrapper.appendChild(n));document.body.appendChild(wrapper);return wrapper}
  return null
 }
 function markPlatformSections(content){
  if(!content)return;
  const textMap=[['negocios','negocio'],['suscripciones','suscrip'],['pagos','pago'],['incidencias','inciden']];
  const headings=[...content.querySelectorAll('h1,h2,h3')];
  textMap.forEach(([id,key])=>{
   const h=headings.find(x=>x.textContent.toLowerCase().includes(key));
   if(h && !document.getElementById(id)){h.id=id;h.style.scrollMarginTop='88px'}
  })
 }
 function hideLegacy(){
  const selectors=[
    '.adm-sidebar','.legacy-sidebar','.adm-topbar','.adm-header','.admin-header','.site-header','.navbar','.top-nav',
    '.dash-mobile-top','.dash-sidebar','.dash-topbar','.dash-mobile-nav','.dash-app',
    '.creator-topbar','.creator-sidebar','.creator-mobile-nav','.creator-layout'
  ];
  document.querySelectorAll(selectors.join(',')).forEach(el=>{if(!el.closest('#app-shell'))el.classList.add('legacy-shell-hidden')});
  [...document.body.children].forEach(el=>{
   if(el.id==='app-shell'||['SCRIPT','STYLE','LINK'].includes(el.tagName))return;
   if((el.tagName==='HEADER'||el.tagName==='NAV'||el.tagName==='ASIDE')&&!el.closest('main'))el.classList.add('legacy-shell-hidden')
  })
 }
 function shell(){
  const host=document.getElementById('app-shell'); if(!host||host.dataset.ready)return;
  const isPlatform=platform(); const a=active(); const items=isPlatform?PLATFORM:TENANT;
  document.body.classList.add('ct-shell-ready'); if(isPlatform)document.body.classList.add('ct-platform');
  const content=findContent(); if(isPlatform)markPlatformSections(content);
  hideLegacy();
  const brand=isPlatform?'CITAGO Platform':'CITAGO';
  const sub=isPlatform?'Super Administrador':'Panel de control';
  host.innerHTML=`<aside class="ct-sidebar"><div class="ct-brand"><div class="ct-logo">C</div><div><div class="ct-brand-name" id="ct-business">${brand}</div><div class="ct-brand-sub">${sub}</div></div></div><ul class="ct-nav">${nav(items,a)}</ul><div class="ct-sidebar-footer"><strong>${isPlatform?'Control de plataforma':'Cuenta activa'}</strong><small>${isPlatform?'Negocios, planes, cobros y operación':'Gestión segura de tu negocio'}</small><a class="ct-btn ct-btn-secondary" href="${isPlatform?'index.html':'planes.html'}">${isPlatform?'Abrir panel negocio':'Ver plan'}</a></div></aside><div class="ct-main"><header class="ct-topbar"><div class="ct-search">${isPlatform?'⌕ Buscar negocios, pagos, incidencias…':'⌕ Buscar clientes, citas, servicios…'}</div><div class="ct-actions">${isPlatform?'':'<a class="ct-btn ct-btn-primary" href="index.html#nueva-cita">+ Nueva cita</a>'}<div class="ct-user"><div class="ct-avatar">SA</div><div class="ct-user-text"><div class="ct-user-name" id="ct-user">${isPlatform?'Super Admin':'Administrador'}</div><div class="ct-user-role">${isPlatform?'Plataforma CITAGO':'Negocio'}</div></div></div></div></header><main class="ct-content" id="app-content"></main></div><nav class="ct-mobile">${(isPlatform?PLATFORM.slice(0,5):TENANT.slice(0,5)).map(([id,label,href,icon])=>`<a class="${id===a?'active':''}" href="${href}"><b>${icon}</b><span>${label.split(' ')[0]}</span></a>`).join('')}</nav>`;
  const dst=document.getElementById('app-content'); if(content){content.classList.add('page-content-host');dst.appendChild(content)}
  host.dataset.ready='1'; hydrate(isPlatform)
 }
 async function hydrate(isPlatform){
  if(isPlatform)return;
  try{
   if(typeof requireAuth!=='function'||typeof getMyBusiness!=='function')return;
   const session=await requireAuth();if(!session)return;
   const biz=await getMyBusiness(session.user);if(biz?.name){const e=document.getElementById('ct-business');if(e)e.textContent=biz.name}
   const u=document.getElementById('ct-user');if(u)u.textContent=session.user?.user_metadata?.name||session.user?.email?.split('@')[0]||'Administrador'
  }catch(e){console.warn('[CITAGO shell]',e)}
 }
 global.AdminNav={render:shell};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',shell,{once:true});else shell()
})(window);
