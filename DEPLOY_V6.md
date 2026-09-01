# MyCitaGo V6 — orden de publicación

## 1. Supabase
La migración V6 ya fue validada dos veces en el proyecto real. El archivo oficial es `SUPABASE_V6_MASTER.sql`.

No vuelvas a ejecutar migraciones históricas como `APLICAR_EN_SUPABASE.sql`.

## 2. GitHub
Sube **el contenido** del ZIP a la raíz del repositorio `mycitago/app` (no el ZIP como archivo).

GitHub Pages debe permanecer en:
- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`

El paquete V6 no incluye un workflow personalizado de Pages.

Si el repositorio todavía conserva archivos viejos de versiones anteriores, elimina manualmente:
- `APLICAR_EN_SUPABASE.sql`
- `js/oauth-login-flow.js`

El login V6 no depende del segundo archivo; su flujo Google está contenido en `admin/login.html`.

## 3. Verificación mínima después del deploy
Prueba en incógnito:
1. `admin/login.html`: botón Google debe navegar inmediatamente.
2. `admin/agenda.html`: debe cargar sin errores de `branch_id` ni `business_staff`.
3. `admin/equipo.html`: alta/edición debe trabajar con `staff` y `service_staff`.
4. `admin/sucursales.html`: debe leer `business_branches`.
5. `admin/contabilidad.html`: debe cargar sin `#biz-name`/`#btn-logout` y usar `price_charged`.
6. `admin/resenas.html`: mientras GBP no esté desplegado, debe mostrar “Integración no configurada” y no llamar Edge Functions.
7. `reservar.html?n=<slug>`: reserva pública normal.

## 4. Verificador local incluido
Con Python instalado, desde la raíz del proyecto:

```bash
python tools/verify-v6.py
```

También puedes ejecutar las pruebas de contratos:

```bash
node --test tests/*.test.mjs
```
