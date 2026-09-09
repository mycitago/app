MyCitaGo — Fix carga de Reportes

CAUSA PROBABLE AISLADA
La versión nueva de admin-accounting.js agregó esta relación embebida a appointments:
customers(name,full_name)

La versión anterior de Reportes no dependía de esa relación. Si PostgREST no reconoce
esa FK/relación o la columna full_name no existe, falla TODA la consulta de appointments
y el dashboard queda en $0 con "No se pudieron cargar los reportes".

CORRECCIÓN
- Se elimina únicamente el embed customers(name,full_name).
- Se conserva services(id,name).
- No se toca Supabase ni los cálculos existentes.
- El nombre del cliente queda temporalmente como "Cliente" dentro de la tabla fiscal.
- Si otra fuente falla, el toast indicará ahora: citas / gastos / reseñas.

SUBIR A GITHUB
Reemplazar solamente:
js/admin-accounting.js

Después abrir:
https://mycitago.github.io/app/admin/contabilidad.html?v=20260909-reportfix1
