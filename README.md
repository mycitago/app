# MyCitaGo — C2 cierre frontend

Este paquete NO vuelve a crear las RPC. Se aplica después de haber instalado:
- `platform_bulk_suspend(uuid[])`
- `platform_bulk_reactivate(uuid[],integer)`

## Qué corrige
El frontend actual solo mostraba `X negocios procesados`, aunque el backend ya devuelve:
- `processed`
- `failed`
- `results[]`

Ahora:
- informa éxitos y fallos parciales;
- conserva seleccionados los negocios que fallaron para poder reintentar;
- limpia la selección de los que sí terminaron;
- mantiene el manejo de error total existente.

## Archivo modificado
- `js/admin-platform.js`

No toca SQL, RLS, C1 ni otros bloques.
