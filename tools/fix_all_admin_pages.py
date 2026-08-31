#!/usr/bin/env python3
from pathlib import Path
import re,sys
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else ".").resolve()
ADMIN=ROOT/"admin"
TARGETS=["index.html","clientes.html","configuracion.html","contabilidad.html","equipo.html","integraciones.html","planes.html","servicios.html","plataforma.html"]
CSS='<link rel="stylesheet" href="../css/admin-design-system.css">'
JS='<script src="../js/admin-nav.js"></script>'
SHELL='<div id="app-shell"></div>'

def normalize_local_paths(s):
    # GitHub Pages project lives under /app/, so /css and /js point to the wrong site root.
    s=re.sub(r'(["\'])/css/',r'\1../css/',s)
    s=re.sub(r'(["\'])/js/',r'\1../js/',s)
    s=re.sub(r'(["\'])/admin/',r'\1',s)
    return s

def patch(p):
    s=p.read_text(encoding="utf-8");o=s
    s=normalize_local_paths(s)
    # keep legacy CSS for page-specific styles, shared CSS last
    if "admin-design-system.css" not in s:
        if not re.search(r'</head\s*>',s,re.I): raise RuntimeError(f"{p}: falta </head>")
        s=re.sub(r'</head\s*>',f'  {CSS}\n</head>',s,count=1,flags=re.I)
    if 'id="app-shell"' not in s and "id='app-shell'" not in s:
        if not re.search(r'<body\b[^>]*>',s,re.I): raise RuntimeError(f"{p}: falta <body>")
        s=re.sub(r'(<body\b[^>]*>)',r'\1\n  '+SHELL,s,count=1,flags=re.I)
    if "admin-nav.js" not in s:
        if not re.search(r'</body\s*>',s,re.I): raise RuntimeError(f"{p}: falta </body>")
        s=re.sub(r'</body\s*>',f'  {JS}\n</body>',s,count=1,flags=re.I)
    if s!=o:
        bak=p.with_suffix(p.suffix+".pre-unified-admin.bak")
        if not bak.exists():bak.write_text(o,encoding="utf-8")
        p.write_text(s,encoding="utf-8");return True
    return False

changed=[];missing=[]
for n in TARGETS:
    p=ADMIN/n
    if not p.exists():missing.append(n);continue
    if patch(p):changed.append(n)
print("Modificados:",", ".join(changed) if changed else "ninguno")
if missing:print("Omitidos porque no existen:",", ".join(missing))
