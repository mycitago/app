# D2 Modelo Operativo de Cita — Diseño

## Objetivo
Extender la Agenda para mostrar y registrar pago/anticipo y estado de reseña, y completar el cobro público real por Mercado Pago sin duplicar fuentes de verdad.

## Fuentes canónicas
- Cita: `appointments`
- Pago de cliente: `customer_payments`
- Solicitud de reseña: `review_requests`
- Configuración de cobro: `business_payment_settings`
- Conexión Mercado Pago: `business_payment_accounts` + `business_payment_secrets`

## Decisiones
1. No agregar `review_requested` ni columnas de pago a `appointments`.
2. Conservar columnas Stripe históricas en `customer_payments`; agregar campos genéricos Mercado Pago.
3. Checkout público autentica por `appointment_id + appointments.access_token`.
4. Webhook autentica con HMAC-SHA256 de Mercado Pago.
5. Pagos manuales se registran mediante RPC, no escritura directa del navegador.
6. Agenda consolida estados por `appointment_id`.
