# D2 Modelo Operativo de Cita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completar pagos/anticipos, estado de reseña y Checkout Pro Mercado Pago para citas.

**Architecture:** Mantener `appointments` como cabecera, `customer_payments` como fuente de pagos y `review_requests` como fuente de solicitudes. Edge Functions ejecutan checkout/webhook; Agenda consume tablas aisladas por `business_id`.

**Tech Stack:** Supabase/PostgreSQL, Edge Functions Deno/TypeScript, Supabase JS v2, GitHub Pages vanilla JS.

**Spec:** `docs/superpowers/specs/2026-09-11-d2-operational-appointment-design.md`

## Global Constraints
- No D3-D5.
- No borrar historial Stripe.
- RLS por `business_id`.
- Sin tokens Mercado Pago en navegador.
- Webhook con firma verificada.
