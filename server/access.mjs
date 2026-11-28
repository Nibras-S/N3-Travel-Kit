import { z } from 'zod';

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
  planName: z.string().trim().min(1).max(60),
  expiresAt: z.union([z.iso.datetime({ offset: true }), z.null()]),
}).strict();

function publicUser(row, admins) {
  return {
    userId: row.clerk_user_id, email: row.email, name: row.display_name,
    status: row.status, planName: row.plan_name, expiresAt: row.expires_at,
    isSuperadmin: admins.has(row.clerk_user_id), createdAt: row.created_at,
  };
}

export function mountAccessRoutes(app, { database, loadUser, admins }) {
  app.get('/api/access', async (_req, res) => {
    const { userId } = res.locals.auth;
    const sql = database();
    let rows = await sql`SELECT * FROM platform_users WHERE clerk_user_id = ${userId}`;
    if (!rows[0]) {
      // Resolve identity from Clerk on the server; never accept an email or role
      // supplied by the browser as proof of account ownership.
      const user = await loadUser(userId);
      const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
      const email = primary?.emailAddress || '';
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '';
      rows = await sql`INSERT INTO platform_users (clerk_user_id, email, display_name)
        VALUES (${userId}, ${email}, ${name}) ON CONFLICT (clerk_user_id) DO UPDATE
        SET email = EXCLUDED.email, display_name = EXCLUDED.display_name RETURNING *`;
    }
    const row = rows[0];
    const isSuperadmin = admins.has(userId);
    res.json({ userId, email: row.email, isSuperadmin, ...accessDecision(row, isSuperadmin), planName: row.plan_name, expiresAt: row.expires_at });
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
  app.patch('/api/platform/users/:userId', async (req, res) => {
    const result = accessUpdateSchema.safeParse(req.body);
    if (!result.success || !/^user_[a-zA-Z0-9_]+$/.test(req.params.userId)) return res.status(400).json({ error: 'Check the status, plan name, and expiry date.' });
    if (admins.has(req.params.userId)) return res.status(403).json({ error: 'Superadmins are managed through the server configuration.' });
    const { status, planName, expiresAt } = result.data;
    const rows = await database()`WITH updated AS (
      UPDATE platform_users SET status = ${status}, plan_name = ${planName}, expires_at = ${expiresAt},
        reviewed_by = ${res.locals.auth.userId}, updated_at = now()
      WHERE clerk_user_id = ${req.params.userId} RETURNING *
    ), audit AS (
      INSERT INTO platform_access_audit (subject_user_id, actor_user_id, details)
      SELECT clerk_user_id, ${res.locals.auth.userId}, ${JSON.stringify({ status, planName, expiresAt })}::jsonb FROM updated
    ) SELECT * FROM updated`;
    if (!rows[0]) return res.status(404).json({ error: 'This account has not requested app access yet.' });
    res.json({ user: publicUser(rows[0], admins) });
  });
}

export function requireApprovedAccess(database, admins) {
  return async (_req, res, next) => {
    const { userId } = res.locals.auth;
    if (admins.has(userId)) return next();
    const rows = await database()`SELECT status, expires_at FROM platform_users WHERE clerk_user_id = ${userId}`;
    const access = accessDecision(rows[0], false);
    if (!access.allowed) return res.status(403).json({ code: `ACCESS_${access.status.toUpperCase()}`, error: messages[access.status] });
    next();
  };
}
