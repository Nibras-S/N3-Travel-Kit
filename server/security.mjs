import { z } from 'zod';

export const brandingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  addressLine1: z.string().trim().max(160),
  addressLine2: z.string().trim().max(160),
  phone: z.string().trim().max(30),
  additionalPhone: z.string().trim().max(30),
  email: z.union([z.literal(''), z.email().max(254)]),
}).strict();

export function tenantIdentity(auth) {
  if (!auth.userId) return { status: 401, error: 'Sign in to continue.' };
  if (!auth.orgId) return { status: 403, error: 'Select an organization to continue.' };
  return { orgId: auth.orgId, isAdmin: auth.orgRole === 'org:admin' };
}

export function imageType(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
