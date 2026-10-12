# Palm River Admin deployment

This runbook builds and deploys only the Admin frontend. Production deployment
must wait until the protected Worker Admin API and its Apps Script read endpoint
are implemented and verified against `ADMIN-API-CONTRACT.md`.

## 1. Configure Supabase OAuth

In the Supabase project used by this app:

- Enable Google Auth and configure the Google OAuth provider.
- Set the site URL to `https://admin.canho-palmriver.vn`.
- Add the production Admin URL and local development URL to the redirect URL
  allowlist.
- The Google provider callback URI remains the Supabase callback shown in its
  provider settings; it is not the Admin site URL.
- Use only the Supabase anon/publishable key in the frontend. Never put a
  service-role key in a `VITE_*` variable.

## 2. Build the frontend

Set build-time environment variables in the deployment environment:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
VITE_APP_URL=https://admin.canho-palmriver.vn
VITE_API_BASE=https://<admin-api-worker-domain>
```

Then run:

```bash
npm ci
npm run build
```

Vite writes the static site to `dist/`. `VITE_API_BASE` must point to the
protected Worker Admin API, not directly to Apps Script and not to the public
lead-ingestion endpoint unless that Worker has been explicitly extended with
the protected Admin routes.

## 3. Deploy static assets

For the current VPS/Nginx target:

1. Ensure DNS and HTTPS for `admin.canho-palmriver.vn` point to the intended
   server.
2. Upload the contents of `dist/` to `/var/www/palm-river-admin/dist/`.
3. Install `deploy/nginx-admin.conf` as the Admin site's own Nginx server
   block; do not replace the landing page's server block.
4. Run `nginx -t`, then reload Nginx.

Alternatively, deploy `dist/` using the approved static hosting provider. In
either case configure SPA fallback to `index.html`.

## 4. Production acceptance checklist

- [ ] The frontend build succeeds with production environment variables.
- [ ] HTTPS works on `https://admin.canho-palmriver.vn`.
- [ ] Google OAuth returns to the Admin domain and Supabase completes the
      session exchange.
- [ ] Worker rejects missing/invalid tokens with `401` and disallowed users
      with `403`.
- [ ] Worker checks admin roles from Supabase server-side.
- [ ] Leads can only be read/exported; there is no Admin lead mutation API.
- [ ] Admin records are managed in Supabase through authorized Worker routes.
- [ ] Apps Script Admin endpoint only reads `RAW_LEAD` and authenticates
      Worker-originated requests.
- [ ] Existing landing-page lead submissions still work through the unchanged
      Worker POST → Apps Script `doPost()` flow.
- [ ] Admin API CORS allows only the production Admin origin.
- [ ] Dashboard/ZNS/realtime data sources have been confirmed before exposing
      those pages.

This document is a deployment plan, not proof of a live deployment. No
production Worker, Apps Script, Supabase schema, DNS, or data is changed by
building the frontend.
