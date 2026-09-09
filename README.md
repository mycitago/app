# MyCitaGo — Corrección banner + reseñas públicas

## Problemas corregidos
1. El banner/portada ocupa demasiado espacio y empuja los servicios hacia abajo.
2. Las reseñas no aparecen aunque exista el módulo de reseñas verificadas.

## Causa de reseñas
`app.js` tiene su propia función local `loadPublicReviews()` que consulta solo Google.
El archivo `public-reviews-verified.js` intenta reemplazar `window.loadPublicReviews`,
pero esa sustitución no afecta la función local ya definida dentro de `app.js`.

Este paquete carga las reseñas de forma independiente y segura:
- primero `public_business_reviews_verified` por business_id;
- si no hay datos o no existe, prueba `public_business_reviews` por slug.

## Subir a GitHub
Reemplazar:
- `reservar.html`

Agregar:
- `css/booking-public-fix.css`
- `js/booking-public-fix.js`

No es necesario modificar Supabase para este bloque.

## Resultado esperado
- Portada compacta.
- Servicios visibles mucho antes.
- Reseñas aparecen ANTES de los servicios cuando existen.
- Badge `Cliente verificado` para reseñas MyCitaGo verificadas.
- Badge `Google` para reseñas de Google.

## Probar
https://mycitago.github.io/app/reservar.html?n=clinica&v=20260909-publicfix1
