from pathlib import Path
import sys
R=Path(__file__).resolve().parents[1]
req=['C3/01_C3_NOTIFICATION_CORE.sql','C3/02_C3_ALERTAS.sql','C3/supabase/functions/platform-notification-dispatcher/index.ts','C4/03_C4_SOPORTE.sql','C4/APLICAR_C4_FRONTEND.py','C5/04_C5_RECORDATORIOS.sql','VERIFICACION_C3_C4_C5.sql','CONFIGURACION_NOTIFICACIONES.md']
missing=[x for x in req if not (R/x).exists()]
if missing: print('missing',missing);sys.exit(1)
checks={'C3/01_C3_NOTIFICATION_CORE.sql':['platform_notification_outbox','platform_operational_alerts','platform_claim_notification_batch','platform_complete_notification'],'C3/02_C3_ALERTAS.sql':['platform_collect_operational_alerts','platform_queue_daily_alert_digest','payment_failed_repeated','ticket_unanswered','integration_error'],'C3/supabase/functions/platform-notification-dispatcher/index.ts':['NOTIFICATION_WEBHOOK_URL','DISPATCHER_SECRET','platform_queue_billing_reminders'],'C4/03_C4_SOPORTE.sql':['platform_read_support_v2','platform_update_support_ticket','p_priority','p_assigned_to'],'C5/04_C5_RECORDATORIOS.sql':['platform_queue_billing_reminders','billing_reminder_days','current_period_end']}
for f,toks in checks.items():
 txt=(R/f).read_text(encoding='utf-8')
 for t in toks:
  if t not in txt: print('missing token',f,t);sys.exit(2)
print('PASS package contract')
