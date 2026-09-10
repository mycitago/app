MyCitaGo R3 · Reserva profesional

OBJETIVO
- Recuperar el estilo profesional anterior de Horario, Datos y Confirmación.
- Conservar reseñas, galería, Recomendar y branding publicado.
- Permitir personalización segura desde Mi página.

ARCHIVOS A SUBIR
reservar.html
css/booking-public-fix.css
js/public-branding.js
admin/mi-pagina.html
js/admin-branding.js
css/admin-branding-r3-addon.css

NO TOCAR
js/app.js
js/services.js
Supabase / SQL

NUEVAS OPCIONES EN MI PÁGINA
- Tarjetas: Suaves / Con borde / Elevadas
- Horarios: Moderno / Suave / Compacto
- Densidad: Cómoda / Compacta

IMPORTANTE
Estas opciones se guardan dentro de draft_config/published_config JSON.
No requieren columnas SQL nuevas.

PRUEBA
1) Sube los 6 archivos.
2) Abre:
   https://mycitago.github.io/app/reservar.html?n=clinica&v=20260910-r3
3) Selecciona un servicio.
4) La pantalla de fecha/hora debe mostrar tarjetas de fecha redondeadas y horarios modernos.
5) En admin/mi-pagina.html cambia “Horarios” o “Tarjetas”, pulsa Guardar borrador y Publicar cambios.
6) Recarga la reserva con ?v=20260910-r3.
