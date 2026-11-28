import { createContext, useContext } from 'react';
import type { TenantBranding } from './types';

export interface TenantContextValue {
  tenantId: string;
  revision: number;
  userId: string;
  branding: TenantBranding;
  isAdmin: boolean;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
}
export const TenantContext = createContext<TenantContextValue | null>(null);
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('Tenant context is required.');
  return context;
}
