# Super Admin Backend Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace six sensitive direct Super Admin reads with six explicit server-authorized RPCs and a thin browser adapter, without changing V6 or existing mutation contracts.

**Architecture:** Authorization is enforced inside each PostgreSQL RPC, never in browser code. `platform-api.js` only maps frontend module reads to six allow-listed RPCs; `admin-platform.js` keeps independent module rendering/error handling.

**Tech Stack:** Supabase/PostgreSQL, vanilla JavaScript, Node.js contract tests, Python repository verifier.

**Spec:** `docs/superpowers/specs/2026-09-02-superadmin-backend-centralization-design.md`

## Global Constraints
- Exactly six new read RPCs, one per current sensitive direct read.
- Every RPC checks `public.is_platform_admin(auth.uid())` internally.
- No generic table-name argument and no dynamic SQL.
- Migration is additive in `sql/platform_read_api.sql`.
- Do not modify `SUPABASE_V6_MASTER.sql`.
- Preserve existing mutations, snapshot RPC, UI rendering, and per-module retry behavior.

---

### Task 1: Add security/read API regression contract

**Files:**
- Create: `tests/platform-read-api.test.mjs`
- Test: `tests/platform-read-api.test.mjs`

**Interfaces:**
- Consumes: current `js/admin-platform.js` and new migration path.
- Produces: contract enforcing six RPCs, explicit internal authorization, no generic reader, and no sensitive direct selects.

- [ ] **Step 1: Write failing assertions for the migration, frontend adapter, HTML script order, and removal of six direct reads.**
- [ ] **Step 2: Run `node tests/platform-read-api.test.mjs` and confirm failure because files/RPCs are missing.**

### Task 2: Add additive SQL read API

**Files:**
- Create: `sql/platform_read_api.sql`

**Interfaces:**
- Produces: `platform_read_support()`, `platform_read_service_templates()`, `platform_read_business_categories()`, `platform_read_business_invites()`, `platform_read_category_change_requests()`, `platform_read_audit_logs()` returning JSONB arrays.

- [ ] **Step 1: Add `public.is_platform_admin(uuid)` overload backed only by `platform_admins.id`.**
- [ ] **Step 2: Define each RPC as `security definer set search_path=public,pg_temp` with `if auth.uid() is null or not public.is_platform_admin(auth.uid()) then raise exception 'forbidden'; end if;`.**
- [ ] **Step 3: Revoke public execution and grant only `authenticated` for all six functions.**
- [ ] **Step 4: Run the regression contract; expect frontend portions still failing.**

### Task 3: Add thin browser adapter and switch module reads

**Files:**
- Create: `js/platform-api.js`
- Modify: `js/admin-platform.js`
- Modify: `admin/plataforma.html`

**Interfaces:**
- Produces global `window.PlatformAPI` with `readSupport`, `readServiceTemplates`, `readBusinessCategories`, `readBusinessInvites`, `readCategoryChangeRequests`, `readAuditLogs`.
- Each method returns the Supabase `{data,error}` RPC result.

- [ ] **Step 1: Load `platform-api.js` before `admin-platform.js`.**
- [ ] **Step 2: Replace the six `.from(...).select(...)` operations in `loadOperationsModules()` with the six adapter methods.**
- [ ] **Step 3: Preserve `Promise.allSettled`, module-specific empty/error states, and retry buttons.**
- [ ] **Step 4: Run `node tests/platform-read-api.test.mjs`; expect PASS.**

### Task 4: Regression and packaging verification

**Files:**
- Modify only if a regression test identifies a compatibility issue outside the six-read change.
- Package: `MYCITAGO_SUPERADMIN_RPC_SEGURO.zip`

**Interfaces:**
- Produces deployable cumulative frontend plus additive SQL migration.

- [ ] **Step 1: Run every `tests/*.test.mjs`.**
- [ ] **Step 2: Run `python tools/verify-v6.py`.**
- [ ] **Step 3: Run `node --check` for every `js/*.js`.**
- [ ] **Step 4: Confirm `SUPABASE_V6_MASTER.sql` hash is unchanged from the pre-change hash captured before implementation.**
- [ ] **Step 5: Build ZIP and validate `unzip -t`.**
- [ ] **Step 6: Document live A.4 checks: admin no app-generated 403 and non-admin direct RPC rejected.**
