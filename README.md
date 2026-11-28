# N3 Travel Kit

Travel tools for multiple businesses, powered by **N3 Global Tech**.

- **Clerk Organizations:** each organization is a tenant. Sign in, select/create a business, and invite teammates through the organization switcher.
- **Neon Postgres:** stores each business's name, address, mobile numbers, email, and logo object key. The app keeps the existing `@neondatabase/serverless` HTTP driver for parameterized request queries; migrations prefer the direct `DATABASE_URL_UNPOOLED` connection.
- **Neon Object Storage:** logos live in the private `uploads` bucket declared in `neon.ts`. The API uses the generated `AWS_*` variables and path-style S3 requests. Images are returned only to an authenticated tenant and converted to browser data URLs for poster/PDF exports.
- **Branding:** invoices, flight/visa poster footers, and brochures use tenant branding. Navigation retains the N3 Travel Kit logo; generated materials include “Powered by N3 Travel Kit”.

## Neon setup

Use Node 22.20+ for the Neon CLI/agent setup. The application supports Node 20.19+.

```bash
npm install
npm i -g neon@latest
neon login
neon init -y --org-id org-summer-bonus-28692497 --project-id rapid-sky-57581240 --branch production --services postgres,object-storage
neon config plan
neon deploy
npm run db:migrate
```

The project is already initialized and linked to `rapid-sky-57581240` (`n3travelkit`) in Singapore. For ordinary setup refreshes, run `neon deploy`; do not create another project or rerun initialization. If global CLI installation is unavailable, use `npx neon@latest` instead of `neon`. If sign-in reports “Cannot run interactive auth in CI” on your local machine, use `neon login --force-auth` and complete the browser sign-in.

`neon deploy` provisions the services declared in `neon.ts` and pulls their variables into the existing `.env`, or `.env.local` when there is no `.env`. It provisions the backend services; it does not publish this Vite/Express app to a public frontend host.

Neon generates `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, and `AWS_REGION`. The server loads `.env.local` before `.env`, preserving any variables supplied by the host. Use `.env.example` for variable names only. Keep both environment files private and gitignored. Storage credentials, database connection strings, and Clerk secret keys must never be prefixed with `VITE_`.

The private logo bucket is `uploads`, matching `neon.ts` and `server/storage.mjs`. Public bucket access and browser CORS are unnecessary because uploads/downloads go through the app API. PNG/JPEG/WebP logos are limited to 2 MB. Replacement/removal deletes retired objects on a best-effort basis. Postgres stores object keys rather than permanent URLs, so branch copies keep their records and files together. A future move to another S3-compatible provider requires copying objects, keeping their keys, and updating the storage adapter/configuration.

## Clerk and local development

Keep the selected Clerk application **app_3MjdKCGZMSVuGbaPpu58B3vXmpm**; Organizations is enabled on its development instance. Do not reinitialize Clerk or replace its keys. Set `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the private environment file. The API accepts `CLERK_PUBLISHABLE_KEY` or falls back to `VITE_CLERK_PUBLISHABLE_KEY`.

Start `npm run dev:api` and `npm run dev` in separate terminals. Vite proxies `/api` to port 3001. Sign in, create/select an organization, and open **Business settings** to save its details and upload a logo.

Every tenant API request requires a Clerk bearer session token and an active organization. The tenant ID comes exclusively from the verified session. Members can read branding; only `org:admin` can save branding or upload/remove logos. Queries filter by the verified organization ID. Storage keys are generated on the server. The client cannot select arbitrary tenant IDs, storage keys, or logo URLs.

Switching organizations/users unmounts tool state. Poster contacts and brochure API preferences are isolated by organization + user. Existing unscoped browser preferences are not automatically imported. Generated invoice/poster/brochure files remain browser-local/exported; the backend currently persists business branding and logos, not a document archive. Changes made in another tab/user's session are loaded on refresh.

## Platform superadmin and user approval

Clerk organization admins manage their own business; platform superadmins manage app access across users. These are separate privileges. Configure trusted platform superadmins by their Clerk **user IDs**, comma-separated, in the server-only `SUPERADMIN_USER_IDS` variable, then restart the API. Never use a frontend variable, a browser-submitted email, organization role, or editable user metadata to grant this privilege. The same email has different user IDs in Clerk development and production; configure the correct IDs for each environment.

After a user's first sign-in, `/api/access` registers their verified Clerk identity with `pending` access. Only a platform superadmin can approve, pause, or set their plan name and expiry at `/#/admin`. Clerk forced organization selection is disabled on the development instance so approval status and platform administration can appear immediately after sign-in. A superadmin can open this page without creating a business organization. Approved users still need an organization to use the tools. Approval and plan state apply to a user across all their workspaces.

- **Pending:** cannot use the tools until approved.
- **Approved:** allowed while the plan is unexpired. An empty expiry means no automatic expiry.
- **Paused:** server access is blocked immediately, even with an existing Clerk session.
- **Expired:** server access is blocked at the expiry time until renewed.

Every tenant API call checks current approval/expiry in Postgres. The frontend rechecks on focus and every 30 seconds, and locks when an API reports revoked access. Platform account changes are recorded atomically in `platform_access_audit`. Superadmins cannot grant new superadmins or pause another superadmin through the app; those IDs are managed through the server configuration. These controls manage app access only; there is no payment processor or automated billing cancellation.

New accounts see an approval-request confirmation and cannot enter the tools. After approval and workspace selection, businesses without saved branding enter a setup screen for their name, address, phone, email, and logo. Only organization admins can save these details; members see a request to contact their business admin. The logo is optional and details can be edited later in Business settings. N3 Travel Kit promotion remains visible.

The **Business workspaces** section at `/#/admin` separately pauses/resumes an entire tenant. Workspaces register after an approved user opens them. A paused workspace blocks every regular member at the API, including existing sessions. Other workspaces remain accessible. Resuming does not bypass individual approval or expired plans. Platform superadmins retain access for administration. Tenant status changes are audited with the tenant ID in `platform_access_audit.details`. Run `npm run db:migrate` before deploying code that uses the new `platform_tenants` table.

### Why Clerk shows Development mode

A production Neon branch and a production Vite build do not change the Clerk instance. `pk_test_`/`sk_test_` keys identify Clerk development; the sign-in component displays that label deliberately. A public release needs a Clerk production instance configured with your owned domain, its DNS records and OAuth credentials, plus the matching `pk_live_`/`sk_live_` keys on the app host. Clerk development users are not automatically copied to production. Do not hide the label or replace key prefixes manually. See [Clerk production setup](https://clerk.com/docs/guides/development/deployment/production).

## Verification

```bash
npm run build
npm run lint
npm test
npm run verify:neon
```

`npm test` runs isolated validation/authorization tests without contacting Neon. `npm run verify:neon` is an explicit live check against the branch currently loaded from the private environment file. Apply `npm run db:migrate` first. It:

- Checks that pending users are denied; a fixture superadmin approves them through the API. It verifies pause, expiry, reactivation, and audit rows using the same session.
- Writes and reads unique test branding records through the actual app API and real Neon database.
- Uploads/downloads identical PNG bytes, checks that anonymous reads are denied, and tests cross-tenant access against the private storage bucket.
- Removes the logo from Postgres and storage and checks that it is gone.
- Starts the actual production entry point, serves the built frontend/JS asset and health endpoint, and checks that real Clerk middleware rejects an unsigned request.
- Removes its own test records and objects, then stops its temporary local servers.

The live service checks inject a test identity into a separate loopback-only fixture server; they do not create Clerk accounts or exercise browser sign-in. The actual production server always uses real Clerk middleware. Build the app before running this check.

For a schema change, test on a temporary Neon branch before production:

```bash
neon checkout verify-my-change --create
npm run db:migrate
npm run build
npm run verify:neon
neon checkout production
npm run db:migrate
npm run verify:neon
neon branches delete verify-my-change
```

## Vercel deployment

This repository deploys the Vite frontend plus a Node function on Vercel. `api/[...path].js` exports the existing Express API for all `/api/*` paths; it does not start a persistent listener. `vercel.json` selects Vite, `npm run build`, and `dist`. Keep the Vercel project root at the repository root so its `api/` directory is included. The app uses hash navigation, so no catch-all frontend rewrite is needed.

In the **existing Vercel project serving travelkit.n3global.tech**, configure these environment variables for Production (and separately for Preview if needed):

- `VITE_CLERK_PUBLISHABLE_KEY` — frontend build configuration.
- `CLERK_PUBLISHABLE_KEY` (or the same `VITE_CLERK_PUBLISHABLE_KEY`) and `CLERK_SECRET_KEY` — API authentication, from the same Clerk instance.
- `SUPERADMIN_USER_IDS` — the trusted Clerk user IDs for that instance.
- `DATABASE_URL` — Neon connection string. The already-applied schema must exist in this database.
- `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — the selected Neon branch's storage configuration.

Private local `.env` files are not deployed configuration. Add their server values through Vercel's environment settings or authenticated CLI without committing them, then redeploy the existing project. `DATABASE_URL_UNPOOLED` is only needed when running migrations; normal API requests use `DATABASE_URL`.

After deployment, `/api/health` must return HTTP 200 with `{"ok":true}`, and `/api/access` without a session must return HTTP 401 JSON. A Vercel `NOT_FOUND` response means the function was not deployed or the project root/routing is incorrect. A configured frontend alone cannot serve these endpoints. The Clerk development-key warning is separate from API routing.

## Production app hosting

Configure the frontend publishable key before building. Configure server secrets at runtime. Run `NODE_ENV=production npm start` to serve the built frontend and `/api` from one origin. Default port is 3001; override with `PORT`. For a separately hosted frontend, reverse-proxy `/api` to the Express service. A static-only host cannot run the API. Configure Clerk's production instance/allowed domains before a public release.

References: [Neon driver](https://neon.com/docs/serverless/serverless-driver), [Neon Object Storage](https://neon.com/docs/storage/overview), [S3 compatibility](https://neon.com/docs/storage/s3-compatibility), [Clerk React](https://clerk.com/docs/react/getting-started/quickstart).
