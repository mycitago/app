MyCitaGo — Fix botón Confirmar por WhatsApp

CAUSA:
El botón #btn-whatsapp existía en reservar.html y appointments.js ya tenía
buildWhatsappConfirmationUrl(), pero renderSuccess() nunca asignaba la URL
al atributo href. Por eso el botón se veía correcto y no hacía nada.

SUBIR:
js/app.js

NO SE MODIFICA:
- reservar.html
- CSS
- Supabase
- RPC create_appointment
- appointments.js
- servicios / reseñas

PRUEBA:
1. Crear una cita.
2. Llegar a Paso 4.
3. Pulsar “Confirmar por WhatsApp”.
4. Debe abrir wa.me con negocio, servicio, fecha, hora y precio.
