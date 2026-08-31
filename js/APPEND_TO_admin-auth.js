/**
 * CITAGO Premium Shell
 * Añadir al FINAL de js/admin-auth.js para que lo carguen las páginas admin.
 * No reemplaza requireAuth/logout/getMyBusiness.
 */
(function(){
  if (window.__citagoPremiumShellLoaded) return;
  window.__citagoPremiumShellLoaded = true;

  const ICONS={
    inicio:'⌂', agenda:'▣', servicios:'◇', clientes:'♙', equipo:'♧',
    resenas:'★', reportes:'▤', finanzas:'$', configuracion:'⚙',
    integraciones:'⌁', bloqueos:'⊘', publica:'↗'
  };

  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const active = path.includes('servicios')?'servicios':
    path.includes('clientes')?'clientes':
    path.includes('equipo')?'equipo':
    path.includes('resenas')?'resenas':
    path.includes('contabilidad')?'finanzas':
    path.includes('configuracion')?'configuracion':
    path.includes('integraciones')?'integraciones':
    path.includes('index')?'inicio':'inicio';

  const item=(key,label,href)=>`<a href="${href}" class="${active===key?'active':''}">
    <span class="ct-nav-icon">${ICONS[key]||'•'}</span><span>${label}</span></a>`;

  function inject(){
    if(!document.body || document.querySelector('.ct-sidebar')) return;
    if(path==='login.html') return;

    document.body.classList.add('ct-premium-ready');

    const side=document.createElement('aside');
    side.className='ct-sidebar';
    side.innerHTML=`
      <div class="ct-brand"><span class="ct-brand-mark">C</span><span>CITAGO</span></div>
      <div class="ct-business">
        <div class="ct-business-avatar">✦</div>
        <div class="ct-business-copy">
          <div class="ct-business-name" id="ct-business-name">Mi negocio</div>
          <div class="ct-business-sub">Panel de administración</div>
        </div>
      </div>
      <nav class="ct-nav">
        ${item('inicio','Inicio','index.html')}
        ${item('agenda','Agenda','index.html#agenda')}
        ${item('servicios','Servicios','servicios.html')}
        ${item('clientes','Clientes','clientes.html')}
        ${item('equipo','Equipo','equipo.html')}
        ${item('resenas','Reseñas','resenas.html')}
        ${item('reportes','Reportes','index.html#reportes')}
        ${item('finanzas','Finanzas','contabilidad.html')}
        ${item('configuracion','Configuración','configuracion.html')}
        <div class="ct-nav-label">Más herramientas</div>
        ${item('integraciones','Integraciones','integraciones.html')}
        ${item('publica','Página pública','../index.html')}
      </nav>
      <div class="ct-sidebar-footer">CITAGO Premium · Gestión de reservas</div>`;
    document.body.prepend(side);

    const mobile=document.createElement('nav');
    mobile.className='ct-mobile-nav';
    mobile.innerHTML=`
      <a href="index.html" class="${active==='inicio'?'active':''}"><b>⌂</b><span>Inicio</span></a>
      <a href="index.html#agenda"><b>▣</b><span>Agenda</span></a>
      <a href="index.html#nueva-cita" class="ct-add" aria-label="Nueva cita">＋</a>
      <a href="clientes.html" class="${active==='clientes'?'active':''}"><b>♙</b><span>Clientes</span></a>
      <a href="configuracion.html"><b>•••</b><span>Más</span></a>`;
    document.body.appendChild(mobile);

    // Actualizar nombre si ya existe en UI.
    const source=document.querySelector('.adm-topbar-title,[data-business-name],#business-name');
    if(source && source.textContent.trim()){
      const target=document.getElementById('ct-business-name');
      if(target) target.textContent=source.textContent.trim();
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inject);
  else inject();
})();