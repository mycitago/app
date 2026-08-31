# MyCitaGo — Instalación de la actualización integral

## 1. Publicar frontend
Sube/reemplaza **todo el contenido de esta carpeta `app-main`** en la rama `main` de `mycitago/app`.
No subas el ZIP como un archivo: sube su contenido respetando carpetas y rutas.

Después espera a que GitHub Pages termine `build` y `deploy` y recarga con `Ctrl + F5`.

## 2. Actualizar Supabase
En Supabase → SQL Editor ejecuta **una sola vez** el archivo:

`APLICAR_EN_SUPABASE.sql`

Además de los objetos anteriores, esta versión incorpora:
- `business_categories`
- `service_templates`
- `service_commercial_settings`
- `service_exceptions`
- `service_versions`
- `support_tickets`
- `support_messages`

El SQL mantiene RLS y aislamiento por `business_id`.

## 3. Google Reviews
La integración Google que ya forma parte del proyecto sigue requiriendo secretos únicamente en Supabase Edge Functions. No pongas secretos de Google en GitHub Pages.

Configura en Supabase:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_STATE_SECRET`
- `GOOGLE_REDIRECT_URI`
- `PUBLIC_APP_URL=https://mycitago.github.io/app`

Y despliega las Edge Functions Google incluidas en `supabase/functions/`.

## 4. Pantallas principales para validar
- `/admin/index.html` — dashboard compacto
- `/admin/agenda.html` — agenda semanal
- `/admin/servicios.html` — servicios guiados + plantillas + inteligencia
- `/admin/clientes.html` — CRM
- `/admin/ayuda.html` — soporte al negocio
- `/admin/onboarding.html` — onboarding por giro
- `/admin/mi-pagina.html` — personalización pública
- `/admin/resenas.html` — Google Reviews
- `/admin/contabilidad.html` — reportes/finanzas
- `/admin/plataforma.html` — Centro de Operaciones Super Admin
- `/reservar.html?n=<slug>` — reserva pública
- `/index.html` — landing MyCitaGo

## 5. Flujo nuevo de Servicios
El negocio puede:
1. elegir su giro;
2. seleccionar un servicio precargado;
3. poner precio y duración;
4. heredar horario del negocio o personalizarlo;
5. ver capacidad, ingreso potencial y margen;
6. guardar/publicar;
7. usar ajustes avanzados sólo cuando los necesite.

## 6. Soporte
Los negocios pueden crear tickets desde `Ayuda`. El Super Admin recibe los tickets en `plataforma.html`, puede responder y cambiar su estado.

## 7. Imágenes precargadas
Se incluyen recursos de marca, marketing y servicios en:
- `assets/brand/`
- `assets/marketing/`
- `assets/service-presets/`

## 8. Importante
No renombres variables internas antiguas como `CITAS_CONFIG` sólo por el cambio de marca: son identificadores técnicos y cambiarlos podría romper compatibilidad.
