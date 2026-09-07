from pathlib import Path
p=Path("css/citago-admin.css")
s=p.read_text(encoding="utf-8")
repls=[
("color:var(--ct-muted);font-size:12px}.ct-top-actions","color:var(--ct-muted);font-size:13px}.ct-top-actions"),
(".ct-user strong{display:block;font-size:11px}",".ct-user strong{display:block;font-size:13px}"),
(".ct-user small{display:block;color:var(--ct-muted);font-size:9px}",".ct-user small{display:block;color:var(--ct-muted);font-size:11px}")
]
for old,new in repls:
    if old not in s: raise SystemExit("No se encontró patrón esperado: "+old)
    s=s.replace(old,new,1)
p.write_text(s,encoding="utf-8")
print("OK: css/citago-admin.css actualizado")
