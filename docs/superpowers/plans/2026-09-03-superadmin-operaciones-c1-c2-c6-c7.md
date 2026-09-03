# Super Admin C1+C2+C6+C7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convertir la sección Negocios y módulos operativos del Super Admin en una herramienta utilizable para 100-1,000 negocios, manteniendo la seguridad en RPC y auditoría por negocio.

**Architecture:** El navegador conserva filtrado, orden, selección y exportación; las mutaciones siguen pasando por RPC específicos que validan `is_platform_admin(auth.uid())`. Se añade una migración aditiva para reforzar/crear RPC de lote seguros que procesan cada negocio de forma individual y generan una fila de auditoría por negocio. No se modifica `SUPABASE_V6_MASTER.sql`.

**Tech Stack:** HTML/CSS/JavaScript vanilla, Supabase JS, PostgreSQL/RPC, Node.js tests.

**Spec:** PROMPT MAESTRO Super Admin, Bloque C.1, C.2, C.6 y C.7 aprobado por el usuario.

## Global Constraints

- La seguridad real vive dentro de PostgreSQL/RPC, nunca en JavaScript del navegador.
- Toda mutación administrativa valida `public.is_platform_admin(auth.uid())` dentro del RPC.
- Suspender/reactivar N negocios genera N filas independientes en `audit_logs`.
- Migración aditiva; no modificar `SUPABASE_V6_MASTER.sql`.
- No añadir Stripe, correos automáticos ni datos ficticios en esta entrega.
- Exportar CSV respeta filtros/orden visibles.

---

### Task 1: Contratos de seguridad y lote

**Files:**
- Create: `sql/platform_bulk_operations.sql`
- Modify: `js/platform-api.js`
- Test: `tests/platform-bulk-security.test.mjs`

**Interfaces:**
- Produces: `platform_bulk_suspend(uuid[])`, `platform_bulk_reactivate(uuid[], integer)` y métodos `PlatformAPI.bulkSuspend(ids)`, `PlatformAPI.bulkReactivate(ids, days)`.

- [x] Escribir prueba que exija validación interna de Super Admin, `security definer`, `search_path`, sin RPC genérico y auditoría dentro del bucle por negocio.
- [x] Ejecutar y confirmar fallo por archivos/contratos inexistentes.
- [x] Crear migración aditiva con los dos RPC; cada iteración llama/replica la mutación segura por negocio y deja auditoría individual.
- [x] Exponer adaptadores en `platform-api.js`.
- [x] Ejecutar prueba y confirmar PASS.

### Task 2: Buscar, ordenar y seleccionar negocios

**Files:**
- Modify: `admin/plataforma.html`
- Modify: `js/admin-platform.js`
- Modify: `css/admin-platform.css`
- Test: `tests/platform-business-operations.test.mjs`

**Interfaces:**
- Consumes: `platformState.businesses`, `platformState.subs`, RPC bulk de Task 1.
- Produces: búsqueda nombre/correo/teléfono/slug; orden por vencimiento/alta; selección múltiple; barra de acciones en lote.

- [x] Escribir prueba de controles, orden, selección y llamadas API.
- [x] Confirmar fallo.
- [x] Añadir controles y estado de selección.
- [x] Implementar orden estable y combinado con filtro/búsqueda.
- [x] Implementar seleccionar visible/todo visible, suspender/reactivar seleccionados y refresco posterior.
- [x] Confirmar PASS.

### Task 3: Exportación CSV visible

**Files:**
- Modify: `admin/plataforma.html`
- Modify: `js/admin-platform.js`
- Test: `tests/platform-csv-export.test.mjs`

**Interfaces:**
- Produces: `exportBusinessesCsv()`, `exportPaymentsCsv()`, `exportAuditCsv()` y helper CSV seguro.

- [x] Escribir prueba para BOM UTF-8, escapado CSV y botones Negocios/Pagos/Auditoría.
- [x] Confirmar fallo.
- [x] Implementar helper CSV y exportaciones que respeten estado visible.
- [x] Confirmar PASS.

### Task 4: Cerrar huecos C7

**Files:**
- Modify: `js/admin-platform.js`
- Modify: `admin/plataforma.html`
- Test: `tests/platform-c7-completeness.test.mjs`

**Interfaces:**
- Plantillas: estado explícito por categoría vacía con acción de creación.
- Cambios de giro: aprobar/rechazar por fila.
- Detalle negocio: plan/vencimiento, historial pagos y enlaces/filtro a soporte del negocio.

- [x] Escribir prueba de los tres criterios.
- [x] Confirmar fallo para los huecos actuales.
- [x] Mejorar `renderTemplateSummary()` con estado vacío accionable.
- [x] Conservar y reforzar acciones de cambios de giro.
- [x] Completar drawer con pagos del negocio y tickets de soporte relacionados.
- [x] Confirmar PASS.

### Task 5: Verificación integral y paquete

**Files:**
- Create: `INSTALAR_SUPERADMIN_C1_C2_C6_C7.md`
- Create: ZIP acumulado final.

- [x] Ejecutar todos los tests `tests/*.test.mjs`.
- [x] Ejecutar `python tools/verify-v6.py`.
- [x] Validar sintaxis de todos los JS con `node --check`.
- [x] Confirmar `SUPABASE_V6_MASTER.sql` sin cambios mediante SHA-256 contra paquete base.
- [x] Validar que la migración contiene rechazo no-admin y auditoría por fila.
- [x] Crear ZIP y ejecutar `unzip -t`.
