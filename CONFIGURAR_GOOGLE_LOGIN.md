# Activar Google Login en MyCitaGo

El frontend ya incluye el botón **Continuar con Google** y el onboarding posterior para crear el negocio sin SMS.

## 1. Google Cloud
1. Crea/usa un proyecto en Google Cloud Console.
2. Configura la pantalla de consentimiento OAuth.
3. Crea credenciales **OAuth Client ID → Web application**.
4. En **Authorized redirect URIs** agrega el callback que muestra Supabase en `Authentication → Providers → Google` (normalmente `https://TU-PROYECTO.supabase.co/auth/v1/callback`).
5. Copia Client ID y Client Secret.

## 2. Supabase
1. `Authentication → Providers → Google`.
2. Activa Google.
3. Pega Client ID y Client Secret.
4. En `Authentication → URL Configuration` establece Site URL: `https://mycitago.github.io/app/`.
5. Agrega a Redirect URLs: `https://mycitago.github.io/app/admin/login.html*`.

## 3. Edge Function para usuarios Google nuevos
Despliega `supabase/functions/complete-onboarding/index.ts` como función `complete-onboarding`.
La función usa las variables estándar de Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) y verifica el JWT antes de crear un negocio.

Ejemplo con Supabase CLI:
`supabase functions deploy complete-onboarding`

## Flujo final
- Usuario pulsa **Continuar con Google**.
- Google autentica al usuario.
- Si ya pertenece a un negocio, entra al panel.
- Si es nuevo, MyCitaGo pide nombre del negocio y teléfono internacional.
- No se envía SMS; el teléfono se guarda como E.164, por ejemplo `+526655443322`.
- Se crea el negocio, membresía OWNER y prueba inicial.
