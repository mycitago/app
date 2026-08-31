#!/usr/bin/env python3
from pathlib import Path
import re, sys

ROOT = Path(sys.argv[1] if len(sys.argv)>1 else ".").resolve()
ADMIN = ROOT / "admin"

TARGETS = ["index.html","clientes.html","configuracion.html","contabilidad.html","equipo.html",
           "integraciones.html","planes.html","servicios.html"]

CSS_TAG = '<link rel="stylesheet" href="../css/admin-design-system.css">'
JS_TAG = '<script src="../js/admin-nav.js"></script>'
SHELL = '<div class="app-shell" id="app-shell"></div>'

def patch(path: Path):
    s = path.read_text(encoding="utf-8")
    original = s

    if "admin-design-system.css" not in s:
        if not re.search(r'</head\s*>', s, flags=re.I):
            raise RuntimeError(f"{path}: no </head>")
        s = re.sub(r'</head\s*>', f'  {CSS_TAG}\n</head>', s, count=1, flags=re.I)

    if 'id="app-shell"' not in s and "id='app-shell'" not in s:
        if not re.search(r'<body\b[^>]*>', s, flags=re.I):
            raise RuntimeError(f"{path}: no <body>")
        s = re.sub(r'(<body\b[^>]*>)', r'\1\n  '+SHELL, s, count=1, flags=re.I)

    if "admin-nav.js" not in s:
        if not re.search(r'</body\s*>', s, flags=re.I):
            raise RuntimeError(f"{path}: no </body>")
        s = re.sub(r'</body\s*>', f'  {JS_TAG}\n</body>', s, count=1, flags=re.I)

    if s != original:
        backup = path.with_suffix(path.suffix + ".pre-design-system.bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(s, encoding="utf-8")
        return True
    return False

def main():
    if not ADMIN.exists():
        raise SystemExit(f"No existe {ADMIN}")
    changed=[]
    missing=[]
    for name in TARGETS:
        path=ADMIN/name
        if path.exists():
            if patch(path): changed.append(name)
        else:
            missing.append(name)
    print("CITAGO Design System")
    print("Modificados:", ", ".join(changed) if changed else "ninguno")
    if missing: print("No existen (se omiten):", ", ".join(missing))

if __name__=="__main__":
    main()
