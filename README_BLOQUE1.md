# CITAGO · Mercado Pago · Bloque 1

Este paquete sustituye **solamente la conexión del negocio** de Stripe por Mercado Pago. Todavía no borres las funciones de Stripe.

## Contenido

- `sql/01_MERCADOPAGO_BLOQUE1.sql`
- `supabase/functions/_shared/mercadopago-common.ts`
- `supabase/functions/mp-connect-start/index.ts`
- `supabase/functions/mp-oauth-callback/index.ts`
- `supabase/functions/mp-connect-status/index.ts`

## 1. Crear aplicación en Mercado Pago

En el panel de Mercado Pago Developers crea una aplicación de **Pagos online** con producto **Checkout Pro** o **Checkout API** y modelo **Marketplace**.

Configura como Redirect URI exactamente:

`https://rienqmmrxzuseiaweugz.supabase.co/functions/v1/mp-oauth-callback`

> Si tu Project Ref de Supabase cambia, usa el nuevo dominio. La Redirect URI debe coincidir exactamente entre Mercado Pago y `MP_REDIRECT_URI`.

## 2. Secrets en Supabase

En Supabase > Project Settings > Edge Functions > Secrets agrega:

```text
MP_CLIENT_ID=<APP_ID de Mercado Pago>
MP_CLIENT_SECRET=<SECRET_KEY de la aplicación Mercado Pago>
MP_REDIRECT_URI=https://rienqmmrxzuseiaweugz.supabase.co/functions/v1/mp-oauth-callback
APP_PUBLIC_URL=https://mycitago.github.io/app
```

Ya deben existir también:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**No pegues secretos en GitHub ni en JavaScript del navegador.**

## 3. Ejecutar SQL

Abre Supabase > SQL Editor y ejecuta `sql/01_MERCADOPAGO_BLOQUE1.sql` una sola vez. Es idempotente para columnas/tablas creadas aquí.

## 4. Crear Edge Functions

Crea estas funciones en Supabase y pega cada `index.ts`:

1. `mp-connect-start`
2. `mp-oauth-callback`
3. `mp-connect-status`

Copia también `_shared/mercadopago-common.ts` al proyecto de funciones si despliegas por CLI. Si usas exclusivamente el editor web de Supabase y no permite un `_shared` común, avísame y te doy versiones autocontenidas de las 3 funciones.

## 5. Prueba del Bloque 1

Aún no cambies el checkout de clientes. Primero valida:

1. Usuario OWNER/MANAGER/ADMIN llama `mp-connect-start` con su `business_id`.
2. La función devuelve `url` de `auth.mercadopago.com.mx`.
3. Autoriza la cuenta Mercado Pago.
4. Mercado Pago vuelve a `mp-oauth-callback`.
5. La página termina en `admin/pagos.html?mp=return`.
6. `mp-connect-status` devuelve `connected: true`.

## Seguridad incluida

- OAuth `state` aleatorio de 256 bits.
- `state` guardado como SHA-256, de un solo uso y con expiración de 10 minutos.
- Tokens guardados en `business_payment_secrets`, sin acceso para `anon` ni `authenticated`.
- Roles OWNER/MANAGER/ADMIN para iniciar/consultar la conexión.
- El navegador nunca recibe `access_token` ni `refresh_token`.

## Nota sobre renovación

Mercado Pago devuelve `refresh_token` y `expires_in`; este bloque los guarda, pero **la renovación automática se implementará en el Bloque 2/3 junto con los helpers de checkout**. Si el token llega vencido antes de esa fase, `mp-connect-status` devuelve `reauth_required`.
