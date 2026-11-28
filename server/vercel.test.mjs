import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';

// The deployment entry must dispatch the original /api URL into Express,
// including nested routes, while keeping all protected endpoints authenticated.
test('Vercel explicitly rewrites nested API URLs to the protected Node entry', async (t) => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrite = config.rewrites.find((rule) => rule.destination === '/api');
  assert.ok(rewrite, 'All API paths need an explicit rewrite to api/index.js');
  const matcher = new RegExp(`^${rewrite.source}$`);
  process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from('verification.clerk.accounts.dev$').toString('base64')}`;
  process.env.CLERK_SECRET_KEY = 'sk_test_deployment_verification';
  const { default: app } = await import('../api/index.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal(health.headers.get('Cache-Control'), 'no-store');
  for (const path of ['/api/access', '/api/platform/users?search=&offset=0', '/api/platform/tenants', '/api/tenant', '/api/tenant/logo']) {
    assert.equal(matcher.test(path.split('?')[0]), true, `${path} must select the API function`);
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 401, `${path} should reach auth middleware rather than a missing function`);
  }
  for (const path of ['/api/platform/users/user_customer', '/api/platform/tenants/org_customer']) {
    assert.equal(matcher.test(path), true);
    assert.equal((await fetch(`${base}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  }
  assert.equal(matcher.test('/assets/main.js'), false, 'Static frontend assets must remain outside the API rewrite');
});
