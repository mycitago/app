# MyCitaGo · D2 Completo

Este paquete cierra D2 sin reconstruir lo que ya existe.

## Incluye

- Estado real de solicitud de reseña en Agenda usando `review_requests`.
- Registro manual de pago/anticipo desde Agenda.
- Estado de pago en Agenda usando `customer_payments`.
- Checkout público real con Mercado Pago Checkout Pro.
- Webhook Mercado Pago con validación HMAC-SHA256.
- `get_public_payment_options()` alineado con Mercado Pago.
- Conserva datos históricos Stripe; no los borra.
- No toca D3-D5.

## Orden de instalación

1. Ejecutar `supabase/D2_MASTER.sql` en SQL Editor.
2. Configurar el secreto `MP_WEBHOOK_SECRET` en Supabase Edge Functions.
3. Crear/deploy `mp-customer-checkout` con **Verify JWT OFF** porque valida `appointment_id + access_token`.
4. Crear/deploy `mp-webhook` con **Verify JWT OFF** porque Mercado Pago no envía JWT de Supabase y la función valida `x-signature`.
5. Reemplazar en GitHub:
   - `js/public-payments.js`
   - `js/admin-agenda.js`
   - `css/admin-agenda.css`
6. Recargar GitHub Pages con Ctrl+F5.
7. En Mercado Pago > Tus integraciones > Webhooks, registrar:
   `https://rienqmmrxzuseiaweugz.supabase.co/functions/v1/mp-webhook`
   y activar el evento **Pagos**.
8. Copiar la clave secreta de Webhooks de Mercado Pago a `MP_WEBHOOK_SECRET`.

## Pruebas mínimas

- Agenda: una cita completada sin solicitud muestra `Solicitar reseña`.
- Tras solicitar, Agenda muestra `Reseña solicitada`; una completada muestra `Reseña recibida`.
- Agenda: `Registrar pago` permite efectivo/tarjeta/transferencia/otro y anticipo parcial.
- Reserva pública: si Mercado Pago está conectado y pagos online activos, el botón abre Checkout Pro.
- Webhook válido actualiza `customer_payments.status` a `paid`.
- Firma inválida devuelve 401.
- Un importe distinto al esperado marca `review_required`.

## Seguridad

- Los access tokens de Mercado Pago permanecen en `business_payment_secrets`.
- El navegador nunca recibe el access token de Mercado Pago.
- `mp-customer-checkout` valida el `access_token` propio de la cita.
- `mp-webhook` valida la firma Mercado Pago antes de consultar/actualizar el pago.
- RLS de `customer_payments` continúa siendo lectura para miembros; el registro manual se hace por RPC SECURITY DEFINER.

## Rollback

`supabase/D2_ROLLBACK_SAFE.sql` desactiva pagos online y retira el RPC manual sin borrar historial.
