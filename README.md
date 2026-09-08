# MyCitaGo — Paquete consolidado de estabilización

Este paquete se preparó contra el estado actual de `mycitago/app` en la rama `main`.

## Incluye

- **A1 / ROOT-01:** un error técnico consultando `subscriptions` ya no se convierte en “Suscripción vencida”.
- **A2 / ROOT-04/05:** Agenda, Clientes, Equipo y Sucursales distinguen mejor error técnico de estado vacío.
- **A3 / ROOT-08:** mutaciones sensibles de Servicios agregan `business_id` además del `id`.
- **D / ROOT-09:** elimina importes hardcodeados presentados como precios sugeridos.
- **G / ROOT-11:** elimina tipografía funcional de 8–9 px en Reportes.
- **C1 seguro:** mejora legibilidad del shell base sin crear V4.

## Lo que deliberadamente NO hace automáticamente

No elimina `citago-shell-v3.js` ni `citago-v3.css`: hoy contienen tema claro/oscuro y sidebar contraíble. Quitarlos de golpe rompería funciones visibles. La consolidación física definitiva de V3 debe hacerse después de una prueba visual autenticada.

No toca RLS, SQL, Edge Functions, cobros ni tablas.

## Cómo aplicar

1. Descomprime este paquete dentro de la carpeta raíz de tu repo `app`.
2. Ejecuta:
   `python APLICAR_ESTABILIZACION.py`
3. Revisa la carpeta `_backup_pre_estabilizacion_FECHA_HORA`.
4. Ejecuta las pruebas de `VERIFICACION.md`.
5. Solo después sube los archivos modificados a GitHub.

El instalador se detiene si no reconoce un bloque crítico del código actual, para evitar aplicar un parche sobre una versión distinta.
