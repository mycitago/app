from pathlib import Path

JS=Path("js/citago-shell.js")
CSS=Path("css/citago-admin.css")
if not JS.exists() or not CSS.exists():
    raise SystemExit("Ejecuta este script desde la raíz del repo mycitago/app.")

js=JS.read_text(encoding="utf-8")
css=CSS.read_text(encoding="utf-8")

anchor="  const ROLE_LABELS={OWNER:'Dueño',MANAGER:'Gerente',RECEPTIONIST:'Recepción',PROFESSIONAL:'Profesional'};"
block=r'''
  const CT_THEME_KEY='mycitago:tenant-theme';
  const CT_SIDEBAR_KEY='mycitago:sidebar-collapsed';
  const NAV_ICON_MAP={
    inicio:'house',agenda:'calendar-days',clientes:'users',
    servicios:'scissors',equipo:'user-round',sucursales:'map-pin',
    resenas:'star',crecimiento:'trending-up','mi-pagina':'panel-top',
    reportes:'chart-no-axes-column',configuracion:'settings',ayuda:'circle-help',
    resumen:'layout-dashboard',negocios:'building-2',suscripciones:'badge-dollar-sign',
    soporte:'life-buoy',plantillas:'wand-sparkles',pagos:'credit-card',
    incidencias:'triangle-alert',integraciones:'link-2',auditoria:'shield-check',
    nueva:'plus',mas:'ellipsis'
  };
  function ctResolvedTheme(pref){
    if(pref==='dark'||pref==='light')return pref;
    return global.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light';
  }
  function applyTenantTheme(pref){
    const value=['light','dark','system'].includes(pref)?pref:'system';
    const resolved=ctResolvedTheme(value);
    document.documentElement.setAttribute('data-ct-theme',resolved);
    document.documentElement.setAttribute('data-theme',resolved);
    document.documentElement.style.colorScheme=resolved;
    document.querySelectorAll('.ct-theme-option').forEach(btn=>{
      const selected=btn.dataset.theme===value;
      btn.classList.toggle('active',selected);
      btn.setAttribute('aria-pressed',selected?'true':'false');
    });
    return value;
  }
  function setupTenantTheme(){
    let pref=localStorage.getItem(CT_THEME_KEY)||'system';
    applyTenantTheme(pref);
    document.querySelectorAll('.ct-theme-option').forEach(btn=>{
      btn.addEventListener('click',()=>{
        pref=btn.dataset.theme||'system';
        localStorage.setItem(CT_THEME_KEY,pref);
        applyTenantTheme(pref);
      });
    });
    if(!global.__citagoThemeListenerBound){
      const media=global.matchMedia?.('(prefers-color-scheme: dark)');
      media?.addEventListener?.('change',()=>{
        if((localStorage.getItem(CT_THEME_KEY)||'system')==='system')applyTenantTheme('system');
      });
      global.__citagoThemeListenerBound=true;
    }
  }
  function setupTenantSidebar(){
    const app=document.querySelector('.ct-app');
    const btn=document.getElementById('ct-sidebar-toggle');
    if(!app||!btn)return;
    const saved=localStorage.getItem(CT_SIDEBAR_KEY)==='1';
    const apply=(collapsed)=>{
      app.classList.toggle('sidebar-collapsed',collapsed);
      btn.setAttribute('aria-expanded',collapsed?'false':'true');
      btn.setAttribute('aria-label',collapsed?'Expandir menú':'Contraer menú');
      btn.title=collapsed?'Expandir menú':'Contraer menú';
      const icon=btn.querySelector('i');
      if(icon)icon.setAttribute('data-lucide',collapsed?'panel-left-open':'panel-left-close');
      global.lucide?.createIcons();
    };
    apply(saved);
    btn.addEventListener('click',()=>{
      const collapsed=!app.classList.contains('sidebar-collapsed');
      localStorage.setItem(CT_SIDEBAR_KEY,collapsed?'1':'0');
      apply(collapsed);
    });
  }
'''
if "const CT_THEME_KEY=" not in js:
    if anchor not in js:
        raise SystemExit("No encontré ROLE_LABELS.")
    js=js.replace(anchor,anchor+block,1)

old_nav='''  function nav(items,active){let last='';return items.map(([id,label,href,icon,group])=>{const head=group&&group!==last?`<span class="ct-nav-group">${group}</span>`:'';last=group||last;return `${head}<a class="${id===active?'active':''}" href="${href}"><i>${icon}</i><span>${label}</span></a>`}).join('')}'''
new_nav='''  function nav(items,active,mobile=false){let last='';return items.map(([id,label,href,icon,group])=>{const head=group&&group!==last?`<span class="ct-nav-group">${group}</span>`:'';last=group||last;const activeAttrs=id===active?' class="active" aria-current="page"':'';const iconMarkup=mobile?`<i>${icon}</i>`:`<span class="ct-nav-icon" aria-hidden="true"><i data-lucide="${NAV_ICON_MAP[id]||'circle'}"></i></span>`;const title=mobile?'':` title="${label}"`;return `${head}<a${activeAttrs} href="${href}"${title}>${iconMarkup}<span>${label}</span></a>`}).join('')}'''
if old_nav in js:
    js=js.replace(old_nav,new_nav,1)
elif "function nav(items,active,mobile=false)" not in js:
    raise SystemExit("nav() no coincide.")

old_force="    document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';"
if old_force in js:
    js=js.replace(old_force,"    if(mode==='tenant')applyTenantTheme(localStorage.getItem(CT_THEME_KEY)||'system');",1)

old_brand='<div class="ct-brand">${brandBlock(isPlatform)}</div><nav class="ct-nav">${nav(items,activePage)}</nav>'
new_brand='<div class="ct-brand">${brandBlock(isPlatform)}${isPlatform?\'\':\'<button id="ct-sidebar-toggle" class="ct-sidebar-toggle" type="button" aria-expanded="true" aria-label="Contraer menú" title="Contraer menú"><i data-lucide="panel-left-close" aria-hidden="true"></i></button>\'}</div><nav class="ct-nav">${nav(items,activePage,false)}</nav>'
if old_brand in js:
    js=js.replace(old_brand,new_brand,1)
elif "ct-sidebar-toggle" not in js:
    raise SystemExit("No encontré brand/nav.")

old_mobile='<nav class="ct-mobile">${isPlatform?nav(items.slice(0,5),activePage):nav([tenant[0],tenant[1],[\'nueva\',\'Nueva cita\',\'#\',\'＋\'],tenant[2],[\'mas\',\'Más\',\'configuracion.html\',\'•••\']],activePage)}</nav>'
new_mobile='<nav class="ct-mobile">${isPlatform?nav(items.slice(0,5),activePage,true):nav([tenant[0],tenant[1],[\'nueva\',\'Nueva cita\',\'#\',\'＋\'],tenant[2],[\'mas\',\'Más\',\'configuracion.html\',\'•••\']],activePage,true)}</nav>'
if old_mobile in js:
    js=js.replace(old_mobile,new_mobile,1)
elif "activePage,true" not in js:
    raise SystemExit("No encontré mobile nav.")

target='<a href="ayuda.html" role="menuitem">Ayuda</a>'
theme_markup='''<a href="ayuda.html" role="menuitem">Ayuda</a><div class="ct-theme-switcher" role="group" aria-label="Apariencia"><small>APARIENCIA</small><div><button class="ct-theme-option" type="button" data-theme="light" aria-pressed="false"><i data-lucide="sun"></i><span>Claro</span></button><button class="ct-theme-option" type="button" data-theme="dark" aria-pressed="false"><i data-lucide="moon"></i><span>Oscuro</span></button><button class="ct-theme-option" type="button" data-theme="system" aria-pressed="false"><i data-lucide="monitor-cog"></i><span>Sistema</span></button></div></div>'''
if "ct-theme-switcher" not in js:
    if target not in js:
        raise SystemExit("No encontré Ayuda en menú tenant.")
    js=js.replace(target,theme_markup,1)

old_tenant="    if(!isPlatform){hydrate();loadActions()}"
if old_tenant in js:
    js=js.replace(old_tenant,"    if(!isPlatform){setupTenantTheme();setupTenantSidebar();hydrate();loadActions()}",1)

css_block=r'''

/* =========================================================
   MyCitaGo Shell V3 — Apariencia + Sidebar práctico
   ========================================================= */
:root{--ct-sidebar-w-collapsed:76px}
[data-ct-theme="dark"]{
  --ct-bg:#111018;--ct-surface:#191721;--ct-border:#302d3a;
  --ct-text:#f3f1f7;--ct-muted:#aaa5b5;--ct-primary-soft:#2b2140;
  --ct-shadow:0 12px 34px rgba(0,0,0,.28);
}
[data-ct-theme="dark"] body{background:var(--ct-bg);color:var(--ct-text)}
[data-ct-theme="dark"] .ct-topbar{background:rgba(25,23,33,.94);border-color:var(--ct-border)}
[data-ct-theme="dark"] .ct-search{background:#211f29;border-color:var(--ct-border);color:var(--ct-muted)}
[data-ct-theme="dark"] .ct-user:hover{background:#24212e}
[data-ct-theme="dark"] .ct-user-menu,
[data-ct-theme="dark"] .ct-dialog-panel,
[data-ct-theme="dark"] .ct-card,
[data-ct-theme="dark"] .ct-stat-card,
[data-ct-theme="dark"] .ct-drawer-panel{background:var(--ct-surface);color:var(--ct-text);border-color:var(--ct-border)}
[data-ct-theme="dark"] .ct-user-menu a,
[data-ct-theme="dark"] .ct-user-menu button{color:var(--ct-text)}
[data-ct-theme="dark"] .ct-user-menu a:hover,
[data-ct-theme="dark"] .ct-user-menu button:hover{background:#24212e}
[data-ct-theme="dark"] .ct-form-field input,
[data-ct-theme="dark"] .ct-form-field select,
[data-ct-theme="dark"] .ct-form-field textarea,
[data-ct-theme="dark"] .ct-input{background:#211f29;color:var(--ct-text);border-color:var(--ct-border)}
[data-ct-theme="dark"] .ct-content .dash-card,
[data-ct-theme="dark"] .ct-content .kpi-card,
[data-ct-theme="dark"] .ct-content .ops-card,
[data-ct-theme="dark"] .ct-content .ops-metric,
[data-ct-theme="dark"] .ct-content .svc-card,
[data-ct-theme="dark"] .ct-content .adm-card,
[data-ct-theme="dark"] .ct-content .creator-card{background:var(--ct-surface)!important;color:var(--ct-text)!important;border-color:var(--ct-border)!important}
[data-ct-theme="dark"] .ct-content .appointment-card{background:#1d1b25;border-color:var(--ct-border)!important}
[data-ct-theme="dark"] .ct-content h1,
[data-ct-theme="dark"] .ct-content h2,
[data-ct-theme="dark"] .ct-content h3,
[data-ct-theme="dark"] .ct-content strong,
[data-ct-theme="dark"] .ct-content b{color:var(--ct-text)}
[data-ct-theme="dark"] .ct-content p,
[data-ct-theme="dark"] .ct-content small{color:var(--ct-muted)}

.ct-theme-switcher{padding:9px 8px 7px;margin:5px 0 2px;border-top:1px solid var(--ct-border)}
.ct-theme-switcher>small{display:block;padding:0 2px 7px;color:var(--ct-muted);font-size:8px;font-weight:800;letter-spacing:.08em}
.ct-theme-switcher>div{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.ct-user-menu .ct-theme-option{min-height:38px;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:6px 4px;border:1px solid transparent;border-radius:9px;font-size:9px;text-align:center}
.ct-theme-option svg{width:14px;height:14px}
.ct-theme-option.active{background:var(--ct-primary-soft)!important;color:var(--ct-primary)!important;border-color:rgba(124,58,237,.28)!important}

@media(min-width:901px){
  .ct-brand{position:relative}
  .ct-sidebar-toggle{position:absolute;right:-2px;top:8px;width:30px;height:30px;display:grid;place-items:center;border:1px solid #3a3546;border-radius:9px;background:#211e2a;color:#c7c1d0;cursor:pointer;transition:.16s}
  .ct-sidebar-toggle:hover{background:#2a2635;color:#fff}
  .ct-sidebar-toggle:focus-visible{outline:2px solid #a78bfa;outline-offset:2px}
  .ct-sidebar-toggle svg{width:15px;height:15px}
  .ct-nav{gap:0;padding-right:2px}
  .ct-nav-group{margin:18px 12px 8px;font-size:10px;line-height:1;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#8f879c}
  .ct-nav-group:first-child{margin-top:4px}
  .ct-nav a{position:relative;min-height:44px;margin:1px 0;padding:0 12px;gap:12px;border-radius:11px;font-size:13px;line-height:1.2;font-weight:650}
  .ct-nav-icon{width:20px;height:20px;display:grid;place-items:center;flex:0 0 20px;color:#aaa3b8}
  .ct-nav-icon svg{width:18px;height:18px;stroke-width:1.9}
  .ct-nav a:focus-visible{outline:2px solid #a78bfa;outline-offset:-2px;background:#24212e;color:#fff}
  .ct-nav a.active{background:linear-gradient(90deg,#322943,#2b2538);box-shadow:none;color:#fff;font-weight:750}
  .ct-nav a.active::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 999px 999px 0;background:#9b6cff}
  .ct-nav a.active .ct-nav-icon{color:#c9b4ff}
  .ct-app.sidebar-collapsed .ct-sidebar{width:var(--ct-sidebar-w-collapsed);padding-left:10px;padding-right:10px}
  .ct-app.sidebar-collapsed .ct-main{margin-left:var(--ct-sidebar-w-collapsed)}
  .ct-app.sidebar-collapsed .ct-brand{justify-content:center;padding-left:0;padding-right:0}
  .ct-app.sidebar-collapsed .ct-brand-copy,
  .ct-app.sidebar-collapsed .ct-nav-group,
  .ct-app.sidebar-collapsed .ct-side-foot,
  .ct-app.sidebar-collapsed .ct-nav a>span:last-child{display:none}
  .ct-app.sidebar-collapsed .ct-brand-mark{width:40px;height:40px}
  .ct-app.sidebar-collapsed .ct-sidebar-toggle{right:-7px}
  .ct-app.sidebar-collapsed .ct-nav a{justify-content:center;padding:0;gap:0}
  .ct-app.sidebar-collapsed .ct-nav-icon{width:24px;height:24px;flex-basis:24px}
  .ct-sidebar,.ct-main{transition:width .18s ease,margin-left .18s ease}
}
'''
if "MyCitaGo Shell V3 — Apariencia + Sidebar práctico" not in css:
    css=css.rstrip()+css_block+"\n"

JS.write_text(js,encoding="utf-8")
CSS.write_text(css,encoding="utf-8")
print("OK: tema Claro/Oscuro/Sistema + Sidebar V3 aplicado.")
