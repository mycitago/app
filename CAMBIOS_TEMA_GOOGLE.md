# MyCitaGo — Tema claro/oscuro + Google Login

## Incluido
- Tema visual claro y oscuro para Landing, Login y todas las pantallas administrativas.
- Selector de tema en el topbar y persistencia con `localStorage` (`mycitago-ui-theme`).
- Respeta la preferencia del sistema la primera vez.
- Landing renovada en el lenguaje visual negro/violeta de MyCitaGo.
- Google Login como opción principal, manteniendo correo/contraseña como respaldo.
- Teléfono/WhatsApp con selector internacional; México inicia en `+52`.
- No se envían SMS ni códigos de WhatsApp, por lo que este flujo no agrega costo por verificación telefónica.
- Usuarios Google existentes entran al panel; usuarios Google nuevos completan nombre de negocio + teléfono y pasan al onboarding.
- Edge Function `complete-onboarding` verifica el JWT y crea negocio/membresía desde servidor.

## Archivos principales
- `js/ui-theme.js`
- `css/mycitago-themes.css`
- `admin/login.html`
- `css/admin-login-mycitago.css`
- `js/citago-shell.js`
- `index.html`
- `supabase/functions/complete-onboarding/index.ts`
- `CONFIGURAR_GOOGLE_LOGIN.md`

## Activación Google
Leer `CONFIGURAR_GOOGLE_LOGIN.md`. Google debe estar habilitado en Supabase Auth y la función `complete-onboarding` debe desplegarse.
