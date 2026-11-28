import test from 'node:test';
import assert from 'node:assert/strict';
import { brandingSchema, tenantIdentity, imageType } from './security.mjs';

test('requires a signed-in user AND an active organization', () => {
  assert.equal(tenantIdentity({}).status, 401);
  assert.equal(tenantIdentity({ userId: 'user_a' }).status, 403);
  assert.deepEqual(tenantIdentity({ userId: 'user_a', orgId: 'org_a', orgRole: 'org:member' }), { orgId: 'org_a', isAdmin: false });
  assert.equal(tenantIdentity({ userId: 'user_b', orgId: 'org_b', orgRole: 'org:admin' }).isAdmin, true);
});

test('branding cannot supply a tenant ID, logo key, or administrative role', () => {
  const valid = { name: 'Travel A', addressLine1: '', addressLine2: '', phone: '', additionalPhone: '', email: '' };
  assert.equal(brandingSchema.safeParse(valid).success, true);
  for (const extra of [{ orgId: 'org_victim' }, { logoKey: 'tenants/org_victim/logo' }, { isAdmin: true }]) {
    assert.equal(brandingSchema.safeParse({ ...valid, ...extra }).success, false);
  }
  assert.equal(brandingSchema.safeParse({ ...valid, name: ' ' }).success, false);
  assert.equal(brandingSchema.safeParse({ ...valid, email: 'invalid' }).success, false);
  assert.equal(brandingSchema.safeParse({ ...valid, phone: 'x'.repeat(31) }).success, false);
});

test('logo validation rejects SVG, HTML, and spoofed image content', () => {
  assert.equal(imageType(Buffer.from('<svg><script>alert(1)</script></svg>')), null);
  assert.equal(imageType(Buffer.from('<html>not a PNG</html>')), null);
  assert.equal(imageType(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png');
  assert.equal(imageType(Buffer.from([255,216,255,224])), 'image/jpeg');
  assert.equal(imageType(Buffer.from('RIFF1234WEBP')), 'image/webp');
});
