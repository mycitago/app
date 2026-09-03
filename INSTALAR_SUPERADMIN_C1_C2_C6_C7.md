# MyCitaGo Super Admin · C1 + C2 + C6 + C7

## Qué incluye

- C1: búsqueda por nombre/correo/teléfono/slug + filtro de estado + orden por alta, vencimiento y nombre.
- C2: selección múltiple y acciones `Suspender seleccionados` / `Reactivar seleccionados`.
- C6: exportación CSV en Negocios, Pagos y Auditoría.
- C7: estado explícito de categorías sin plantillas, cambios de giro accionables y detalle de negocio con pagos + soporte.

## Seguridad de C2

La seguridad NO depende de `platform-api.js` ni de ocultar botones. Los nuevos RPC:

- `platform_bulk_suspend(uuid[])`
- `platform_bulk_reactivate(uuid[], integer)`

son `SECURITY DEFINER`, fijan `search_path = public, pg_temp`, validan `public.is_platform_admin(auth.uid())` internamente y revocan ejecución a `public`.

Cada negocio procesado ejecuta su propio `INSERT` en `audit_logs`. Una acción sobre 5 negocios deja 5 filas de auditoría.

## Instalación

1. Sube/reemplaza el contenido completo del ZIP en GitHub Pages.
2. En Supabase > SQL Editor ejecuta únicamente:

   `sql/platform_bulk_operations.sql`

3. Recarga `admin/plataforma.html` con Ctrl+F5.

No ejecutes de nuevo `SUPABASE_V6_MASTER.sql`. Esta entrega es aditiva y ese archivo no fue modificado.

## Prueba obligatoria antes de usar acciones en lote en producción

### A. Super Admin legítimo

En la consola del navegador, autenticado como Super Admin:

```js
await supabaseClient.rpc('platform_bulk_suspend', { p_business_ids: [] })
```

Resultado esperado: `data.processed = 0` y `error = null`. La lista vacía no modifica nada.

### B. Usuario NO Super Admin

En una sesión normal (NO creador), ejecuta exactamente la misma llamada:

```js
await supabaseClient.rpc('platform_bulk_suspend', { p_business_ids: [] })
```

Resultado esperado: sin datos y error PostgreSQL `42501` / `forbidden`. Si devolviera `processed: 0`, NO uses las acciones en lote y revisa la migración.

### C. Confirmar también el candado del RPC individual sin tocar un negocio real

Con el usuario NO Super Admin:

```js
await supabaseClient.rpc('suspend_business', {
  p_business_id: '00000000-0000-0000-0000-000000000000'
})
```

Resultado esperado: `forbidden`. Como la autorización se evalúa antes de buscar el negocio, no existe riesgo de suspender un negocio real.

## Auditoría por fila

Después de probar una acción real de lote sobre, por ejemplo, 5 negocios, verifica:

```sql
select business_id, action, entity_id, created_at, metadata
from public.audit_logs
where action in ('business_suspended','business_reactivated')
order by created_at desc
limit 20;
```

Deben existir filas independientes por `business_id`. La metadata de esta entrega usa `source = super_admin_bulk`.

## Archivos principales modificados

- `admin/plataforma.html`
- `js/admin-platform.js`
- `js/platform-api.js`
- `css/admin-platform.css`
- `sql/platform_bulk_operations.sql`

Pruebas nuevas:

- `tests/platform-bulk-security.test.mjs`
- `tests/platform-business-operations.test.mjs`
- `tests/platform-csv-export.test.mjs`
- `tests/platform-c7-completeness.test.mjs`
