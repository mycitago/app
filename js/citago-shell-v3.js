(function(global){
  const THEME_KEY='mycitago:tenant-theme';
  const SIDEBAR_KEY='mycitago:sidebar-collapsed';

  const NAV_GROUPS=[
    {label:'OPERACIÓN',items:['index.html','agenda.html','clientes.html']},
    {label:'MI NEGOCIO',items:['servicios.html','equipo.html','sucursales.html']},
    {label:'CRECIMIENTO',items:['resenas.html','mi-pagina.html','crecimiento.html']},
    {label:'ANÁLISIS',items:['contabilidad.html']},
    {label:'SISTEMA',items:['configuracion.html','ayuda.html']}
  ];

  const ICONS={
    'index.html':'house',
    'agenda.html':'calendar-days',
    'clientes.html':'users',
    'servicios.html':'scissors',
    'equipo.html':'user-round',
    'sucursales.html':'map-pin',
    'resenas.html':'star',
    'mi-pagina.html':'panel-top',
    'crecimiento.html':'trending-up',
    'contabilidad.html':'chart-no-axes-column',
    'configuracion.html':'settings',
    'ayuda.html':'circle-help'
  };

  function resolveTheme(pref){
    if(pref==='light'||pref==='dark') return pref;
    return global.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light';
  }

  function applyTheme(pref){
    const selected=['light','dark','system'].includes(pref)?pref:'system';
    const resolved=resolveTheme(selected);
    document.documentElement.dataset.ctTheme=resolved;
    document.documentElement.style.colorScheme=resolved;
    document.querySelectorAll('.ct-theme-option').forEach(btn=>{
      const active=btn.dataset.theme===selected;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function buildThemeSwitcher(){
    const menu=document.getElementById('ct-user-menu');
    if(!menu||menu.querySelector('.ct-theme-switcher')) return;
    const logout=document.getElementById('ct-logout');
    const wrap=document.createElement('div');
    wrap.className='ct-theme-switcher';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label','Apariencia');
    wrap.innerHTML=`
      <small>APARIENCIA</small>
      <div class="ct-theme-options">
        <button type="button" class="ct-theme-option" data-theme="light" aria-pressed="false"><i data-lucide="sun"></i><span>Claro</span></button>
        <button type="button" class="ct-theme-option" data-theme="dark" aria-pressed="false"><i data-lucide="moon"></i><span>Oscuro</span></button>
        <button type="button" class="ct-theme-option" data-theme="system" aria-pressed="false"><i data-lucide="monitor-cog"></i><span>Sistema</span></button>
      </div>`;
    if(logout) menu.insertBefore(wrap,logout);
    else menu.appendChild(wrap);

    wrap.querySelectorAll('.ct-theme-option').forEach(btn=>{
      btn.addEventListener('click',()=>{
        localStorage.setItem(THEME_KEY,btn.dataset.theme);
        applyTheme(btn.dataset.theme);
      });
    });
    applyTheme(localStorage.getItem(THEME_KEY)||'system');
  }

  function rebuildDesktopNav(){
    const nav=document.querySelector('.ct-sidebar .ct-nav');
    if(!nav||nav.dataset.v3Ready) return;

    const links=[...nav.querySelectorAll('a')];
    const byHref=new Map(links.map(a=>[a.getAttribute('href'),a]));
    const frag=document.createDocumentFragment();

    NAV_GROUPS.forEach(group=>{
      const existing=group.items.map(h=>byHref.get(h)).filter(Boolean);
      if(!existing.length) return;

      const title=document.createElement('span');
      title.className='ct-nav-group';
      title.textContent=group.label;
      frag.appendChild(title);

      existing.forEach(a=>{
        const href=a.getAttribute('href');
        const label=a.querySelector('span')?.textContent || a.textContent.trim();
        const isActive=a.classList.contains('active');
        a.replaceChildren();

        const icon=document.createElement('span');
        icon.className='ct-nav-icon';
        icon.setAttribute('aria-hidden','true');
        const i=document.createElement('i');
        i.setAttribute('data-lucide',ICONS[href]||'circle');
        icon.appendChild(i);

        const text=document.createElement('span');
        text.className='ct-nav-label';
        text.textContent=label;

        a.append(icon,text);
        a.title=label;
        if(isActive) a.setAttribute('aria-current','page');
        frag.appendChild(a);
      });
    });

    nav.replaceChildren(frag);
    nav.dataset.v3Ready='1';
  }

  function setupSidebarToggle(){
    const sidebar=document.querySelector('.ct-sidebar');
    const app=document.querySelector('.ct-app');
    const brand=document.querySelector('.ct-brand');
    if(!sidebar||!app||!brand) return;

    let btn=document.getElementById('ct-sidebar-toggle');
    if(!btn){
      btn=document.createElement('button');
      btn.id='ct-sidebar-toggle';
      btn.className='ct-sidebar-toggle';
      btn.type='button';
      btn.innerHTML='<i data-lucide="panel-left-close" aria-hidden="true"></i>';
      brand.appendChild(btn);
    }

    const apply=collapsed=>{
      app.classList.toggle('sidebar-collapsed',collapsed);
      btn.setAttribute('aria-expanded',collapsed?'false':'true');
      btn.setAttribute('aria-label',collapsed?'Expandir menú':'Contraer menú');
      btn.title=collapsed?'Expandir menú':'Contraer menú';
      const icon=btn.querySelector('i');
      icon?.setAttribute('data-lucide',collapsed?'panel-left-open':'panel-left-close');
      global.lucide?.createIcons();
    };

    apply(localStorage.getItem(SIDEBAR_KEY)==='1');
    btn.addEventListener('click',()=>{
      const collapsed=!app.classList.contains('sidebar-collapsed');
      localStorage.setItem(SIDEBAR_KEY,collapsed?'1':'0');
      apply(collapsed);
    });
  }

  function bindSystemTheme(){
    if(global.__ctThemeSystemBound) return;
    const media=global.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change',()=>{
      if((localStorage.getItem(THEME_KEY)||'system')==='system') applyTheme('system');
    });
    global.__ctThemeSystemBound=true;
  }

  function mount(){
    rebuildDesktopNav();
    setupSidebarToggle();
    buildThemeSwitcher();
    bindSystemTheme();
    applyTheme(localStorage.getItem(THEME_KEY)||'system');
    global.lucide?.createIcons();
  }

  global.CitagoShellV3={mount};
})(window);
