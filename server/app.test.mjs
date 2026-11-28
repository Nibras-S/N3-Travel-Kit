import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.mjs';

// Substitute verified-session/database/storage adapters to test API boundaries
// without creating real accounts or touching customer data.
test('API isolates organizations and enforces branding permissions', async (t) => {
  const queries = [];
  const objects = [];
  const sessions = {
    adminA: { userId: 'user_a', orgId: 'org_a', orgRole: 'org:admin' },
    memberB: { userId: 'user_b', orgId: 'org_b', orgRole: 'org:member' },
    personal: { userId: 'user_c' },
  };
  const rows = {
    org_a: { name: 'Agency A', address_line1: 'A Street', address_line2: '', phone: '111', additional_phone: '', email: '', logo_key: 'tenants/org_a/logos/a' },
    org_b: { name: 'Agency B', address_line1: 'B Street', address_line2: '', phone: '222', additional_phone: '', email: '', logo_key: 'tenants/org_b/logos/b' },
  };
  const app = createApp({
    platformAdminIds: new Set(['user_a', 'user_b', 'user_c']),
    authMiddleware: (_req, _res, next) => next(),
    readAuth: (req) => sessions[req.headers.authorization?.replace('Bearer ', '')] || {},
    sqlClient: async (strings, ...values) => {
      queries.push({ sql: strings.join('?'), values });
      if (strings[0].startsWith('INSERT')) {
        assert.equal(values[0], 'org_a');
        return [{ ...rows.org_a, name: values[1] }];
      }
      assert.equal(strings.join('?').includes('WHERE clerk_org_id = '), true);
      return rows[values.at(-1)] ? [rows[values.at(-1)]] : [];
    },
    objectClient: { send: async (command) => {
      objects.push(command.input);
      return { ContentType: 'image/png', Body: { transformToByteArray: async () => Buffer.from([137,80,78,71,13,10,26,10]) } };
    } },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, token, options = {}) => fetch(`${base}/api${path}`, {
    ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  assert.equal((await call('/tenant')).status, 401);
  assert.equal((await call('/tenant', 'personal')).status, 403);
  assert.equal(queries.length, 0);
  assert.equal((await call('/tenant', 'memberB', { method: 'PUT' })).status, 403);
  assert.equal((await call('/tenant/logo', 'memberB', { method: 'PUT' })).status, 403);
  assert.equal((await call('/tenant/logo', 'memberB', { method: 'DELETE' })).status, 403);
  assert.equal(queries.length, 0);
  for (const [token, name] of [['adminA', 'Agency A'], ['memberB', 'Agency B']]) {
    const response = await call('/tenant', token);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.branding.name, name);
    assert.equal('logo_key' in result.branding, false);
  }
  const before = queries.length;
  assert.equal((await call('/tenant', 'adminA', { headers: { 'X-Tenant-ID': 'org_b' } })).status, 409);
  assert.equal(queries.length, before);
  const forged = await call('/tenant', 'adminA', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Hacked', orgId: 'org_b' }) });
  assert.equal(forged.status, 400);
  assert.equal(queries.length, before);
  const saved = await call('/tenant', 'adminA', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Updated A', addressLine1: 'A Street', addressLine2: '', phone: '111', additionalPhone: '', email: '' }),
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).branding.name, 'Updated A');
  assert.equal(queries.at(-1).values[0], 'org_a');
  assert.equal((await call('/tenant/logo?key=tenants/org_a/logos/a', 'memberB')).status, 200);
  assert.equal(objects[0].Key, 'tenants/org_b/logos/b');
  const invalid = await call('/tenant/logo', 'adminA', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: '<svg>spoofed</svg>' });
  assert.equal(invalid.status, 400);
  const oversized = await call('/tenant/logo', 'adminA', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: Buffer.alloc(2 * 1024 * 1024 + 1) });
  assert.equal(oversized.status, 413);
});
