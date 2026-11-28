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

## Verification

```bash
npm run build
npm run lint
npm test
npm run verify:neon
```

`npm test` runs isolated validation/authorization tests without contacting Neon. `npm run verify:neon` is an explicit live check against the branch currently loaded from the private environment file. Apply `npm run db:migrate` first. It:

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

## Production app hosting

Configure the frontend publishable key before building. Configure server secrets at runtime. Run `NODE_ENV=production npm start` to serve the built frontend and `/api` from one origin. Default port is 3001; override with `PORT`. For a separately hosted frontend, reverse-proxy `/api` to the Express service. A static-only host cannot run the API. Configure Clerk's production instance/allowed domains before a public release.

References: [Neon driver](https://neon.com/docs/serverless/serverless-driver), [Neon Object Storage](https://neon.com/docs/storage/overview), [S3 compatibility](https://neon.com/docs/storage/s3-compatibility), [Clerk React](https://clerk.com/docs/react/getting-started/quickstart).
