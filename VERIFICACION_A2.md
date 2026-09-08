# Pruebas manuales A2

## Agenda
1. Abrir Agenda con conexión normal y citas existentes: deben mostrarse normalmente.
2. Cambiar a un periodo sin citas: debe decir `No hay citas para esta vista`.
3. Simular error/bloqueo de la consulta `appointments`.
4. Los KPIs deben mostrar `—`, no `0`.
5. Debe aparecer `No pudimos cargar la agenda` + `Reintentar`.

## Clientes
1. Abrir Clientes normalmente.
2. Si el negocio no tiene clientes, conservar el estado vacío normal.
3. Simular fallo de `customer_crm`.
4. KPIs deben mostrar `—`.
5. Debe aparecer `No pudimos cargar tus clientes` + `Reintentar`.

## Equipo
1. Abrir Equipo normalmente.
2. Simular fallo de una consulta del módulo.
3. Debe decir `No pudimos cargar el equipo`.
4. NO debe decir `Ejecuta SUPABASE_V6_MASTER.sql`.

## Sucursales
1. Negocio sin sucursales: debe decir `Aún no hay sucursales`.
2. Simular fallo de consulta: debe decir `No pudimos cargar las sucursales`.
3. El error técnico NO debe presentarse como falta de migración.

## Regresión
- Crear/editar equipo sigue funcionando.
- Crear/editar sucursal sigue funcionando.
- Filtros y vistas de Agenda siguen funcionando.
- Clientes conserva búsqueda/segmentos.
