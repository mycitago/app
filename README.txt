MyCitaGo Platform — Super Admin Redesign

SUBIR / REEMPLAZAR
1) admin/plataforma.html
2) css/admin-platform.css

NO HAY SQL NI RPC NUEVO.

IMPORTANTE
- El frontend actual ya obtiene businesses/subs/plans/payments/incidents mediante platform_dashboard_snapshot.
- Las variaciones históricas de MRR/negocios NO se inventan. La UI muestra “historial no disponible”.
- Riesgo usa el filtro real `risk` que ya existe en el portal.
- Los pagos de 3/6/12 meses se calculan únicamente a partir de `platformState.payments`.
- OXXO/SPEI/Tarjeta se muestran “No conectado”. No se declara ningún proveedor conectado.
- El pie duplicado del sidebar generado por citago-shell.js se limpia al montar y conserva solo “Abrir panel negocio”.

VERIFICAR DESPUÉS DE SUBIR
https://mycitago.github.io/app/admin/plataforma.html#resumen

Pruebas:
- Resumen en desktop y móvil.
- Clic en Riesgo filtra Negocios por “En riesgo”.
- Selector 3/6/12 cambia la gráfica.
- Botones Configurar de métodos de cobro informan que falta proveedor.
- Tema claro y oscuro.
