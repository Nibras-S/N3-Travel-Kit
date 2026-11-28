import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { accessDecision, accessUpdateSchema } from './access.mjs';
import { addPlanMonths, allowedTools, normalizePlan, ALL_TOOLS } from '../shared/plans.mjs';

test('Pro allows flight and visa tools; Pro Max and superadmins allow all tools; legacy plans default to Pro', () => {
  assert.deepEqual(allowedTools('Pro'), ['flight', 'bahrain', 'qatar', 'uae', 'oman', 'saudi']);
  assert.deepEqual(allowedTools('Pro Max'), [...ALL_TOOLS]);
  assert.deepEqual(allowedTools('Pro', true), [...ALL_TOOLS]);
  for (const plan of ['Standard', 'anything', null, undefined]) {
    assert.equal(normalizePlan(plan), 'Pro');
    assert.deepEqual(allowedTools(plan), ['flight', 'bahrain', 'qatar', 'uae', 'oman', 'saudi']);
  }
  assert.equal(accessUpdateSchema.safeParse({ status: 'approved', planName: 'anything', expiresAt: null }).success, false);
});

test('monthly plans clamp month ends and support leap years', () => {
  assert.equal(addPlanMonths('2026-01-31T12:30:00Z', 1).toISOString(), '2026-02-28T12:30:00.000Z');
  assert.equal(addPlanMonths('2028-01-31T12:30:00Z', 1).toISOString(), '2028-02-29T12:30:00.000Z');
  assert.equal(addPlanMonths('2026-12-31T12:30:00Z', 2).toISOString(), '2027-02-28T12:30:00.000Z');
  assert.equal(accessUpdateSchema.safeParse({ status: 'approved', planName: 'Pro', expiresAt: null, durationMonths: 3 }).success, false);
});

test('approval is denied by default, paused/expired users are denied, and organization roles cannot elevate platform access', () => {
  assert.deepEqual(accessDecision(undefined, false), { allowed: false, status: 'pending' });
  assert.equal(accessDecision({ status: 'pending' }, false).allowed, false);
  assert.equal(accessDecision({ status: 'suspended' }, false).status, 'suspended');
  assert.equal(accessDecision({ status: 'approved', expires_at: '2020-01-01T00:00:00Z' }, false).status, 'expired');
  assert.equal(accessDecision({ status: 'approved', expires_at: new Date(1000).toISOString() }, false, 1000).status, 'expired');
  assert.equal(accessDecision({ status: 'approved', expires_at: null }, false).allowed, true);
  assert.equal(accessDecision(undefined, true).status, 'superadmin');
  assert.equal(accessUpdateSchema.safeParse({ status: 'approved', planName: 'Pro', expiresAt: null, isSuperadmin: true }).success, false);
});

test('superadmin approval, plan pause/expiry, and attempted escalation are enforced at API boundaries', async (t) => {
  const rows = new Map([
    ['user_owner', { clerk_user_id: 'user_owner', email: 'owner@example.test', status: 'pending', display_name: '', plan_name: 'Standard', expires_at: null }],
    ['user_customer', { clerk_user_id: 'user_customer', email: 'customer@example.test', status: 'pending', display_name: '', plan_name: 'Standard', expires_at: null }],
    ['user_teammate', { clerk_user_id: 'user_teammate', email: 'teammate@example.test', status: 'approved', display_name: '', plan_name: 'Standard', expires_at: null }],
  ]);
  const audit = [];
  const tenants = new Map();
  const sessions = {
    owner: { userId: 'user_owner' },
    customer: { userId: 'user_customer', orgId: 'org_customer', orgRole: 'org:admin' },
    teammate: { userId: 'user_teammate', orgId: 'org_customer', orgRole: 'org:member' },
    fresh: { userId: 'user_fresh' },
  };
  const app = createApp({
    authMiddleware: (_req, _res, next) => next(),
    readAuth: (req) => sessions[req.headers.authorization?.replace('Bearer ', '')] || {},
    platformAdminIds: new Set(['user_owner']),
    loadUser: async (id) => ({ id, firstName: 'Verified', lastName: 'Account', primaryEmailAddressId: 'email_server', emailAddresses: [{ id: 'email_server', emailAddress: 'server-verified@example.test' }] }),
    sqlClient: async (strings, ...values) => {
      const statement = strings.join('?');
      if (statement.includes('UPDATE platform_tenants')) {
        const [status, , tenantId] = values;
        if (!tenants.has(tenantId)) return [];
        tenants.set(tenantId, { status });
        return [{ tenantId, status }];
      }
      if (statement.startsWith('INSERT INTO platform_tenants')) {
        if (!tenants.has(values[0])) tenants.set(values[0], { status: 'active' });
        return [tenants.get(values[0])];
      }
      if (statement.includes('FROM platform_tenants')) return tenants.has(values[0]) ? [tenants.get(values[0])] : [];
      if (statement.startsWith('WITH updated')) {
        const [status, planName, expiresAt, reviewedBy, userId] = values;
        const row = rows.get(userId);
        if (!row) return [];
        Object.assign(row, { status, plan_name: planName, expires_at: expiresAt, reviewed_by: reviewedBy });
        audit.push({ actor: reviewedBy, subject: userId });
        return [row];
      }
      if (statement.startsWith('INSERT INTO platform_users')) {
        const [id, email, name] = values;
        const row = { clerk_user_id: id, email, display_name: name, status: 'pending', plan_name: 'Standard', expires_at: null };
        rows.set(id, row); return [row];
      }
      if (statement.includes('count(*)')) return [{ total: rows.size }];
      if (statement.includes('FROM platform_users') && statement.includes('ILIKE')) return [...rows.values()];
      if (statement.includes('FROM platform_users')) return rows.has(values[0]) ? [rows.get(values[0])] : [];
      if (statement.includes('FROM tenant_branding')) return [];
      throw new Error('Unexpected test query');
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (path, token, init = {}) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  const update = (token, payload, id = 'user_customer') => call(`/platform/users/${id}`, token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const approved = { status: 'approved', planName: 'Pro', expiresAt: null };
  assert.equal((await call('/tenant', 'customer')).status, 403);
  const pendingAccess = await (await call('/access', 'customer')).json();
  assert.equal(pendingAccess.status, 'pending');
  assert.deepEqual(pendingAccess.allowedTools, []);
  assert.equal((await call('/platform/users', 'customer')).status, 403);
  assert.equal((await update('customer', approved)).status, 403);
  assert.equal((await call('/platform/users', 'owner')).status, 200); // no organization required
  assert.deepEqual((await (await call('/access', 'owner')).json()).allowedTools, [...ALL_TOOLS]);
  assert.equal((await update('owner', { ...approved, isSuperadmin: true })).status, 400);
  assert.equal((await update('owner', approved, 'user_owner')).status, 403);
  assert.equal((await update('owner', approved)).status, 200);
  assert.equal((await call('/tenant', 'customer')).status, 200);
  assert.equal((await (await call('/access', 'customer')).json()).allowed, true);
  const tenantUpdate = (token, status) => call('/platform/tenants/org_customer', token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  assert.equal((await tenantUpdate('customer', 'paused')).status, 403);
  assert.equal((await tenantUpdate('owner', 'paused')).status, 200);
  assert.equal((await call('/tenant', 'customer')).status, 403);
  assert.equal((await call('/tenant', 'teammate')).status, 403);
  assert.equal((await (await call('/access', 'customer')).json()).status, 'tenant_paused');
  assert.equal((await tenantUpdate('owner', 'active')).status, 200);
  assert.equal((await call('/tenant', 'teammate')).status, 200);
  assert.deepEqual(audit[0], { actor: 'user_owner', subject: 'user_customer' });
  assert.equal((await update('owner', { ...approved, status: 'suspended' })).status, 200);
  assert.equal((await call('/tenant', 'customer')).status, 403); // same signed-in session
  assert.equal((await (await call('/access', 'customer')).json()).status, 'suspended');
  assert.equal((await update('owner', { ...approved, expiresAt: '2020-01-01T00:00:00Z' })).status, 200);
  assert.equal((await call('/tenant', 'customer')).status, 403);
  assert.equal((await (await call('/access', 'customer')).json()).status, 'expired');
  const fresh = await (await call('/access', 'fresh')).json();
  assert.equal(fresh.allowed, false);
  assert.equal(fresh.email, 'server-verified@example.test');
  assert.equal(fresh.isSuperadmin, false);
  for (const durationMonths of [1, 2]) {
    const before = addPlanMonths(new Date(), durationMonths).getTime();
    assert.equal((await update('owner', { ...approved, durationMonths })).status, 200);
    const expiry = new Date(rows.get('user_customer').expires_at).getTime();
    assert.ok(expiry >= before && expiry <= addPlanMonths(new Date(), durationMonths).getTime());
    assert.equal((await call('/tenant', 'customer')).status, 200);
  }
  assert.deepEqual((await (await call('/access', 'customer')).json()).allowedTools, ['flight', 'bahrain', 'qatar', 'uae', 'oman', 'saudi']);
  assert.equal((await update('customer', { ...approved, planName: 'Pro Max' })).status, 403);
  assert.equal((await update('owner', { ...approved, planName: 'Pro Max' })).status, 200);
  assert.deepEqual((await (await call('/access', 'customer')).json()).allowedTools, [...ALL_TOOLS]);
  assert.equal((await update('owner', approved)).status, 200);
  assert.deepEqual((await (await call('/access', 'customer')).json()).allowedTools, ['flight', 'bahrain', 'qatar', 'uae', 'oman', 'saudi']);
});

test('only superadmins can see workspace identities; Clerk names and members identify businesses without branding', async (t) => {
  const calls = [];
  const app = createApp({
    authMiddleware: (_req, _res, next) => next(),
    readAuth: (req) => ({ userId: req.headers.authorization === 'Bearer owner' ? 'user_owner' : 'user_member' }),
    platformAdminIds: new Set(['user_owner']),
    sqlClient: async (strings) => strings.join('').includes('count(*)') ? [{ total: 2 }] : [
      { tenantId: 'org_one', name: null, status: 'active', email: '', phone: '' },
      { tenantId: 'org_two', name: 'Saved business name', status: 'paused', email: '', phone: '' },
    ],
    loadTenantIdentity: async (id) => {
      calls.push(id);
      if (id === 'org_two') throw new Error('Clerk unavailable');
      return { name: 'N3 Travels', memberCount: 1, members: [{ userId: 'user_owner', name: 'Nibras', identifier: 'owner@example.test', role: 'org:admin' }] };
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api/platform/tenants`;
  assert.equal((await fetch(base, { headers: { Authorization: 'Bearer member' } })).status, 403);
  assert.equal(calls.length, 0);
  const response = await fetch(base, { headers: { Authorization: 'Bearer owner' } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.tenants[0].name, 'N3 Travels');
  assert.equal(body.tenants[0].members[0].identifier, 'owner@example.test');
  assert.equal(body.tenants[0].members[0].role, 'org:admin');
  assert.equal(body.tenants[1].name, 'Saved business name');
  assert.equal(body.tenants[1].identityUnavailable, true);
  assert.equal(body.total, 2);
});
