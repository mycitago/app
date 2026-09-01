# Corrección Login Google — MyCitaGo

Esta versión corrige el flujo OAuth observado cuando Google autentica correctamente y Supabase regresa a `admin/login.html` con una sesión, pero la interfaz permanecía en la pantalla de acceso.

Cambios:
- El login espera a que Supabase termine de restaurar la sesión OAuth antes de decidir si existe usuario.
- Los usuarios con membresía activa entran a `admin/index.html`.
- Los Platform Admin entran a `admin/plataforma.html`.
- Los usuarios Google nuevos sin negocio pasan a completar su negocio.
- Un login normal ya no reutiliza invitaciones antiguas guardadas en localStorage.
- Sólo se procesa una invitación cuando el callback actual contiene `invite=`.
- Los tokens OAuth se eliminan de la barra de direcciones después de restaurar la sesión.
- Se muestra un mensaje explícito si Google autenticó pero la sesión no pudo restaurarse dentro del tiempo de espera.

No requiere cambios SQL ni volver a configurar Google Cloud si el proveedor Google de Supabase ya está habilitado y el callback está autorizado.
