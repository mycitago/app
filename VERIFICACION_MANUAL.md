# Pruebas manuales obligatorias

## Escenario 1 — negocio con timezone configurada
1. Abrir `admin/index.html`.
2. Confirmar que el aviso de timezone NO aparece.
3. Comparar la fecha del encabezado con la zona configurada de la sucursal.
4. Confirmar que Citas hoy y Agenda de hoy corresponden al mismo día.
5. Confirmar que Por confirmar no incluye reservas anteriores al día operativo.
6. Confirmar que Ingresos del mes usa el mes de la sucursal.
7. Confirmar que Atrasadas muestra rojo únicamente si existe una cita realmente atrasada.

## Escenario 2 — negocio sin timezone
1. Quitar temporalmente timezone solo en un negocio de prueba.
2. Recargar dashboard.
3. Confirmar aviso “Configura la zona horaria”.
4. Confirmar Citas hoy = `—`.
5. Confirmar Por confirmar = `—`.
6. Confirmar Ingresos del mes = `—`.
7. Confirmar Agenda y Próximas citas explican que falta timezone.
8. Confirmar Estado del negocio ya NO puede mostrar 100%.
9. Confirmar Atrasadas usa estado neutro/configuración, no alarma roja.

## Escenario 3 — dispositivo en otra zona horaria
1. Mantener timezone del negocio configurada.
2. Cambiar temporalmente la zona horaria del sistema/navegador a una zona con fecha distinta.
3. Recargar.
4. Confirmar que encabezado, Citas hoy, Agenda, Próximas, Ingresos y Atrasadas siguen usando la fecha del negocio.

## URL pública
Después de subir los archivos, probar con:
`https://mycitago.github.io/app/admin/index.html?v=<timestamp>`
