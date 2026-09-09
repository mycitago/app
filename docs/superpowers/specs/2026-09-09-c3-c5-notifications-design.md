# MyCitaGo C3-C5 Notification Operations Design

C3 agrega alertas operativas activas, C4 agrega prioridad/asignación de soporte y C5 agrega recordatorios de cobro previos al vencimiento. PostgreSQL conserva el estado y una outbox auditable; una Edge Function despacha a un webhook configurable y nunca marca como enviado un mensaje que no haya sido aceptado por el transporte. C5 no suspende automáticamente negocios.
