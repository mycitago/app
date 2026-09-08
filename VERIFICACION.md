# Verificación manual obligatoria

1. **Suscripción activa:** entrar con un negocio activo/trial. Debe abrir el panel normalmente.
2. **Fallo técnico de subscriptions:** simular conexión fallida/bloqueo de red. Debe aparecer “No pudimos verificar tu suscripción” + Reintentar. NO “Suscripción vencida”.
3. **Suscripción realmente vencida:** debe seguir apareciendo el paywall.
4. **Agenda sin citas:** debe mostrar estado vacío real.
5. **Agenda con error de red:** debe mostrar error y Reintentar; los KPIs no deben fingir 0.
6. **Clientes con error:** KPIs deben quedar en “—” y aparecer Reintentar.
7. **Equipo/Sucursales con error:** no debe ordenar ejecutar `SUPABASE_V6_MASTER.sql`.
8. **Servicios:** activar/ocultar un servicio del negocio actual y confirmar que funciona.
9. **Bloqueos:** eliminar un bloqueo del negocio actual y confirmar que funciona.
10. **Plantillas de servicio:** no deben mostrar un precio de mercado inventado como “sugerido”.
11. **Reportes:** revisar desktop y móvil; textos funcionales no deben verse a 8–9 px.
12. **Topbar:** nombre 13 px aprox., rol 11 px, búsqueda 13 px.
13. **Tema:** Claro/Oscuro/Sistema debe seguir funcionando.
14. **Sidebar:** contraer/expandir debe seguir funcionando.
15. **RLS:** no se modificó SQL; confirmar que las pruebas de seguridad existentes siguen pasando.
