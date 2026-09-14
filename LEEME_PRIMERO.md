# CITAGO D3 / R2 --- Catálogo canónico

El backend D3 ya fue aplicado en el Supabase actual.

## Verificación realizada

-   `get_business_service_templates(uuid)` existe.
-   `SECURITY DEFINER = true`.
-   `search_path = public, pg_temp`.
-   `anon EXECUTE = false`.
-   `authenticated EXECUTE = true`.
-   Prueba con miembro: solo devuelve plantillas activas del giro real.
-   Prueba cross-tenant: negocio ajeno es rechazado.
-   Servicios existentes después de la migración: 17.
-   Suma de precios después de la migración: 4869.00.

La conexión GitHub de esta sesión permite lectura pero rechazó escritura
con 403, por eso el frontend se entrega como paquete controlado para
subir manualmente.

Sube `js/d3-onboarding-canonical.js` y `js/d3-services-canonical.js`, y
después aplica `PATCH_INTEGRACION.md`.

El SQL se incluye como copia reproducible; no lo ejecutes otra vez si
estás usando el mismo proyecto Supabase.

No se tocó D2, D4, R5, Reseñas, Crecimiento ni Google Business.
