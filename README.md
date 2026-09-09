# MyCitaGo — Fix de guardado de reseña

La captura demuestra que el enlace ya funciona:
- token válido
- negocio identificado
- servicio identificado
- cita identificada como completada

El fallo ocurre al guardar la reseña.

## 1. Supabase
Ejecuta:
`sql/FIX_GUARDAR_RESENA.sql`

Luego:
`sql/VERIFY_GUARDAR_RESENA.sql`

## 2. GitHub
Reemplaza:
`js/public-review.js`

Con este JS, si aún existe un error del backend, la página mostrará el mensaje real de Supabase en lugar del texto genérico.

## 3. Probar
Genera un NUEVO enlace desde Agenda y prueba una reseña.

Se mantienen separados:
- internal = MyCitaGo / Cliente verificado
- google = Google Business Profile
