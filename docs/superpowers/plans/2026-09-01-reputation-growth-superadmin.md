# MyCitaGo Reputation, Growth and Super Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure internal reviews/growth attribution and stabilize the Super Admin without breaking V6.

**Architecture:** Additive Supabase migration with RLS/RPC boundaries, static GitHub Pages UI, and independent widget loading. Google remains feature-gated; internal reputation is the guaranteed fallback.

**Tech Stack:** Supabase/PostgreSQL, vanilla JavaScript, HTML/CSS, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-09-01-reputation-growth-superadmin-design.md`

## Global Constraints
- Never expose Supabase `service_role` in browser code.
- Use existing `platform_admins` and `is_platform_admin()`.
- Do not rename/remove stable V6 Agenda, Team, Branches or Google Login contracts.
- Real Supabase data only; no mock production data.
- Every Super Admin widget has loading, empty and error states.
- Google Business Profile calls remain gated until configured.

---

### Task 1: Contract tests
- [ ] Add failing tests for Super Admin resilience, reputation RPCs, Growth source attribution and reports.
- [ ] Run new tests and verify RED.

### Task 2: Additive migration
- [ ] Add idempotent migration for missing platform tables/RLS/RPCs.
- [ ] Add secure review request/public submission RPCs and booking source tracking RPC.
- [ ] Run SQL/static contract tests.

### Task 3: Super Admin stabilization
- [ ] Make operational widgets independent with visible retry/error/empty states.
- [ ] Add real sections for integrations, incidents, payments and audit without fake values.
- [ ] Run platform tests.

### Task 4: Internal reviews
- [ ] Add public `resena.html` and review client script/CSS.
- [ ] Update admin reviews to unified internal/Google source display and internal replies.
- [ ] Add completed-appointment review link generation.
- [ ] Run review tests.

### Task 5: Growth and source attribution
- [ ] Add Growth page and shell nav entry.
- [ ] Add source-tagged share actions.
- [ ] Capture `src` after public booking using appointment access token.
- [ ] Run growth tests.

### Task 6: Reporting and verification
- [ ] Add monthly review, rating and shared-booking metrics.
- [ ] Run full legacy + new tests, verifier and JS syntax checks.
- [ ] Produce final ZIP and SQL file.
