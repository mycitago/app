# CITAGO — Migración a sistema de diseño único

Este paquete usa los dos archivos que proporcionaste y añade una migración segura para el repo actual.

## Importante para GitHub Pages
CITAGO se publica bajo `/app/`, por eso en las páginas `admin/*.html` se usan rutas relativas `../css/...` y `../js/...`. No se usan `/css/...` ni `/js/...`, porque esas rutas apuntarían a la raíz de `mycitago.github.io`.

## Aplicar
1. Descomprime este paquete dentro de la raíz del repo (donde existen `admin/`, `css/`, `js/`).
2. Ejecuta: `python tools/migrate_admin_design.py .`
3. Revisa `admin/servicios.html`, `admin/configuracion.html`, `admin/clientes.html` y `admin/index.html`.
4. Si algo no te gusta, cada HTML conserva un backup `*.pre-design-system.bak`.

## Qué hace
- Instala `css/admin-design-system.css` como estilo compartido.
- Instala `js/admin-nav.js` como única fuente del sidebar/topbar.
- Inserta `#app-shell` en todas las páginas admin salvo login.
- Mueve en runtime el `<main>` existente dentro del shell, conservando IDs y scripts.
- Oculta sidebar/topbar legacy para evitar doble menú.
- Añade navegación móvil.
- Migra progresivamente KPI y tarjetas de servicios a `stat-grid/stat-card` y `catalog-grid/catalog-card`.
- No toca Supabase, RLS, tablas ni políticas.

## Nota
Las páginas que aún no existen (`citas.html`, `calendario.html`, `promociones.html`, etc.) aparecen en el menú según el diseño entregado. Si todavía no están implementadas, conviene crearlas o retirar temporalmente esos items de `NAV_ITEMS`.
