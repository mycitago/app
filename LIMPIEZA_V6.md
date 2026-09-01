# Limpieza y consolidación V6

- Agenda: `business_staff` sustituido por el modelo real `staff`.
- Equipo: `business_staff` + `staff_services` eliminados del frontend; ahora usa `staff` + `service_staff`.
- Sucursales: usa `business_branches` y la guía apunta al master V6.
- Reportes/Finanzas: eliminadas referencias legacy `#biz-name` y `#btn-logout`; ingresos históricos calculados con `appointments.price_charged`.
- Reseñas Google: integración opcional protegida por `window.MYCITAGO_GOOGLE_REVIEWS_ENABLED === true`; por defecto no invoca Edge Functions y muestra “Integración no configurada”.
- Google Login: un único flujo activo, autocontenido en `admin/login.html`; se retiró del paquete el helper duplicado `js/oauth-login-flow.js`.
- SQL: `SUPABASE_V6_MASTER.sql` es la única migración maestra de despliegue incluida en la raíz; se retiró `APLICAR_EN_SUPABASE.sql` del paquete para evitar ejecuciones cruzadas.
- GitHub Pages: no se incluye `.github/workflows` de Pages; publicación prevista exclusivamente por `main → /(root)`.
- Verificación: se añadió `tools/verify-v6.py` para revisar físicamente todas las referencias locales `<script src>` y `<link href>` con comparación case-sensitive.
