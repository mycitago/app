MYCITAGO — FIX 2 REPORTES + IVA

CAUSA QUE ESTAMOS ELIMINANDO:
La carga anterior era de tipo "todo o nada": si fallaba citas, gastos o reseñas, no se renderizaba nada.
Además, el HTML cargaba admin-accounting.js sin versión, por lo que el navegador podía conservar una copia anterior.

ESTE PAQUETE:
- Carga citas, gastos, reseñas, servicios y control fiscal de manera independiente.
- Si falla una fuente, las demás sí se muestran.
- El estado superior indica qué fuente falló.
- Elimina relaciones embebidas de appointments.
- Fuerza carga del JS nuevo con ?v=20260909-reportfix2.
- IVA activado por defecto al 16%.
- Puede desactivarse por venta.
- Con IVA activo, el precio de la cita se trata como TOTAL IVA INCLUIDO; subtotal = total / 1.16.
- Si se desactiva: subtotal = total e IVA = 0.

ORDEN:
1. Ejecutar sql/ALTER_SALES_IVA.sql en Supabase.
2. Reemplazar admin/contabilidad.html
3. Reemplazar js/admin-accounting.js
4. Reemplazar css/admin-reports.css
5. Abrir:
https://mycitago.github.io/app/admin/contabilidad.html?v=20260909-reportfix2

Si sale "Datos cargados parcialmente", el mismo mensaje indicará la fuente exacta que no tiene acceso.
