# MyCitaGo Google Login V5 — corrección de carga

Esta versión corrige el error `ReferenceError: MyCitaGoOAuth is not defined`.

- `admin/login.html` ya incluye internamente el helper OAuth crítico.
- El login ya no depende de que `js/oauth-login-flow.js` cargue desde GitHub Pages.
- Las llamadas críticas están protegidas con `try/catch` y un guard explícito.
- El ZIP está empaquetado desde la raíz real del proyecto; no contiene una carpeta `v4work/` envolvente.
- No requiere SQL ni cambios en Google Cloud/Supabase.
