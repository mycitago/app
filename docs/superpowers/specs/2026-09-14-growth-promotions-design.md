# Crecimiento + Promociones Design

Fecha: 2026-09-14

## Objetivo
Convertir el módulo Crecimiento en una herramienta comercial real, sin pagos, conectada con servicios, promociones, CRM y reservas.

## Alcance aprobado
- Crear promociones sobre servicios reales.
- Descuento porcentual o fijo con vigencia.
- Mostrar precio original/final antes de crear.
- Generar enlace medible con `src` y `promo`.
- Compartir promoción por WhatsApp y generar imagen.
- Medir reservas por canal y promoción.
- Filtrar audiencia CRM solo entre clientes con `marketing_opt_in=true`.
- Mantener D2 Mercado Pago fuera del bloque.

## Arquitectura
`business_promotions` sigue siendo la fuente de promociones. `get_public_promotion` valida la promoción pública y `create_appointment_v3` aplica el descuento en servidor. El frontend de crecimiento solo crea/administra promociones permitidas por `growth_links`; el booking público muestra la oferta y usa v3 únicamente cuando servicio y promoción coinciden.

## Seguridad
No se confía en el precio calculado por JavaScript. El precio final se recalcula en PostgreSQL. El CRM no hace envíos masivos automáticos y excluye contactos sin consentimiento de marketing.
