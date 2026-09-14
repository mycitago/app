# Growth Promotions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar promociones reales, enlaces rastreables y segmentación CRM sin incluir pagos.

**Architecture:** El panel administra `business_promotions`; el booking consulta `get_public_promotion` y crea la cita con `create_appointment_v3`. Utilidades puras concentran validación, cálculo, URLs y segmentación para poder probarlas con Node.

**Tech Stack:** HTML/CSS/JavaScript vanilla, Supabase/PostgreSQL, Node.js para pruebas.

**Spec:** `docs/superpowers/specs/2026-09-14-growth-promotions-design.md`

## Global Constraints
- No modificar D2 Mercado Pago.
- No confiar en precio/discount calculado por frontend.
- Solo segmentar clientes con `marketing_opt_in=true`.
- No hacer envío masivo automático.

---

### Task 1: Utilidades de promociones
- [x] RED: crear `tests/growth-promotion-utils.test.js` antes de implementación.
- [x] Ejecutar y confirmar fallo por módulo faltante.
- [x] GREEN: crear `js/growth-promotion-utils.js`.
- [x] Ejecutar test y confirmar PASS.

### Task 2: Panel Crecimiento
- [x] Reemplazar `admin/crecimiento.html` con panel unificado.
- [x] Reemplazar `js/admin-growth.js` con servicios, promociones, CRM y métricas.
- [x] Actualizar `css/growth.css`.
- [x] Verificar sintaxis JavaScript.

### Task 3: Booking público
- [x] Preparar `js/public-promotion.js`.
- [x] Preparar `PATCH_RESERVAR.txt` para activar el script después de `app.js`.
- [x] Verificar sintaxis JavaScript.

### Task 4: Validación de backend
- [x] Confirmar `business_promotions`.
- [x] Confirmar `get_public_promotion`.
- [x] Confirmar `create_appointment_v3`.
- [x] Confirmar `track_booking_source`.
- [x] Confirmar `customer_crm.segment` y `marketing_opt_in`.
- [x] Verificación final y empaquetado.
