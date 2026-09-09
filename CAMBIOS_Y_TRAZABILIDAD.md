# Dashboard — Fecha operativa única del negocio

## Hallazgo que resolvió la discrepancia de “Atrasadas”
La tarjeta no viene del HTML estático. Se genera en `js/dashboard-v3.js`, función `ensureLateKpi()`, y su valor/estado se calcula en `renderLateKpi()` / `lateAppointments()`.

## Archivos tocados por el instalador
- `js/admin-dashboard-pro.js`
  - Helpers de fecha operativa.
  - `setDates()`.
  - `renderBusinessHealth()`.
  - `renderKPIs()`.
  - `renderToday()`.
  - `renderUpcoming()`.
- `js/dashboard-v3.js`
  - `pendingCount()`.
  - Nuevo `setLateKpiVisualState()`.
  - `renderLateKpi()`.
- `admin/index.html`
  - Icono de “Por confirmar”: `circle-check-big` → `clock-3`.
- `css/citago-v3.css`
  - La tarjeta “Atrasadas” deja de ser roja cuando falta configuración.
  - Rojo queda reservado para atraso real.

## Comportamiento nuevo
1. La fecha operativa proviene de `DashboardPunctuality.businessNowParts()` usando `dashState.dashboardTimezone`.
2. Citas hoy, Por confirmar, próximas citas e ingresos del mes usan el mismo `dateKey`/mes del negocio.
3. Sin timezone:
   - KPI dependientes de fecha muestran `—`.
   - Agenda y próximas citas explican que falta timezone.
   - El badge de pendientes se oculta en vez de publicar un número basado en la zona del dispositivo.
4. La zona horaria entra al porcentaje de completitud del negocio.
5. “Atrasadas” usa:
   - configuración pendiente: icono `settings`, tono neutro;
   - 0 atrasadas: icono `clock-3`, tono informativo;
   - 1+ atrasadas: `triangle-alert`, tono rojo.

## Reversión
El instalador crea `_backup_DASHBOARD_FECHA_OPERATIVA_<timestamp>/` antes de escribir.
Para revertir, restaura únicamente estos 4 archivos desde ese backup.
