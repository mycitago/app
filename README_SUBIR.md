# MyCitaGo · Reparación urgente de reservación

## Archivo a reemplazar
Solo:
- `reservar.html`

## Cambio aplicado
- Se eliminó `css/styles.css` de la página de reservación.
- `css/booking-adaptive.css` queda como única fuente visual de la reservación.
- Se agregó `?v=20260909-booking-fix1` a `booking-adaptive.css` y `app.js` para evitar caché vieja.

## No se toca
- `js/appointments.js`
- Supabase
- RPC `create_appointment`
- Servicios
- Horarios
- Branding
- Reseñas

## Verificación
Después de subir:
1. Abrir `https://mycitago.github.io/app/reservar.html?n=clinica&v=20260909-booking-fix1`
2. Elegir un servicio.
3. Pulsar "Elegir fecha y hora".
4. Elegir una fecha disponible.
5. Confirmar que aparecen botones de horarios.
6. Seleccionar un horario.
7. Confirmar que "Continuar con mis datos" se habilita y ya no ocupa todo el ancho de la pantalla.
8. Llegar al formulario de datos.
