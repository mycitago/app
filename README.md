# MyCitaGo — A1 / ROOT-01 solamente

Este paquete corrige exclusivamente el fallo crítico de suscripción detectado en `js/admin-auth.js`.

## Problema corregido

Antes, `getMySubscription()` ignoraba el error de Supabase y devolvía `null`. Luego `subscriptionExpired(null)` lo interpretaba como suscripción vencida y mostraba el paywall aunque el problema real fuera de red/backend.

## Qué cambia

1. `getMySubscription()` devuelve `null` solo cuando la consulta fue válida y no existe suscripción.
2. Si Supabase devuelve error, se lanza una excepción técnica con `code = subscription_lookup_failed`.
3. `getMyBusiness()` captura ese error y muestra un estado de carga fallida con botón `Reintentar`.
4. `showPaywall()` solo se ejecuta si la consulta de suscripción terminó correctamente y la suscripción realmente está vencida/inválida.

## Alcance

- Modifica: `js/admin-auth.js`
- NO modifica: A2, A3, C1, D, G
- NO modifica: SQL, RLS, tablas, Edge Functions, CSS ni otros JS
- Crea un backup independiente: `_backup_A1_ROOT01_FECHA_HORA/js/admin-auth.js`

## Aplicación

1. Coloca `APLICAR_A1_SUSCRIPCION.py` en la raíz del repo.
2. Ejecuta: `python APLICAR_A1_SUSCRIPCION.py`
3. Ejecuta únicamente las 3 pruebas de `VERIFICACION_A1.md`.
4. Si pasan, sube `js/admin-auth.js` a GitHub.
