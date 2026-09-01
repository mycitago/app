# MyCitaGo Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one complete MyCitaGo package with agenda views, public-page theme editor, branches/team, locked business category, robust Super Admin, and invitations.

**Architecture:** Extend the existing static GitHub Pages frontend and Supabase backend. Keep shared shell and existing auth/RLS patterns; add additive SQL migrations and small focused JS modules while preserving existing public booking and support flows.

**Tech Stack:** HTML/CSS/JavaScript, Supabase Auth/Postgres/RLS/Edge Functions, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-09-01-mycitago-consolidation.md`

## Global Constraints
- Do not expose service_role or Google client secrets in frontend.
- Preserve multi-tenant isolation by business_id.
- Tenant admin stays light with dark sidebar.
- Public page supports Light, Dark, Custom.
- Business category is immutable after onboarding except through support/Super Admin approval.
- All new SQL must be idempotent.

---

### Task 1: Complete operational schema
**Files:**
- Create: `sql/consolidation_schema.sql`
- Modify: `APLICAR_EN_SUPABASE.sql`
- Test: `tests/consolidation-schema.test.mjs`

- [ ] Write failing contract assertions for branches, staff, invitations, incidents, and category approval RPC.
- [ ] Run test and confirm failure.
- [ ] Add idempotent tables, indexes, RLS, grants and RPCs.
- [ ] Append migration to master SQL.
- [ ] Run test and confirm pass.

### Task 2: Rebuild Agenda views
**Files:**
- Modify: `admin/agenda.html`
- Modify: `js/admin-agenda.js`
- Modify: `css/admin-agenda.css`
- Test: `tests/agenda-views.test.mjs`

- [ ] Assert Day/3-day/Week/Month/List controls and no duplicate top-shell action.
- [ ] Implement persisted view selector and client-side renderers from one normalized appointment dataset.
- [ ] Add branch/staff/service filters with graceful empty states.
- [ ] Verify test pass and JS syntax.

### Task 3: Rebuild public page designer
**Files:**
- Modify: `admin/mi-pagina.html`
- Modify: `js/admin-branding.js`
- Modify: `css/admin-branding.css`
- Modify: `js/public-branding.js`
- Modify: `reservar.html`
- Test: `tests/public-page-designer.test.mjs`

- [ ] Assert Light/Dark/Custom controls, share actions, QR container, no preset-image gallery, real-service preview hooks.
- [ ] Implement immediate preview and draft persistence.
- [ ] Publish theme mode in published_config and apply it publicly.
- [ ] Add share actions: copy, WhatsApp, mailto, open, QR.
- [ ] Verify tests and syntax.

### Task 4: Native Team and Branches
**Files:**
- Modify: `admin/equipo.html`
- Modify: `js/admin-team.js`
- Create: `admin/sucursales.html`
- Create: `js/admin-branches.js`
- Create: `css/admin-team.css`
- Modify: `js/citago-shell.js`
- Test: `tests/team-branches.test.mjs`

- [ ] Assert no legacy backend message and presence of Supabase-backed team/branch actions.
- [ ] Implement team CRUD from business_staff, assignments and service links.
- [ ] Implement branch CRUD with one-primary-branch default behavior.
- [ ] Add Sucursales navigation item.
- [ ] Verify tests and syntax.

### Task 5: Lock business category
**Files:**
- Modify: `admin/configuracion.html`
- Modify: `js/admin-settings.js`
- Modify: `admin/onboarding.html`
- Modify: `js/admin-onboarding.js`
- Test: `tests/category-lock.test.mjs`

- [ ] Assert locked-category UI and support-request action.
- [ ] Persist category once at onboarding and render read-only afterwards.
- [ ] Create category-change support request through RPC/table.
- [ ] Verify tests and syntax.

### Task 6: Super Admin resilience and invitations
**Files:**
- Modify: `admin/plataforma.html`
- Modify: `js/admin-platform.js`
- Modify: `css/admin-platform.css`
- Modify: `sql/platform_dashboard_rpc.sql`
- Test: `tests/platform-operations.test.mjs`

- [ ] Assert invite-business UI, 0-value KPI fallbacks, logout and category-request controls.
- [ ] Make snapshot resilient to empty optional data and include incidents/invites/category requests.
- [ ] Implement invite creation + copy/WhatsApp/email.
- [ ] Implement approval/rejection for category requests.
- [ ] Verify tests and syntax.

### Task 7: Shell cleanup and final verification
**Files:**
- Modify: `js/citago-shell.js`
- Modify: `css/citago-admin.css`
- Test: all test files + `tools/verify-admin-pages.py`

- [ ] Remove tenant moon toggle and stray legacy navigation fragments.
- [ ] Ensure a single New Appointment action per context.
- [ ] Run all Node tests.
- [ ] Run all JS syntax checks.
- [ ] Run admin-page verifier.
- [ ] Package full repo ZIP with installation guide.
