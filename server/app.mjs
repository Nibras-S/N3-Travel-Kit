import express from 'express';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { neon } from '@neondatabase/serverless';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createObjectStorage, LOGO_BUCKET } from './storage.mjs';
import { randomUUID } from 'node:crypto';
import { brandingSchema, tenantIdentity, imageType } from './security.mjs';

export function createApp({ authMiddleware = clerkMiddleware(), readAuth = getAuth, sqlClient, objectClient } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', authMiddleware);
  app.use('/api', (req, res, next) => {
    if (!req.headers.authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'A session token is required.' });
    const identity = tenantIdentity(readAuth(req));
    if (identity.error) return res.status(identity.status).json({ error: identity.error });
    if (req.headers['x-tenant-id'] && req.headers['x-tenant-id'] !== identity.orgId) return res.status(409).json({ error: 'Workspace changed. Please retry in the active business.' });
    res.locals.tenant = identity;
    next();
  });
  const database = () => {
    if (sqlClient) return sqlClient;
    if (!process.env.DATABASE_URL) throw new Error('Database is not configured.');
    return neon(process.env.DATABASE_URL);
  };
  let storageClient = objectClient;
  const storage = () => storageClient ||= createObjectStorage();
  const profile = (row) => row ? {
    name: row.name, addressLine1: row.address_line1, addressLine2: row.address_line2,
    phone: row.phone, additionalPhone: row.additional_phone, email: row.email,
    hasLogo: Boolean(row.logo_key),
  } : null;
  const admin = (_req, res, next) => {
    if (!res.locals.tenant.isAdmin) return res.status(403).json({ error: 'Only organization admins can change branding.' });
    next();
  };
  app.get('/api/tenant', async (_req, res) => {
    const rows = await database()`SELECT * FROM tenant_branding WHERE clerk_org_id = ${res.locals.tenant.orgId}`;
    res.json({ branding: profile(rows[0]) });
  });
  app.put('/api/tenant', admin, express.json({ limit: '16kb' }), async (req, res) => {
    const result = brandingSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: 'Check your business name, email, and field lengths.' });
    const b = result.data;
    const rows = await database()`INSERT INTO tenant_branding (clerk_org_id, name, address_line1, address_line2, phone, additional_phone, email)
      VALUES (${res.locals.tenant.orgId}, ${b.name}, ${b.addressLine1}, ${b.addressLine2}, ${b.phone}, ${b.additionalPhone}, ${b.email})
      ON CONFLICT (clerk_org_id) DO UPDATE SET name = EXCLUDED.name, address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2, phone = EXCLUDED.phone, additional_phone = EXCLUDED.additional_phone,
      email = EXCLUDED.email, updated_at = now() RETURNING *`;
    res.json({ branding: profile(rows[0]) });
  });
  app.get('/api/tenant/logo', async (_req, res) => {
    const rows = await database()`SELECT logo_key FROM tenant_branding WHERE clerk_org_id = ${res.locals.tenant.orgId}`;
    if (!rows[0]?.logo_key) return res.status(404).json({ error: 'No logo uploaded.' });
    const object = await storage().send(new GetObjectCommand({ Bucket: LOGO_BUCKET, Key: rows[0].logo_key }));
    res.set('Content-Type', object.ContentType || 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(await object.Body.transformToByteArray()));
  });
  app.put('/api/tenant/logo', admin, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !imageType(req.body)) return res.status(400).json({ error: 'Upload a PNG, JPEG, or WebP image under 2 MB.' });
    const sql = database();
    const rows = await sql`SELECT logo_key FROM tenant_branding WHERE clerk_org_id = ${res.locals.tenant.orgId}`;
    if (!rows[0]) return res.status(409).json({ error: 'Save your business details before uploading a logo.' });
    const client = storage();
    const key = `tenants/${res.locals.tenant.orgId}/logos/${randomUUID()}`;
    await client.send(new PutObjectCommand({ Bucket: LOGO_BUCKET, Key: key, Body: req.body, ContentType: imageType(req.body) }));
    try {
      await sql`UPDATE tenant_branding SET logo_key = ${key}, updated_at = now() WHERE clerk_org_id = ${res.locals.tenant.orgId}`;
    } catch (error) {
      await client.send(new DeleteObjectCommand({ Bucket: LOGO_BUCKET, Key: key })).catch(() => {});
      throw error;
    }
    if (rows[0].logo_key) await client.send(new DeleteObjectCommand({ Bucket: LOGO_BUCKET, Key: rows[0].logo_key })).catch(() => {});
    res.json({ ok: true });
  });
  app.delete('/api/tenant/logo', admin, async (_req, res) => {
    const sql = database();
    const rows = await sql`SELECT logo_key FROM tenant_branding WHERE clerk_org_id = ${res.locals.tenant.orgId}`;
    await sql`UPDATE tenant_branding SET logo_key = NULL, updated_at = now() WHERE clerk_org_id = ${res.locals.tenant.orgId}`;
    if (rows[0]?.logo_key) await storage().send(new DeleteObjectCommand({ Bucket: LOGO_BUCKET, Key: rows[0].logo_key })).catch(() => {});
    res.json({ ok: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error, _req, res, _next) => {
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 503;
    res.status(status).json({ error: status === 413 ? 'Upload must be under 2 MB.' : status === 400 ? 'Invalid request body.' : 'Unable to complete the request. Check server configuration and try again.' });
  });
  return app;
}
