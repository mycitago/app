# Verificación A1 / ROOT-01

## Escenario 1 — Suscripción activa o trial
1. Abre el panel con un negocio cuya suscripción esté en `active` o `trial`.
2. Confirma que el panel carga normalmente.
3. Confirma que NO aparece ningún mensaje de error ni paywall.

## Escenario 2 — Fallo técnico al consultar subscriptions
1. Simula un fallo de red o bloquea temporalmente la petición a Supabase.
2. Recarga una página del panel que ejecute `getMyBusiness()`.
3. Debe aparecer: `No pudimos verificar tu suscripción`.
4. Debe existir botón `Reintentar`.
5. NO debe aparecer `Suscripción vencida`.

## Escenario 3 — Suscripción realmente vencida
1. Usa un negocio de prueba con status fuera de `trial/active`, o con periodo vencido.
2. Recarga el panel.
3. Debe seguir apareciendo `Suscripción vencida`.
4. Confirma que este caso no fue afectado por la corrección técnica.

## Nota
`showAccessLoadError()` reemplaza `document.body.innerHTML`, igual que el paywall actual. Esto mantiene consistencia con la arquitectura existente. La mejora para preservar estado de formularios debe tratarse como otro bloque separado, no mezclarse en A1.
