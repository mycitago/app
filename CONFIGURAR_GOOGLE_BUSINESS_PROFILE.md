# Activar Google Business Profile en MyCitaGo

El botón **Conectar con Google** depende de las Edge Functions incluidas en este repositorio. GitHub Pages no puede guardar el `GOOGLE_CLIENT_SECRET`; por seguridad el intercambio OAuth se hace en Supabase.

## 1. Google Cloud

Crea/usa un proyecto de Google Cloud con acceso aprobado a Business Profile APIs y crea credenciales OAuth Web.

Redirect URI autorizado (usa el project ref real de Supabase):

`https://rienqmmrxzuseiaweugz.supabase.co/functions/v1/google-oauth-callback`

## 2. Secretos de Supabase

Desde Supabase CLI, en la raíz del proyecto:

```bash
supabase link --project-ref rienqmmrxzuseiaweugz
supabase secrets set GOOGLE_CLIENT_ID="TU_CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="TU_CLIENT_SECRET"
supabase secrets set GOOGLE_REDIRECT_URI="https://rienqmmrxzuseiaweugz.supabase.co/functions/v1/google-oauth-callback"
supabase secrets set GOOGLE_STATE_SECRET="UNA_CADENA_ALEATORIA_LARGA"
supabase secrets set PUBLIC_APP_URL="https://mycitago.github.io/app"
```

## 3. Desplegar funciones

```bash
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback --no-verify-jwt
supabase functions deploy google-business-locations
supabase functions deploy google-reviews-sync
supabase functions deploy google-review-reply
supabase functions deploy google-review-delete-reply
supabase functions deploy google-disconnect
```

## 4. Base de datos

Ejecuta `APLICAR_EN_SUPABASE.sql` para asegurar que existan `business_google_connections`, `business_google_tokens` y `business_google_reviews`.

## 5. Prueba

Abre `admin/resenas.html`, pulsa **Conectar con Google**, autoriza la cuenta y después selecciona la ubicación del negocio.
