/* MYCitaGo V2 — Fase 2 / Bloque 2: comportamiento de "Más" en móvil.
   Cargar DESPUÉS de citago-shell.js. No altera Supabase ni persistencia. */
(function(){
  function init(){
    const mobile=document.querySelector('.ct-mobile');
    if(!mobile || document.getElementById('ct-more-sheet')) return;
    const more=[...mobile.querySelectorAll('a')].find(a=>a.textContent.trim().includes('Más'));
    const newAppt=[...mobile.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#');
    if(newAppt){
      newAppt.setAttribute('role','button');
      newAppt.setAttribute('aria-label','Nueva cita');
      newAppt.addEventListener('click',e=>{
        e.preventDefault();
        document.querySelector('.ct-new-appointment-trigger')?.click();
      });
    }
    if(!more) return;
    more.href='#ct-more-sheet';
    more.setAttribute('role','button');
    more.setAttribute('aria-haspopup','dialog');
    more.setAttribute('aria-expanded','false');

    const items=[
      ['Servicios','servicios.html','✂'],['Equipo','equipo.html','♟'],
      ['Sucursales','sucursales.html','◇'],['Reseñas','resenas.html','★'],
      ['Crecimiento','crecimiento.html','↗'],['Mi página','mi-pagina.html','▤'],
      ['Reportes','contabilidad.html','▥'],['Pagos','pagos.html','$'],
      ['Configuración','configuracion.html','⚙'],['Ayuda','ayuda.html','?']
    ];
    const sheet=document.createElement('div');
    sheet.id='ct-more-sheet'; sheet.className='ct-more-sheet';
    sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=`<div class="ct-more-backdrop" data-ct-more-close></div>
      <section class="ct-more-panel" role="dialog" aria-modal="true" aria-label="Más opciones">
        <header class="ct-more-head"><strong>Más opciones</strong><button class="ct-more-close" type="button" aria-label="Cerrar" data-ct-more-close>×</button></header>
        <nav class="ct-more-grid">${items.map(([l,h,i])=>`<a href="${h}"><span>${i}</span><span>${l}</span></a>`).join('')}</nav>
      </section>`;
    document.body.appendChild(sheet);

    const close=()=>{
      sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true');
      document.body.classList.remove('ct-more-open'); more.setAttribute('aria-expanded','false');
    };
    const open=e=>{
      e.preventDefault(); sheet.classList.add('open'); sheet.setAttribute('aria-hidden','false');
      document.body.classList.add('ct-more-open'); more.setAttribute('aria-expanded','true');
      sheet.querySelector('.ct-more-close')?.focus();
    };
    more.addEventListener('click',open);
    sheet.querySelectorAll('[data-ct-more-close]').forEach(el=>el.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('open')){close();more.focus()}});
  }
  const boot=()=>{init(); if(!document.querySelector('.ct-mobile')) setTimeout(init,350)};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
  setTimeout(init,700);
})();
