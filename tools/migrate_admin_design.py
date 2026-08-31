#!/usr/bin/env python3
"""Migra el panel admin de CITAGO al sistema de diseño compartido sin tocar backend/RLS."""
from pathlib import Path
from bs4 import BeautifulSoup
import shutil, sys, re

ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd().resolve()
ADMIN=ROOT/'admin'; CSS=ROOT/'css'; JS=ROOT/'js'
SOURCE=Path(__file__).resolve().parent.parent
if not ADMIN.exists(): raise SystemExit(f'No encontré {ADMIN}. Ejecuta desde la raíz del repo.')
CSS.mkdir(exist_ok=True); JS.mkdir(exist_ok=True)
src_css=SOURCE/'css/admin-design-system.css'; dst_css=CSS/'admin-design-system.css'
src_js=SOURCE/'js/admin-nav.js'; dst_js=JS/'admin-nav.js'
if src_css.resolve()!=dst_css.resolve(): shutil.copy2(src_css,dst_css)
if src_js.resolve()!=dst_js.resolve(): shutil.copy2(src_js,dst_js)

active_map={'index':'resumen','citas':'citas','calendario':'calendario','clientes':'clientes','servicios':'servicios','promociones':'promociones','mi-pagina':'mi-pagina','equipo':'equipo','contabilidad':'contabilidad','reportes':'reportes','mensajes':'mensajes','configuracion':'configuracion'}
skip={'login.html'}
changed=[]
for f in sorted(ADMIN.glob('*.html')):
    if f.name in skip: continue
    raw=f.read_text(encoding='utf-8')
    soup=BeautifulSoup(raw,'html.parser')
    if not soup.head or not soup.body: continue
    backup=f.with_suffix(f.suffix+'.pre-design-system.bak')
    if not backup.exists(): backup.write_text(raw,encoding='utf-8')

    # Shared CSS LAST so it is the source of truth for common components.
    for old in soup.find_all('link',href=True):
        if 'admin-design-system.css' in old.get('href',''): old.decompose()
    link=soup.new_tag('link',rel='stylesheet',href='../css/admin-design-system.css')
    soup.head.append(link)

    # Shell mount goes first. Existing functional markup is moved at runtime.
    old_shell=soup.find(id='app-shell')
    if old_shell: old_shell.decompose()
    shell=soup.new_tag('div',id='app-shell'); shell['class']=['app-shell']
    soup.body.insert(0,shell)
    nav_script=soup.new_tag('script',src='../js/admin-nav.js')
    shell.insert_after(nav_script)
    key=active_map.get(f.stem,'resumen')
    init=soup.new_tag('script')
    init.string=f"document.addEventListener('DOMContentLoaded',()=>AdminNav.render({{activePage:'{key}',contentSelector:'main'}}));"
    nav_script.insert_after(init)

    # Remove duplicated copies of shared nav script if present later.
    seen=False
    for s in list(soup.find_all('script',src=True)):
        if 'admin-nav.js' in s.get('src',''):
            if not seen: seen=True
            elif s is not nav_script: s.decompose()

    # Progressive class migration; does not rename/remove IDs used by JS.
    for el in soup.select('.adm-kpis'): el['class']=list(dict.fromkeys(el.get('class',[])+['stat-grid']))
    for el in soup.select('.adm-kpi'): el['class']=list(dict.fromkeys(el.get('class',[])+['stat-card']))
    for el in soup.select('.svc-grid,.service-grid'): el['class']=list(dict.fromkeys(el.get('class',[])+['catalog-grid']))
    for el in soup.select('.svc-card,.svc-catalog-card'): el['class']=list(dict.fromkeys(el.get('class',[])+['catalog-card']))
    for el in soup.select('button.btn-primary,a.btn-primary'): el['class']=list(dict.fromkeys(el.get('class',[])+['btn','btn-primary']))

    f.write_text(str(soup),encoding='utf-8')
    changed.append(f.relative_to(ROOT).as_posix())

print('Migración terminada.')
print('Archivos HTML actualizados:',len(changed))
for x in changed: print(' -',x)
print('Backups: *.pre-design-system.bak')
