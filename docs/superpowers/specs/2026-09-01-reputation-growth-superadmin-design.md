# MyCitaGo Reputation, Growth and Super Admin Stabilization Design

## Approved scope
- Preserve V6 Agenda, Team, Branches and Google Login behavior.
- Stabilize Super Admin widgets with independent loading/error/empty states.
- Use existing `platform_admins` / `is_platform_admin()` model; never browser `service_role`.
- Add missing `business_invites` and `business_category_change_requests` idempotently with RLS.
- Internal reviews work without Google approval.
- When Google is usable, customer may choose MyCitaGo or Google at review time.
- One internal review per completed appointment via single-use token.
- Add Growth sharing links with `src` and booking source attribution.
- Add review/source metrics to reports.
