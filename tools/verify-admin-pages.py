from pathlib import Path
R=Path(__file__).resolve().parents[1];pages=['index.html','clientes.html','servicios.html','equipo.html','contabilidad.html','configuracion.html','integraciones.html','planes.html','mi-pagina.html','resenas.html'];errors=[]
for n in pages:
 p=R/'admin'/n
 if not p.exists():errors.append(f'missing {p}');continue
 s=p.read_text(encoding='utf-8')
 for t in ['citago-admin.css','citago-shell.js','citago-shell']:
  if t not in s:errors.append(f'{n}: missing {t}')
if errors:print('\n'.join(errors));raise SystemExit(1)
print('OK: all tenant admin pages use CITAGO shared shell')
