# Palm River Admin API contract

This describes the target contract between the Admin frontend and a protected
Cloudflare Worker Admin API. It is a specification, not evidence that the
endpoints already exist.

## Project boundaries

- The Admin SPA authenticates with Google through Supabase Auth and sends its
  Supabase access token to the Worker in an `Authorization: Bearer <token>`
  header.
- The Worker validates the token, reads the caller's admin role from Supabase,
  and enforces authorization on every request. Frontend role checks are for
  presentation only.
- Admin/role records and other admin data are stored in Supabase. Browser code
  must never receive the Supabase service-role key.
- The Worker calls a separately authenticated Apps Script Admin API only for
  read access to the `RAW_LEAD` sheet. The Apps Script endpoint must not update
  leads or manage admin accounts.
- The public lead-ingestion flow remains unchanged:
  landing page → existing Worker POST → Apps Script `doPost()` → `RAW_LEAD`.

## Frontend-facing routes

All routes are relative to `VITE_API_BASE` and use the `/admin/api` prefix.
The exact request/response schemas, pagination limits, filters and CSV format
must be agreed with the Worker implementation before integration.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/admin/api/me` | Return verified user identity and effective role |
| `GET` | `/admin/api/admins` | List admin accounts; owner-only if required by policy |
| `POST` | `/admin/api/admins` | Add an admin/role record in Supabase; owner-only |
| `DELETE` | `/admin/api/admins?email=...` | Revoke an admin/role record in Supabase; owner-only |
| `GET` | `/admin/api/leads` | Read/filter/page leads from `RAW_LEAD` |
| `GET` | `/admin/api/leads/:id` | Read one lead from `RAW_LEAD`, if detail view is needed |
| `GET` | `/admin/api/leads.csv` | Export authorized lead data as CSV |

Lead routes are read-only. There must be no lead `POST`, `PUT`, `PATCH`, or
`DELETE` route exposed to the Admin frontend. Admin-management routes update
Supabase through the Worker; they do not call Apps Script.

Dashboard, ZNS, and realtime pages require an explicitly identified source and
protected API contract before they are enabled. Do not assume those data
sources exist in `RAW_LEAD`.

## Authentication and authorization behavior

- Missing, expired, malformed, or invalid Supabase access token: `401`.
- Validly authenticated user without an allowed admin record/role: `403`.
- Insufficient role for a management action: `403`.
- Never accept an email, role, or owner flag supplied by the browser as proof of
  authorization.
- The Worker must validate the Supabase JWT with Supabase-supported
  verification, not merely decode its claims.
- Apply the project's domain/allowlist policy on the server. OAuth's Google
  `hd` parameter and frontend email checks are not access controls.
- Use least privilege and Supabase RLS for admin data. The Worker must not
  expose service-role credentials to the browser.

## Apps Script trust boundary

The Worker-to-Apps-Script read request must use server-only authentication, for
example a dedicated shared secret stored as a Cloudflare Worker secret and an
Apps Script secret property. Reject unauthenticated requests. The read endpoint
must only expose the approved columns/rows from `RAW_LEAD`.

Keep the existing public `doPost()` behavior used for lead submissions intact.
Do not reuse its public access path as authorization for Admin reads.

## Browser and CORS

- Frontend API base URL: `VITE_API_BASE`, without a trailing slash.
- Send `Authorization: Bearer <Supabase access token>` on every protected API
  request, including CSV export.
- Allow only the deployed Admin origin, currently planned as
  `https://admin.canho-palmriver.vn`; do not use wildcard origins for Admin API.
- Do not call Apps Script directly from the browser.

## Current compatibility status

The existing `be/lead-webhook-worker` is documented as a public lead-ingestion
Worker and currently is not assumed to provide this Admin API. The frontend
screens may still contain calls for features whose target API/data source has
not been implemented. Verify or adapt each page against this contract before
production deployment. This document does not authorize changes to, or claim
deployment of, the Worker, Apps Script, Supabase, DNS, or production data.
