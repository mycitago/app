# MyCitaGo Consolidation Design

## Goal
Consolidate MyCitaGo into one coherent SaaS experience with multi-view agenda, a usable public-page designer, native Supabase team/branches, locked business category with support-controlled changes, resilient Super Admin, and shareable registration/booking links.

## Product decisions
- Tenant admin stays light with dark sidebar; no admin dark-mode toggle.
- Public booking page supports Light, Dark, and Custom themes.
- Agenda offers Day, 3-day, Week, Month, and List views and remembers the chosen view.
- Businesses start with one primary branch; branch selection appears only when multiple active branches exist.
- Team data is stored in Supabase, not a legacy local backend.
- Business category is selected during onboarding, then locked. Changes require a support ticket and Super Admin approval.
- Public-page preview uses actual tenant logo, cover, services and style values. Generic placeholder services are only used when the business truly has no services.
- Remove unrelated preset-image gallery and stray legacy links from tenant UI.
- Super Admin must degrade gracefully: missing/empty operational sections show 0/empty states rather than breaking the entire dashboard.
- Super Admin can create registration invitations and share them by copy, WhatsApp, or email.

## Data model additions
- business_branches
- business_staff
- staff_services
- branch_services
- business_invites
- business_category_change_requests
- platform_incidents

## Security
- Tenant tables use RLS based on business_members membership.
- Category mutation is blocked for tenant clients after lock.
- Super Admin-only category approval is exposed through a SECURITY DEFINER RPC checking platform_admins.
- Invite tokens are opaque random values. Public invite lookup reveals only safe onboarding metadata.

## UX acceptance
- No duplicate New Appointment button in Agenda.
- No moon icon in tenant admin.
- No stray “Más” or “Mi negocio” links outside shell navigation.
- Team screen never references a production backend URL or “backend not configured”.
- Public page designer visibly changes colors in preview as inputs change.
- Public booking theme can be Dark and persists after publish.
- Share panel exposes booking URL, copy, WhatsApp, email, QR and open-page actions.
