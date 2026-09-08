# A3 / ROOT-08 solamente
Refuerza tres mutaciones existentes en `js/admin-services.js` agregando `business_id = biz.id` además del ID del registro:
- activar/ocultar servicio (`toggleService`)
- actualizar servicio existente (`saveService`)
- eliminar bloqueo (`deleteBlock`)

Las lecturas y varias operaciones masivas del archivo actual ya usan `business_id`; A3 corrige únicamente estas tres rutas confirmadas.

No toca A1, A2, shell, CSS, SQL ni RLS. El instalador valida las tres coincidencias antes de escribir y crea `_backup_A3_FECHA_HORA`.
