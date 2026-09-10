MyCitaGo — Stripe dual payments SANDBOX
Fecha: 2026-09-10

QUÉ INCLUYE
A) Negocio paga su suscripción MyCitaGo -> Stripe Billing Checkout.
B) Cliente final paga opcionalmente al negocio -> Stripe Connect direct charge.
Los dos flujos están separados.

IMPORTANTE
- Este paquete está configurado para SANDBOX.
- No pongas STRIPE_SECRET_KEY en GitHub.
- Los pagos de clientes quedan APAGADOS por defecto.
- OXXO/SPEI no se marcan como disponibles por el frontend: Stripe decide
  qué métodos muestra según la cuenta conectada y el pago.

PASO 1 — SUPABASE SQL
Si ya aplicaste un SQL de pagos, el archivo incluido es idempotente/compatibilidad:
  sql/STRIPE_DUAL_PAYMENTS_SANDBOX.sql
Después:
  sql/VERIFY_STRIPE_DUAL_PAYMENTS.sql

PASO 2 — SECRETS EN SUPABASE EDGE FUNCTIONS
Configura en Supabase (Secrets):
  STRIPE_SECRET_KEY=<clave secreta TEST de Stripe>
  APP_PUBLIC_URL=https://mycitago.github.io/app
  STRIPE_WEBHOOK_SECRET=<se obtiene al crear el endpoint webhook>

Nunca copies esos valores dentro de JS/HTML.

PASO 3 — SUBIR/DEPLOY EDGE FUNCTIONS
Carpetas:
  supabase/functions/_shared/stripe.ts
  supabase/functions/stripe-connect-start/index.ts
  supabase/functions/stripe-connect-status/index.ts
  supabase/functions/stripe-platform-checkout/index.ts
  supabase/functions/stripe-customer-checkout/index.ts
  supabase/functions/stripe-webhook/index.ts

Con Supabase CLI:
  supabase functions deploy stripe-connect-start
  supabase functions deploy stripe-connect-status
  supabase functions deploy stripe-platform-checkout
  supabase functions deploy stripe-customer-checkout --no-verify-jwt
  supabase functions deploy stripe-webhook --no-verify-jwt

PASO 4 — WEBHOOK STRIPE (SANDBOX)
Endpoint:
  https://TU-PROJECT-REF.supabase.co/functions/v1/stripe-webhook

Escuchar, como mínimo:
  checkout.session.completed
  checkout.session.async_payment_succeeded
  checkout.session.async_payment_failed
  customer.subscription.created
  customer.subscription.updated
  customer.subscription.deleted
  invoice.paid
  invoice.payment_failed

Para los cobros de negocios conectados, el endpoint debe recibir eventos de
cuentas conectadas/Connect además de eventos de la plataforma.

PASO 5 — SUBIR A GITHUB
Reemplazar/agregar:
  admin/pagos.html
  admin/planes.html
  css/admin-payments.css
  js/admin-payments.js
  js/admin-plans.js
  js/citago-shell.js
  js/public-payments.js
  js/app.js
  reservar.html

PASO 6 — PRUEBA
1. Entra a admin/pagos.html.
2. Stripe debe mostrar "No conectado" o "Configuración pendiente".
3. Pulsa Conectar cuenta y completa onboarding TEST.
4. Regresa y pulsa Actualizar estado.
5. Activa pagos online y elige Anticipo fijo / % / Pago completo.
6. Guarda.
7. Crea una cita pública.
8. Paso 4 debe mostrar "Pago online disponible".
9. Pulsa pagar: debe abrir Checkout de la CUENTA CONECTADA.
10. En admin/planes.html elige un plan: debe abrir Checkout de la PLATAFORMA.

NO PUBLICAR EN LIVE AÚN
Primero comprobar end-to-end sandbox + webhook + eventos.
