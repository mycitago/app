# Cambios del panel MyCitaGo

- Interfaz administrativa fija en modo claro; se eliminó el selector nocturno.
- Barra superior nueva con **Compartir** y **Nueva cita**.
- **Compartir** genera el enlace público del negocio, permite copiarlo y abrir WhatsApp con el mensaje listo. No usa API de pago.
- **Nueva cita** abre un modal administrativo y crea la cita mediante `create_appointment`; ya no abre la página pública.
- Menú de usuario renovado con acceso a página pública, configuración, ayuda y cerrar sesión.
- Reseñas de Google rediseñadas con tarjeta de estado, botón moderno, selector de ubicación y mensajes de diagnóstico claros.
- Si las Edge Functions de Google no están desplegadas, la UI ahora lo informa explícitamente en lugar de mostrar sólo `Failed to send a request to the Edge Function`.
- Instrucciones de despliegue: `CONFIGURAR_GOOGLE_BUSINESS_PROFILE.md`.
