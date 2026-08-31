# CITAGO — Resultado final del sistema de diseño único

Este paquete está pensado para tu repo `mycitago/app` en GitHub Pages.

## Qué corrige
- Un solo sidebar y topbar para todas las páginas admin.
- Un solo CSS compartido.
- Responsive real con navegación inferior en celular.
- `admin-nav.js` se autoejecuta: ya no hay que llamar manualmente `AdminNav.render()`.
- Conserva el HTML y JavaScript funcional de cada módulo.
- No toca Supabase, RLS, tablas ni backend.
- El menú sólo enlaza páginas que existen actualmente en el repo, evitando 404.

## Cómo instalar SIN ejecutar nada en tu computadora
Sube estas carpetas/archivos respetando exactamente las rutas:

- `.github/workflows/apply-admin-design.yml`
- `css/admin-design-system.css`
- `js/admin-nav.js`
- `tools/migrate_admin_design.py`

Haz commit en `main`.

GitHub Actions ejecutará el migrador y hará un segundo commit que modifica:
- admin/index.html
- admin/clientes.html
- admin/configuracion.html
- admin/contabilidad.html
- admin/equipo.html
- admin/integraciones.html
- admin/planes.html
- admin/servicios.html

`login.html` y `plataforma.html` quedan fuera intencionalmente.

## Si GitHub bloquea el commit automático
Ve a:
Settings → Actions → General → Workflow permissions
y selecciona:
**Read and write permissions**
Guarda, vuelve a Actions → "Aplicar CITAGO Design System" → Run workflow.

## Cómo comprobar que ya terminó
Abre `admin/contabilidad.html` en GitHub y busca estas 3 cadenas:
- `admin-design-system.css`
- `id="app-shell"`
- `admin-nav.js`

Cuando las tres estén presentes, recarga GitHub Pages con `Ctrl + F5`.

URL:
https://mycitago.github.io/app/admin/contabilidad.html
