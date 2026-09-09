# MyCitaGo — Candado de giro en Servicios

## Reemplazar
Sube estos dos archivos completos, conservando las rutas:

- `js/admin-services.js`
- `css/admin-services.css`

## Qué cambia
- El selector "Tipo de negocio" queda bloqueado al `business_category_id` real del negocio.
- `renderServiceTemplates()` ignora intentos de pedir plantillas de otro giro.
- `applyServiceTemplate()` rechaza plantillas incompatibles.
- La creación masiva rechaza lotes con plantillas incompatibles.
- El guardado manual rechaza categorías que no correspondan al giro.
- Los servicios históricos incompatibles NO se borran automáticamente.
- En "Mis servicios" quedan marcados con "Servicio de otro giro · requiere revisión".
- Si existen incompatibles activos aparece el botón "Ocultar incompatibles (N)".
  Este botón solo cambia `active=false`; NO elimina registros.

## Importante
La compatibilidad histórica se determina usando la columna `services.category`, porque
el esquema actual no guarda el giro de origen de cada servicio. Algunas categorías son
compartidas por varios giros (por ejemplo "Consultas"), por lo que esos casos no pueden
atribuirse con certeza a un giro histórico distinto sin agregar una columna nueva.
Este paquete no modifica la base de datos.

## No toca
- Supabase/RLS/esquema
- HTML
- shell
- otras páginas
- servicios existentes mediante borrado automático

## Pruebas realizadas antes de entregar
- Test RED contra los archivos anteriores: falló por ausencia del candado.
- Test GREEN contra los archivos finales: pasó.
- `node --check js/admin-services.js`: pasó.
- Llaves CSS balanceadas: sí.

## Verificación después de subir
1. Abre `https://mycitago.github.io/app/admin/servicios.html?v=20260909-5`.
2. Comprueba que "Tipo de negocio" está bloqueado y muestra el giro real.
3. En Barbería deben aparecer únicamente plantillas de Barbería.
4. Desde consola, intentar `renderServiceTemplates('dental')` debe seguir mostrando Barbería.
5. En "Mis servicios", los registros incompatibles deben mostrar advertencia.
6. Usa "Ocultar incompatibles" solo si deseas retirarlos del catálogo público sin borrarlos.
7. Recarga y confirma que permanecen visibles en admin como "Oculto", pero ya no activos.
