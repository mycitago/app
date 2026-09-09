# MyCitaGo — Compartir reserva con imagen

Reemplaza exactamente estos 3 archivos en GitHub:
- `admin/crecimiento.html`
- `js/admin-growth.js`
- `css/growth.css`

La portada se obtiene de `business_branding_public.cover_url`.
Si no existe, usa `logo_url` y luego los campos equivalentes del negocio.

El botón **Compartir imagen + enlace** usa Web Share API cuando el navegador permite compartir archivos.
En navegadores que no lo permiten, descarga la imagen y copia el enlace.

Prueba después del deploy:
`admin/crecimiento.html?v=20260909-shareimg1`
