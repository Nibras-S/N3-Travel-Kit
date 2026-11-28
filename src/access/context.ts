import { createContext, useContext } from 'react';

export interface PlatformAccess {
  userId: string;
  email: string;
  isSuperadmin: boolean;
  allowed: boolean;
  status: 'pending' | 'approved' | 'suspended' | 'expired' | 'superadmin' | 'tenant_paused';
  planName: string;
  allowedTools: string[];
  expiresAt: string | null;
}
export interface PlatformAccessValue {
  access: PlatformAccess;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  refreshAccess: () => Promise<void>;
}
export const PlatformAccessContext = createContext<PlatformAccessValue | null>(null);
export function usePlatformAccess() {
  const value = useContext(PlatformAccessContext);
  if (!value) throw new Error('Platform access context is required.');
  return value;
}
