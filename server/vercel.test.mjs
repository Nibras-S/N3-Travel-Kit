import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

// The deployment entry must dispatch the original /api URL into Express,
// including nested routes, while keeping all protected endpoints authenticated.
test('Vercel catch-all exports the protected API without starting a server', async (t) => {
  process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from('verification.clerk.accounts.dev$').toString('base64')}`;
  process.env.CLERK_SECRET_KEY = 'sk_test_deployment_verification';
  const { default: app } = await import('../api/[...path].js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal(health.headers.get('Cache-Control'), 'no-store');
  for (const path of ['/api/access', '/api/platform/users', '/api/tenant', '/api/tenant/logo']) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 401, `${path} should reach auth middleware rather than a missing function`);
  }
});
