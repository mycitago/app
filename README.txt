MyCitaGo — Rediseño real de reservar.html

SUBIR / REEMPLAZAR
1. reservar.html
2. css/booking-adaptive.css
3. js/public-branding.js
4. js/app.js

NO TOCAR
- Supabase / SQL / RLS
- RPCs de disponibilidad
- appointments.js
- services.js

CAMBIOS
- Desaparece la cuadrícula de 3 columnas tipo dashboard.
- Hero en 3 zonas de flujo normal; sin superposición.
- Servicios uniformes y flujo centrado.
- Reseñas y galería debajo del flujo.
- Galería = fotos reales únicamente; no repite tarjetas.
- CTA sticky solo en móvil; CTA dentro del resumen en desktop.
- Todos los componentes consumen tokens semánticos.
- `--text`, `--hero-text` y `--brand-contrast` se calculan automáticamente.
- El color de texto manual ya no puede producir una combinación ilegible.

PRUEBA
https://mycitago.github.io/app/reservar.html?n=clinica&v=20260910-redesign
