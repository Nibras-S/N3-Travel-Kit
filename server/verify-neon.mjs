import './env.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { neon } from '@neondatabase/serverless';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createApp } from './app.mjs';
import { createObjectStorage, LOGO_BUCKET } from './storage.mjs';

// Opt-in live verification, never part of npm test. Creates only uniquely named
// fixture records and objects, then removes them. No real Clerk users/orgs are
// created: the isolated loopback server injects a test identity at the auth
// boundary, while all database and storage calls use the real app adapters.
const timeout = 20_000;
const fixtureId = randomUUID().replaceAll('-', '');
const orgA = `org_neon_verify_${fixtureId}_a`;
const orgB = `org_neon_verify_${fixtureId}_b`;
const token = randomUUID();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLp8AAAAASUVORK5CYII=', 'base64');
let fixtureServer;
let productionProcess;
let sql;
let storage;
let logoKey;

function redact(message) {
  let result = String(message);
  for (const [key, value] of Object.entries(process.env)) {
    if (/SECRET|TOKEN|PASSWORD|KEY|DATABASE_URL|ENDPOINT_URL/.test(key) && value?.length > 4) result = result.replaceAll(value, '[redacted]');
  }
  return result;
}

async function verify() {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL. Run neon deploy first.');
  sql = neon(process.env.DATABASE_URL);
  storage = createObjectStorage();
  const [probe] = await sql`SELECT 1 AS ready`;
  assert.equal(probe.ready, 1);
  console.log('PASS Postgres: live query succeeded');

  const app = createApp({
    authMiddleware: (_req, _res, next) => next(),
    readAuth: (req) => {
      if (req.headers.authorization === `Bearer ${token}`) return { userId: `user_verify_${fixtureId}`, orgId: orgA, orgRole: 'org:admin' };
      if (req.headers.authorization === `Bearer ${token}-other`) return { userId: `user_verify_other_${fixtureId}`, orgId: orgB, orgRole: 'org:member' };
      return {};
    },
  });
  fixtureServer = app.listen(0, '127.0.0.1');
  await once(fixtureServer, 'listening');
  const base = `http://127.0.0.1:${fixtureServer.address().port}`;
  async function call(path, init = {}, otherTenant = false) {
    return fetch(`${base}/api${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}${otherTenant ? '-other' : ''}`, ...init.headers },
      signal: AbortSignal.timeout(timeout),
    });
  }
  const saved = await call('/tenant', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Neon Verification Fixture', addressLine1: 'Verification address', addressLine2: '', phone: '0000000000', additionalPhone: '', email: '' }),
  });
  assert.equal(saved.status, 200, `Branding save returned ${saved.status}`);
  const loaded = await call('/tenant');
  assert.equal(loaded.status, 200);
  assert.equal((await loaded.json()).branding.name, 'Neon Verification Fixture');
  console.log('PASS Postgres: app API saved and reloaded tenant branding');

  const uploaded = await call('/tenant/logo', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png });
  const [row] = await sql`SELECT logo_key FROM tenant_branding WHERE clerk_org_id = ${orgA}`;
  logoKey = row?.logo_key;
  assert.equal(uploaded.status, 200, `Logo upload returned ${uploaded.status}`);
  assert.ok(logoKey?.startsWith(`tenants/${orgA}/logos/`));
  const downloaded = await call('/tenant/logo');
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers.get('Content-Type'), /^image\/png/);
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), png);
  const head = await storage.send(new HeadObjectCommand({ Bucket: LOGO_BUCKET, Key: logoKey }));
  assert.equal(head.ContentLength, png.length);
  const anonymous = await fetch(`${process.env.AWS_ENDPOINT_URL_S3.replace(/\/$/, '')}/${LOGO_BUCKET}/${logoKey}`, { signal: AbortSignal.timeout(timeout) });
  assert.ok([401, 403, 404].includes(anonymous.status), `Private object allowed anonymous access: ${anonymous.status}`);
  console.log(`PASS Object Storage: app API uploaded and downloaded identical PNG bytes from private bucket ${LOGO_BUCKET}`);
  console.log('PASS Object Storage: anonymous object download was denied');

  const otherBranding = await call('/tenant', {}, true);
  assert.equal((await otherBranding.json()).branding, null);
  assert.equal((await call(`/tenant/logo?key=${encodeURIComponent(logoKey)}`, {}, true)).status, 404);
  assert.equal((await call('/tenant/logo', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png }, true)).status, 403);
  assert.equal((await call('/tenant', { headers: { 'X-Tenant-ID': orgB } })).status, 409);
  console.log('PASS Tenant isolation: another tenant cannot read or overwrite the fixture logo');

  assert.equal((await call('/tenant/logo', { method: 'DELETE' })).status, 200);
  assert.equal((await call('/tenant/logo')).status, 404);
  let removed = false;
  try { await storage.send(new HeadObjectCommand({ Bucket: LOGO_BUCKET, Key: logoKey })); }
  catch (error) { if (error.$metadata?.httpStatusCode === 404) removed = true; else throw error; }
  assert.equal(removed, true, 'Deleted logo still exists in storage');
  logoKey = undefined;
  console.log('PASS Object Storage: app API removed logo from both Postgres and object storage');

  // Start the actual production entry point separately with its real Clerk
  // middleware, built Vite frontend, and generated Neon environment.
  productionProcess = fork(new URL('./index.mjs', import.meta.url), [], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '0' },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let startupError = '';
  productionProcess.stderr.on('data', (chunk) => { startupError += chunk; });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('App startup timed out.')), timeout);
    productionProcess.once('message', (message) => { clearTimeout(timer); resolve(message); });
    productionProcess.once('exit', (code) => { clearTimeout(timer); reject(new Error(`App exited (${code}): ${redact(startupError)}`)); });
    productionProcess.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
  assert.equal(ready.type, 'ready');
  const appUrl = `http://127.0.0.1:${ready.port}`;
  const page = await fetch(appUrl, { signal: AbortSignal.timeout(timeout) });
  assert.equal(page.status, 200);
  const html = await page.text();
  const script = html.match(/<script[^>]+src="([^"]+)"/);
  assert.ok(script, 'Built frontend script was not served.');
  assert.equal((await fetch(`${appUrl}${script[1]}`, { signal: AbortSignal.timeout(timeout) })).status, 200);
  assert.equal((await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(timeout) })).status, 200);
  assert.equal((await fetch(`${appUrl}/api/tenant`, { signal: AbortSignal.timeout(timeout) })).status, 401);
  console.log('PASS App startup: production server served built frontend, JS asset, and health endpoint');
  console.log('PASS Authentication boundary: real Clerk-protected tenant endpoint rejected an unsigned request');
}

async function cleanup() {
  if (productionProcess && productionProcess.exitCode === null) {
    const exited = once(productionProcess, 'exit');
    productionProcess.kill('SIGTERM');
    await exited;
  }
  if (fixtureServer) await new Promise((resolve) => { fixtureServer.closeAllConnections(); fixtureServer.close(resolve); });
  if (sql) {
    // Recover an uploaded key even when the HTTP verification failed midway.
    const rows = await sql`SELECT logo_key FROM tenant_branding WHERE clerk_org_id = ${orgA}`;
    const key = logoKey || rows[0]?.logo_key;
    if (key && storage) await storage.send(new DeleteObjectCommand({ Bucket: LOGO_BUCKET, Key: key }));
    await sql`DELETE FROM tenant_branding WHERE clerk_org_id IN (${orgA}, ${orgB})`;
    console.log('PASS Cleanup: temporary verification records and objects removed');
  }
}

try {
  try { await verify(); }
  finally { await cleanup(); }
  console.log('Neon live service verification passed (test identity; no browser sign-in exercised).');
} catch (error) {
  console.error(`FAIL ${redact(error.message)}`);
  process.exitCode = 1;
}
