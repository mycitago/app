# CITAGO — Instalación de la reconstrucción completa

## 1. Subir el proyecto
Reemplaza el contenido de tu repo `mycitago/app` por el contenido de `app-main/` de este ZIP y haz commit en `main`.

## 2. Aplicar base de datos
En Supabase → SQL Editor ejecuta UNA VEZ:

`APLICAR_EN_SUPABASE.sql`

Este archivo crea branding con borrador/publicación, conexión Google, almacenamiento server-side de tokens, cache de reseñas y el RPC del Super Admin.

## 3. Google Business Profile
En Supabase Edge Function Secrets configura:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_STATE_SECRET
- GOOGLE_REDIRECT_URI
- PUBLIC_APP_URL=https://mycitago.github.io/app

Despliega:

```bash
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback --no-verify-jwt
supabase functions deploy google-business-locations
supabase functions deploy google-reviews-sync
supabase functions deploy google-review-reply
supabase functions deploy google-review-delete-reply
supabase functions deploy google-disconnect
```

El callback usa `--no-verify-jwt` porque Google regresa sin JWT de Supabase; la seguridad del callback usa un `state` firmado con HMAC.

## 4. Flujo de prueba
1. Abre `/admin/mi-pagina.html`.
2. Cambia colores/textos y guarda borrador.
3. Verifica que la página pública todavía NO cambie.
4. Pulsa Publicar.
5. Abre `/reservar.html?n=<slug>`.
6. Abre `/admin/resenas.html`, conecta Google, selecciona ubicación y sincroniza reseñas.
7. Abre `/admin/plataforma.html` para Super Admin.

## Importante
Nunca copies secretos de Google a `js/config.js`, HTML o archivos servidos por GitHub Pages.
