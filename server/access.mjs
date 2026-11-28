import { z } from 'zod';
import { addPlanMonths, allowedTools, normalizePlan } from '../shared/plans.mjs';

export function superadminIds(env = process.env) {
  return new Set((env.SUPERADMIN_USER_IDS || '').split(',').map((id) => id.trim()).filter(Boolean));
}

export function accessDecision(row, isSuperadmin, now = Date.now()) {
  if (isSuperadmin) return { allowed: true, status: 'superadmin' };
  if (!row || row.status === 'pending') return { allowed: false, status: 'pending' };
  if (row.status !== 'approved') return { allowed: false, status: 'suspended' };
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return { allowed: false, status: 'expired' };
  return { allowed: true, status: 'approved' };
}

const messages = {
  pending: 'Your account is awaiting superadmin approval.',
  suspended: 'Your access is paused. Contact the platform administrator.',
  expired: 'Your plan has expired. Contact the platform administrator to renew it.',
};

export const accessUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'suspended']),
  planName: z.enum(['Pro', 'Pro Max']),
  expiresAt: z.union([z.iso.datetime({ offset: true }), z.null()]),
  durationMonths: z.union([z.literal(1), z.literal(2)]).optional(),
}).strict();

function publicUser(row, admins) {
  return {
    userId: row.clerk_user_id, email: row.email, name: row.display_name,
    status: row.status, planName: admins.has(row.clerk_user_id) ? 'Pro Max' : normalizePlan(row.plan_name), expiresAt: row.expires_at,
    isSuperadmin: admins.has(row.clerk_user_id), createdAt: row.created_at,
  };
}

export function mountAccessRoutes(app, { database, loadUser, loadTenantIdentity, admins }) {
  app.get('/api/access', async (_req, res) => {
    const { userId, orgId } = res.locals.auth;
    const sql = database();
    let rows = await sql`SELECT * FROM platform_users WHERE clerk_user_id = ${userId}`;
    if (!rows[0]) {
      // Resolve identity from Clerk on the server; never accept an email or role
      // supplied by the browser as proof of account ownership.
      const user = await loadUser(userId);
      const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
      const email = primary?.emailAddress || '';
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '';
      rows = await sql`INSERT INTO platform_users (clerk_user_id, email, display_name, plan_name)
        VALUES (${userId}, ${email}, ${name}, 'Pro') ON CONFLICT (clerk_user_id) DO UPDATE
        SET email = EXCLUDED.email, display_name = EXCLUDED.display_name RETURNING *`;
    }
    const row = rows[0];
    const isSuperadmin = admins.has(userId);
    let decision = accessDecision(row, isSuperadmin);
    if (decision.allowed && orgId) {
      let tenants = await sql`SELECT status FROM platform_tenants WHERE clerk_org_id = ${orgId}`;
      if (!tenants[0]) tenants = await sql`INSERT INTO platform_tenants (clerk_org_id) VALUES (${orgId})
        ON CONFLICT (clerk_org_id) DO UPDATE SET clerk_org_id = EXCLUDED.clerk_org_id RETURNING status`;
      if (!isSuperadmin && tenants[0].status === 'paused') decision = { allowed: false, status: 'tenant_paused' };
    }
    const planName = isSuperadmin ? 'Pro Max' : normalizePlan(row.plan_name);
    res.json({ userId, email: row.email, isSuperadmin, ...decision, planName, expiresAt: row.expires_at,
      allowedTools: decision.allowed ? allowedTools(planName, isSuperadmin) : [] });
  });

  app.use('/api/platform', (_req, res, next) => {
    if (!admins.has(res.locals.auth.userId)) return res.status(403).json({ error: 'Platform superadmin access is required.' });
    next();
  });
  app.get('/api/platform/users', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ error: 'Invalid page.' });
    const sql = database();
    const pattern = `%${search}%`;
    const [rows, totals] = await Promise.all([
      sql`SELECT * FROM platform_users WHERE email ILIKE ${pattern} OR display_name ILIKE ${pattern} OR clerk_user_id ILIKE ${pattern}
        ORDER BY created_at DESC, clerk_user_id LIMIT 25 OFFSET ${offset}`,
      sql`SELECT count(*)::int AS total FROM platform_users WHERE email ILIKE ${pattern} OR display_name ILIKE ${pattern} OR clerk_user_id ILIKE ${pattern}`,
    ]);
    res.json({ users: rows.map((row) => publicUser(row, admins)), total: totals[0].total });
  });
  app.get('/api/platform/tenants', async (req, res) => {
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ error: 'Invalid page.' });
    const sql = database();
    const [tenants, totals] = await Promise.all([
      sql`SELECT t.clerk_org_id AS "tenantId", b.name,
        t.status, b.phone, b.email FROM platform_tenants t LEFT JOIN tenant_branding b USING (clerk_org_id)
        ORDER BY t.created_at DESC, t.clerk_org_id LIMIT 25 OFFSET ${offset}`,
      sql`SELECT count(*)::int AS total FROM platform_tenants`,
    ]);
    // Bound Clerk concurrency; a failed lookup must not hide the other businesses.
    const enriched = [];
    for (let i = 0; i < tenants.length; i += 4) {
      enriched.push(...await Promise.all(tenants.slice(i, i + 4).map(async (tenant) => {
        try {
          const identity = await loadTenantIdentity(tenant.tenantId);
          return { ...tenant, name: tenant.name || identity.name, workspaceName: identity.name,
            members: identity.members, memberCount: identity.memberCount, identityUnavailable: false };
        } catch {
          return { ...tenant, name: tenant.name || 'Business details unavailable', members: [], memberCount: null, identityUnavailable: true };
        }
      })));
    }
    res.json({ tenants: enriched, total: totals[0].total });
  });
  app.patch('/api/platform/tenants/:tenantId', async (req, res) => {
    const result = z.object({ status: z.enum(['active', 'paused']) }).strict().safeParse(req.body);
    if (!result.success || !/^org_[a-zA-Z0-9_]+$/.test(req.params.tenantId)) return res.status(400).json({ error: 'Invalid business or status.' });
    const rows = await database()`WITH updated AS (
      UPDATE platform_tenants SET status = ${result.data.status}, reviewed_by = ${res.locals.auth.userId}, updated_at = now()
      WHERE clerk_org_id = ${req.params.tenantId} RETURNING *
    ), audit AS (
      INSERT INTO platform_access_audit (subject_user_id, actor_user_id, details)
      SELECT ${res.locals.auth.userId}, ${res.locals.auth.userId},
        ${JSON.stringify({ tenantId: req.params.tenantId, status: result.data.status, action: 'tenant_access' })}::jsonb FROM updated
    ) SELECT clerk_org_id AS "tenantId", status FROM updated`;
    if (!rows[0]) return res.status(404).json({ error: 'Business not found.' });
    res.json({ tenant: rows[0] });
  });
  app.patch('/api/platform/users/:userId', async (req, res) => {
    const result = accessUpdateSchema.safeParse(req.body);
    if (!result.success || !/^user_[a-zA-Z0-9_]+$/.test(req.params.userId)) return res.status(400).json({ error: 'Check the status, plan name, and expiry date.' });
    if (admins.has(req.params.userId)) return res.status(403).json({ error: 'Superadmins are managed through the server configuration.' });
    const { status, planName, durationMonths } = result.data;
    const expiresAt = durationMonths ? addPlanMonths(new Date(), durationMonths).toISOString() : result.data.expiresAt;
    const rows = await database()`WITH updated AS (
      UPDATE platform_users SET status = ${status}, plan_name = ${planName}, expires_at = ${expiresAt},
        reviewed_by = ${res.locals.auth.userId}, updated_at = now()
      WHERE clerk_user_id = ${req.params.userId} RETURNING *
    ), audit AS (
      INSERT INTO platform_access_audit (subject_user_id, actor_user_id, details)
      SELECT clerk_user_id, ${res.locals.auth.userId}, ${JSON.stringify({ status, planName, expiresAt, ...(durationMonths ? { durationMonths } : {}) })}::jsonb FROM updated
    ) SELECT * FROM updated`;
    if (!rows[0]) return res.status(404).json({ error: 'This account has not requested app access yet.' });
    res.json({ user: publicUser(rows[0], admins) });
  });
}

export function requireApprovedAccess(database, admins) {
  return async (_req, res, next) => {
    const { userId, orgId } = res.locals.auth;
    if (admins.has(userId)) return next();
    const rows = await database()`SELECT status, expires_at FROM platform_users WHERE clerk_user_id = ${userId}`;
    const access = accessDecision(rows[0], false);
    if (!access.allowed) return res.status(403).json({ code: `ACCESS_${access.status.toUpperCase()}`, error: messages[access.status] });
    if (orgId) {
      const tenants = await database()`SELECT status FROM platform_tenants WHERE clerk_org_id = ${orgId}`;
      if (tenants[0]?.status === 'paused') return res.status(403).json({ code: 'ACCESS_TENANT_PAUSED', error: 'This business workspace is paused. Contact the platform administrator.' });
    }
    next();
  };
}
