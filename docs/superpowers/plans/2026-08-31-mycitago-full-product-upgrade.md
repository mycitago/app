# MyCitaGo Full Product Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert CITAGO into the approved MyCitaGo product experience: unified brand, compact dashboard, guided service setup with templates, support center, preloaded visual content, improved public page, and an operational Super Admin.

**Architecture:** Keep Supabase Auth/RLS/business_id and current booking logic. Add presentation/system tables for templates/support/service commercial settings, use one shared MyCitaGo design system, and preserve server-side boundaries for platform/global operations and Google integration.

**Tech Stack:** Static HTML/CSS/JS on GitHub Pages, Supabase JS/Postgres/RLS/Storage/Edge Functions.

**Spec:** Conversation-approved design based on MyCitaGo reference images and the prior CITAGO redesign spec.

## Global Constraints
- Keep existing multi-tenant RLS/security boundaries.
- Do not expose Google secrets in frontend.
- Work under GitHub Pages `/app/` relative paths.
- Use one visual system across tenant admin, public booking, and platform admin.
- Mobile-first behavior must remain functional.

---

### Task 1: MyCitaGo brand system and assets
- Create brand logo assets derived from user-provided reference.
- Rebrand shared shell and public page from CITAGO to MyCitaGo.
- Add preloaded visual assets for common service categories.
- Verify no broken asset paths.

### Task 2: Compact dashboard
- Remove dashboard whitespace/min-height problem and duplicate floating CTA.
- Move greeting/KPIs above the fold.
- Add health/actions/support summary.
- Verify desktop/mobile layout.

### Task 3: Guided services and presets
- Replace service-first empty form flow with Quick Setup + Advanced.
- Add business-category service templates and preloaded images.
- Add price-triggered guided setup, margin/capacity calculations, validations, staff, schedule inheritance, duplicate/autosave UX.
- Preserve legacy service save contract.

### Task 4: Service data model
- Add service_templates, business_categories, service_commercial_settings, service_exceptions, service_versions.
- Add RLS and seed curated templates.
- Merge migration into APLICAR_EN_SUPABASE.sql.

### Task 5: Support center
- Add tenant Help/Support screen and contextual contact button.
- Add support_tickets/support_messages tables and RLS.
- Add Super Admin support inbox and status workflow.

### Task 6: Super Admin operations center
- Modernize platform overview.
- Add support, template catalog, health/action queues, business drilldown.
- Keep cross-tenant aggregation behind platform RPC.

### Task 7: Onboarding and category presets
- Add guided business category selection and recommended services flow.
- Show completion progress and launch checklist.

### Task 8: Public page and preloaded imagery
- Apply MyCitaGo brand language to public booking while preserving tenant branding.
- Show service images/default images, reviews, staff, and polished mobile booking.

### Task 9: Regression/security verification
- Add contract tests for branding, dashboard layout, service templates, support and platform.
- Run JS syntax checks and structural verification.
- Package full repository plus SQL/install instructions.
