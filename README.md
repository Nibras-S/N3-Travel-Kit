# N3 Travel Kit

Travel tools for multiple businesses, powered by **N3 Global Tech**.

- **Clerk Organizations:** each organization is a tenant; sign in, select/create a business, and invite teammates through the organization switcher.
- **Neon Postgres:** stores each business's name, address, mobile numbers, email, and R2 logo key.
- **Cloudflare R2:** private logo storage. The API reads the logo for the authenticated organization. Images are converted to data URLs in the browser so poster downloads and PDF printing do not depend on expiring URLs or cross-origin image access.
- **Branding:** invoices, flight/visa poster footers, and brochures use tenant branding. Navigation retains the N3 Travel Kit logo; generated materials include “Powered by N3 Travel Kit”.

## Configure services

Use Node 20.19+ (Node 22 recommended) and npm.

1. Install dependencies with `npm install`.
2. Use the already selected Clerk application **app_3MjdKCGZMSVuGbaPpu58B3vXmpm**. In your own terminal, authenticate with `npx -y clerk@latest auth login`. For the initial project setup run `npx -y clerk@latest init --app app_3MjdKCGZMSVuGbaPpu58B3vXmpm`. If already linked/configured, do not reinitialize or create another application. Enable Organizations in this application's Dashboard.
3. Copy the placeholders from `.env.example` into your private `.env` without overwriting existing values. Set `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` to the same application's publishable key, and set `CLERK_SECRET_KEY` for the API.
4. Create a Neon database and set its connection string as `DATABASE_URL` on the API. Run `npm run db:migrate` once to create the tenant settings table.
5. Create a private R2 bucket. Give an R2 API token object read/write permissions on that bucket only, and configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` on the API. Browser CORS and public bucket access are unnecessary: logo uploads/downloads go through the API. PNG/JPEG/WebP logos are limited to 2 MB. Replaced/removed logos are deleted on a best-effort basis; use a separate reconciliation process for any orphaned private objects if needed.
6. Start `npm run dev:api` and `npm run dev` in separate terminals. Vite proxies `/api` to port 3001. Sign in, create/select your organization, then open **Business settings** to save your business details and logo.

Only publishable keys belong in frontend `VITE_` variables. Database credentials, Clerk secret keys, and R2 credentials must remain on the server. Existing unscoped browser preferences are not imported into tenant workspaces; re-enter any personal brochure API keys and poster contact overrides.

## Access and isolation

Every tenant API request requires a Clerk bearer session token and an active organization. The tenant ID comes exclusively from the verified session. Members can read branding; only `org:admin` can save branding or upload/remove logos. SQL queries use parameters and filter by the verified organization ID. R2 object paths are generated on the server. The client cannot select arbitrary tenant IDs, storage keys, or logo URLs.

Switching organizations/users unmounts all tool state. Poster contact overrides and brochure API preferences use organization + user storage keys. Tool drafts and generated invoice/poster/brochure files remain browser-local/exported; this change persists business branding and logos, not a document archive. Changes made in another tab/user's session are loaded on refresh.

## Validation and production

Run `npm run build`, `npm test`, and `npm run lint`.

For production, configure the frontend publishable key before `npm run build`; configure all server variables at runtime. The API also accepts the frontend publishable key variable when `CLERK_PUBLISHABLE_KEY` is omitted. Run `NODE_ENV=production npm start` to serve both the built frontend and `/api` from one origin. A static-only host cannot run the API; if hosting the frontend separately, reverse-proxy `/api` to the API service. Configure Clerk's production instance and allowed domains for your deployed origin. Apply the schema to the production database before release.

Integration references: [Clerk React](https://clerk.com/docs/react/getting-started/quickstart), [Clerk Express](https://clerk.com/docs/expressjs/getting-started/quickstart), [Neon driver](https://neon.com/docs/serverless/serverless-driver), [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/).
