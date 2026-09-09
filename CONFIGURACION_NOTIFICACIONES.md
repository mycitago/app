# Configuración C3/C4/C5

Orden: C3 core → C3 alertas → C4 SQL → C5 SQL → C4 frontend → desplegar Edge Function.

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DISPATCHER_SECRET`, `NOTIFICATION_WEBHOOK_URL`; opcional `NOTIFICATION_WEBHOOK_TOKEN`.

Configura correo de alertas:
```sql
update public.platform_notification_settings set alert_email='TU_CORREO@DOMINIO.COM',updated_at=now() where id=true;
```

C5 usa 7,3,1 días por defecto y NO suspende automáticamente.
