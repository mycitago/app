# Instalación — Super Admin con RPC seguro

Esta entrega elimina las seis lecturas administrativas sensibles que `admin/plataforma.html` hacía directamente desde el navegador.

## 1. Aplicar la migración aditiva

En Supabase SQL Editor ejecuta únicamente:

`sql/platform_read_api.sql`

No vuelvas a ejecutar ni modifiques `SUPABASE_V6_MASTER.sql` para esta corrección.

La migración crea exactamente seis RPC de lectura:

- `platform_read_support()`
- `platform_read_service_templates()`
- `platform_read_business_categories()`
- `platform_read_business_invites()`
- `platform_read_category_change_requests()`
- `platform_read_audit_logs()`

Cada RPC es `SECURITY DEFINER`, fija `search_path=public,pg_temp` y valida internamente `public.is_platform_admin(auth.uid())` antes de leer datos. No existe un RPC genérico que reciba nombres de tabla.

## 2. Publicar frontend

Sube el contenido del proyecto a GitHub Pages reemplazando los archivos existentes. Los cambios de frontend relevantes son:

- `js/platform-api.js` (nuevo)
- `js/admin-platform.js`
- `admin/plataforma.html`

`platform-api.js` solo organiza llamadas. No autoriza usuarios; la autorización real está en PostgreSQL.

## 3. Verificación A.4 — Super Admin legítimo

1. Abre una ventana de incógnito.
2. Inicia sesión con el usuario que sí existe en `platform_admins`.
3. Abre `admin/plataforma.html`.
4. DevTools → Network → limpia la lista → Ctrl+F5.
5. Recorre las 9 secciones: Resumen, Negocios, Suscripciones, Soporte, Plantillas, Pagos, Incidencias, Integraciones y Auditoría.
6. No debe quedar ningún módulo en “Cargando…” ni “No se pudo cargar”.
7. Las llamadas `platform_read_*` deben responder 200 para el Super Admin.

## 4. Prueba negativa — usuario no administrador

Con una cuenta autenticada que NO esté en `platform_admins`, abre la consola del navegador en cualquier página que cargue `supabaseClient` y ejecuta, por ejemplo:

```js
await supabaseClient.rpc('platform_read_audit_logs')
```

El resultado debe contener un error `forbidden` / SQLSTATE `42501` y no debe devolver registros.

Repite si deseas con cualquiera de los otros cinco RPC. La protección se ejecuta dentro de cada función aunque se invoque directamente y sin pasar por `platform-api.js`.

## 5. Verificación SQL de firmas

```sql
select
  to_regprocedure('public.platform_read_support()') as support,
  to_regprocedure('public.platform_read_service_templates()') as templates,
  to_regprocedure('public.platform_read_business_categories()') as categories,
  to_regprocedure('public.platform_read_business_invites()') as invites,
  to_regprocedure('public.platform_read_category_change_requests()') as category_requests,
  to_regprocedure('public.platform_read_audit_logs()') as audit;
```

Las seis columnas deben devolver su firma y ninguna debe ser `null`.
