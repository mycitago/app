# MyCitaGo — Ventas + control fiscal

Archivos incluidos:
1. `sql/SQL_SALES_FISCAL.sql` — ejecutar primero en Supabase SQL Editor.
2. `admin/contabilidad.html` — reemplazar el archivo actual.
3. `js/admin-accounting.js` — reemplazar el archivo actual.
4. `css/admin-reports.css` — reemplazar el archivo actual.

Importante:
- El módulo registra control administrativo y datos relacionados con facturación.
- NO genera, timbra ni valida CFDI ante SAT.
- El estado "Facturada" exige capturar UUID en la interfaz, pero el UUID no se valida contra SAT.
- Se mantiene separación por `business_id` mediante RLS.
- Antes de ejecutar el SQL, confirma que tu tabla de membresías se llama `business_members` y usa columnas `business_id` y `user_id`. Si tu esquema usa otro nombre, adapta las políticas RLS.
