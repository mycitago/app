# Corrección de ruido 403 en consola — Super Admin

La aplicación ya carga correctamente el Super Admin y Plantillas. Los objetos repetidos con forma `{httpError:false,httpStatus:200,code:403}` corresponden a una promesa rechazada inyectada por una extensión del navegador, no a una respuesta PostgREST/Supabase del proyecto.

Esta revisión agrega un filtro extremadamente específico que evita que ese rechazo externo contamine la consola del panel. No oculta errores reales de Supabase: los errores PostgREST con `message`, `details` o `hint` siguen visibles.

Archivos modificados/agregados:
- `js/extension-noise.js`
- `admin/plataforma.html`
- `tests/platform-extension-noise.test.mjs`

Para publicar, sube el contenido del proyecto conservando las rutas. No es necesario ejecutar SQL por esta corrección visual/de consola.
