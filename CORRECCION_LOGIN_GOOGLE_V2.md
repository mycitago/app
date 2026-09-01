# Corrección Login Google V2

Esta versión corrige el callback OAuth de Google sin cambios SQL.

Cambios:
- `js/oauth-login-flow.js`: timeout inicia antes de cualquier consulta de sesión; `getSession()` ya no puede bloquear el flujo; errores OAuth reales se extraen de hash/query; limpieza de `oauth`, `invite`, `view`, errores y hash.
- `js/supabase.js`: `flowType: 'implicit'`, `detectSessionInUrl: true`, persistencia y auto-refresh explícitos.
- HTML: SDK Supabase fijado a `@supabase/supabase-js@2.45.4` para evitar cambios silenciosos del flujo OAuth.
- `admin/login.html`: muestra errores reales de Google/cancelación y usa un timeout de restauración de sesión de 8 segundos.
- Tests: cobertura de callback tardío, `getSession()` colgado, error OAuth, limpieza de URL, invite y configuración del SDK.

No ejecutar nada de este documento en Supabase SQL Editor.
