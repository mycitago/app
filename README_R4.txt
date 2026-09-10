R4 consolidado:
- reservar.html carga solo css/booking-adaptive.css.
- La vista previa de Mi página es la misma reservar.html dentro de un iframe.
- Contraste texto/fondo se corrige automáticamente a mínimo 4.5:1.
- Texto de botones se adapta al color principal.
- Hero usa overlay para legibilidad.
- Reseñas están contenidas; no flotan sobre servicios.
- Fechas, horarios y CTA recuperan estilo moderno.
- No agrega una plantilla paralela.

Subir estos 6 archivos:
reservar.html
css/booking-adaptive.css
js/public-branding.js
admin/mi-pagina.html
js/admin-branding.js
css/admin-branding.css

Después de verificar R4, borrar del repo:
css/booking-public-fix.css
css/public-reviews.css
css/admin-branding-r3-addon.css

Prueba:
https://mycitago.github.io/app/reservar.html?n=clinica&v=20260910-r4
