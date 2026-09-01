# Instalación — Consolidación MyCitaGo 2026-09-01

## 1. Subir el proyecto
Reemplaza el contenido actual del repositorio `mycitago/app` con el contenido de esta carpeta `app-main/`.

## 2. Aplicar Supabase
En Supabase > SQL Editor ejecuta **una sola vez** el archivo completo:

`APLICAR_EN_SUPABASE.sql`

La migración es aditiva e idempotente. Incluye:
- corrección segura de `business_branding_public` (la VIEW se reconstruye sin borrar `business_branding`),
- `business_branches`,
- `business_staff`,
- `staff_services`,
- `branch_services`,
- `business_invites`,
- `business_category_change_requests`,
- `platform_incidents`,
- `platform_subscription_payments`,
- columnas de sucursal/profesional en `appointments`,
- RPCs de invitación y aprobación de cambio de giro,
- snapshot resiliente de Super Admin.

**No borres la tabla `business_branding`.** El SQL sólo elimina/recrea la VIEW pública cuando hace falta.

## 3. Edge Function de onboarding
Si utilizas Google Login, vuelve a desplegar `supabase/functions/complete-onboarding/` porque ahora también acepta invitaciones creadas por Super Admin.

## 4. Recargar GitHub Pages
Después del deploy usa `Ctrl + F5`.

## 5. Pruebas recomendadas
1. `admin/agenda.html`: cambia Día / 3 días / Semana / Mes / Lista.
2. `admin/mi-pagina.html`: prueba Claro / Oscuro / Personalizado, cambia colores, guarda y publica.
3. Usa `Compartir reservas`: copiar, WhatsApp, correo, QR y abrir página.
4. `admin/equipo.html`: crea una persona y asígnale servicios.
5. `admin/sucursales.html`: verifica la sucursal principal y crea una segunda.
6. `admin/configuracion.html`: verifica que el giro aparezca bloqueado y prueba Solicitar cambio.
7. `admin/plataforma.html`: genera una invitación, cópiala y abre el enlace de registro.
8. Desde Super Admin aprueba/rechaza una solicitud de cambio de giro.

## Comportamiento del giro
El giro queda bloqueado tras confirmarse en onboarding. El propietario sólo puede solicitar un cambio; la modificación real la aprueba un Super Administrador.

## Comportamiento de sucursales
Cada negocio existente recibe una `Sucursal principal` al ejecutar la migración si todavía no tiene una. La plataforma sigue siendo simple para negocios de una sola ubicación y queda preparada para múltiples sucursales.
