from pathlib import Path

JS_PATH=Path("js/citago-shell.js")
CSS_PATH=Path("css/citago-admin.css")

if not JS_PATH.exists() or not CSS_PATH.exists():
    raise SystemExit("Ejecuta este script desde la raíz del repositorio MyCitaGo.")

js=JS_PATH.read_text(encoding="utf-8")
css=CSS_PATH.read_text(encoding="utf-8")

ICON_MAP="""  const NAV_ICON_MAP={
    inicio:'house',
    agenda:'calendar-days',
    clientes:'users',
    servicios:'scissors',
    equipo:'user-round',
    sucursales:'map-pin',
    resenas:'star',
    crecimiento:'trending-up',
    'mi-pagina':'panel-top',
    reportes:'chart-no-axes-column',
    configuracion:'settings',
    ayuda:'circle-help',
    resumen:'layout-dashboard',
    negocios:'building-2',
    suscripciones:'badge-dollar-sign',
    soporte:'life-buoy',
    plantillas:'wand-sparkles',
    pagos:'credit-card',
    incidencias:'triangle-alert',
    integraciones:'link-2',
    auditoria:'shield-check',
    nueva:'plus',
    mas:'ellipsis'
  };
"""

OLD_NAV="""  function nav(items,active){let last='';return items.map(([id,label,href,icon,group])=>{const head=group&&group!==last?`<span class="ct-nav-group">${group}</span>`:'';last=group||last;return `${head}<a class="${id===active?'active':''}" href="${href}"><i>${icon}</i><span>${label}</span></a>`}).join('')}"""

NEW_NAV="""  function nav(items,active,mobile=false){let last='';return items.map(([id,label,href,icon,group])=>{const head=group&&group!==last?`<span class="ct-nav-group">${group}</span>`:'';last=group||last;const activeAttrs=id===active?' class="active" aria-current="page"':'';const iconMarkup=mobile?`<i>${icon}</i>`:`<span class="ct-nav-icon" aria-hidden="true"><i data-lucide="${NAV_ICON_MAP[id]||'circle'}"></i></span>`;return `${head}<a${activeAttrs} href="${href}">${iconMarkup}<span>${label}</span></a>`}).join('')}"""

if "const NAV_ICON_MAP=" not in js:
    marker="  function nav(items,active)"
    if marker not in js:
        raise SystemExit("No encontré function nav() en js/citago-shell.js; detente y revisa antes de continuar.")
    js=js.replace(marker,ICON_MAP+marker,1)

if OLD_NAV in js:
    js=js.replace(OLD_NAV,NEW_NAV,1)
elif "function nav(items,active,mobile=false)" not in js:
    raise SystemExit("La función nav() ya no coincide con la versión esperada; no se modificó nada.")


old_desktop='''<nav class="ct-nav">${nav(items,activePage)}</nav>'''
new_desktop='''<nav class="ct-nav">${nav(items,activePage,false)}</nav>'''
if old_desktop in js:
    js=js.replace(old_desktop,new_desktop,1)
elif new_desktop not in js:
    raise SystemExit("No encontré la navegación desktop esperada; no se modificó nada.")

old_mobile="""<nav class="ct-mobile">${isPlatform?nav(items.slice(0,5),activePage):nav([tenant[0],tenant[1],['nueva','Nueva cita','#','＋'],tenant[2],['mas','Más','configuracion.html','•••']],activePage)}</nav>"""
new_mobile="""<nav class="ct-mobile">${isPlatform?nav(items.slice(0,5),activePage,true):nav([tenant[0],tenant[1],['nueva','Nueva cita','#','＋'],tenant[2],['mas','Más','configuracion.html','•••']],activePage,true)}</nav>"""
if old_mobile in js:
    js=js.replace(old_mobile,new_mobile,1)
elif new_mobile not in js:
    raise SystemExit("No encontré la navegación mobile esperada; no se modificó nada.")

SIDEBAR_CSS=r"""

/* =========================================================
   MyCitaGo Sidebar V2 — desktop shell real ct-*
   Mantiene ct-mobile intacto.
   ========================================================= */
@media(min-width:901px){
  .ct-nav{
    gap:0;
    padding:0 2px 6px 0;
  }

  .ct-nav-group{
    margin:18px 12px 8px;
    font-size:10px;
    line-height:1;
    font-weight:800;
    letter-spacing:.09em;
    text-transform:uppercase;
    color:#8f879c;
  }

  .ct-nav-group:first-child{
    margin-top:4px;
  }

  .ct-nav a{
    position:relative;
    min-height:44px;
    margin:1px 0;
    padding:0 12px;
    gap:12px;
    border-radius:11px;
    font-size:13px;
    line-height:1.2;
    font-weight:650;
    color:#c2bdcb;
    transition:background .16s ease,color .16s ease,transform .16s ease;
  }

  .ct-nav a .ct-nav-icon{
    width:20px;
    height:20px;
    display:grid;
    place-items:center;
    flex:0 0 20px;
    color:#aaa3b8;
  }

  .ct-nav a .ct-nav-icon svg{
    width:18px;
    height:18px;
    stroke-width:1.9;
  }

  .ct-nav a:hover{
    background:#24212e;
    color:#fff;
  }

  .ct-nav a:hover .ct-nav-icon{
    color:#fff;
  }

  .ct-nav a:focus-visible{
    outline:2px solid #a78bfa;
    outline-offset:-2px;
    background:#24212e;
    color:#fff;
  }

  .ct-nav a.active{
    background:linear-gradient(90deg,#322943,#2b2538);
    color:#fff;
    box-shadow:none;
    font-weight:750;
  }

  .ct-nav a.active::before{
    content:"";
    position:absolute;
    left:0;
    top:9px;
    bottom:9px;
    width:3px;
    border-radius:0 999px 999px 0;
    background:#9b6cff;
  }

  .ct-nav a.active .ct-nav-icon{
    color:#c9b4ff;
  }
}
"""

if "MyCitaGo Sidebar V2" not in css:
    css=css.rstrip()+SIDEBAR_CSS+"\n"

JS_PATH.write_text(js,encoding="utf-8")
CSS_PATH.write_text(css,encoding="utf-8")
print("OK: Sidebar V2 aplicado a js/citago-shell.js y css/citago-admin.css")
