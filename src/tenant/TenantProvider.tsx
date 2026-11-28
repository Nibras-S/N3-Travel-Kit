import { usePlatformAccess } from "../access/context";
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth, useOrganization, OrganizationSwitcher, UserButton } from '@clerk/react';
import { Alert, Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { TenantContext } from './context';
import { emptyBranding, type TenantBranding } from './types';
import TenantSettings from './TenantSettings';
import { NavigationContext } from '../NavigationContext';

function readImage(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to load the business logo.'));
    reader.readAsDataURL(blob);
  });
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { orgId, userId, orgRole } = useAuth();
  const { request: platformRequest } = usePlatformAccess();
  const { organization } = useOrganization();
  // The gate keys this component by organization AND user; switching unmounts all drafts.
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [needsSetup, setNeedsSetup] = useState(false);
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('X-Tenant-ID', orgId || '');
    const response = await platformRequest(path, { ...init, headers });
    return response;
  }, [platformRequest, orgId]);
  const refresh = useCallback(async () => {
    const result = await (await request('/tenant')).json() as { branding: Omit<TenantBranding, 'logoUrl'> | null };
    const next = { ...emptyBranding(organization?.name || 'Your business'), ...result.branding };
    setNeedsSetup(!result.branding);
    if (next.hasLogo) next.logoUrl = await readImage(await (await request('/tenant/logo')).blob());
    setBranding(next);
    setRevision((value) => value + 1);
    setError('');
  }, [request, organization?.name]);
  useEffect(() => { void refresh().catch((e: Error) => setError(e.message)); }, [refresh]);
  if (error) return <Center mih="100vh"><Stack maw={520} p="xl"><Title order={2}>Workspace unavailable</Title><Alert color="red">{error}</Alert><Group><OrganizationSwitcher hidePersonal /><UserButton /></Group><Button onClick={() => void refresh().catch((e: Error) => setError(e.message))}>Try again</Button></Stack></Center>;
  if (!branding || !orgId || !userId) return <Center mih="100vh"><Stack align="center"><Loader /><Text>Loading your workspace…</Text></Stack></Center>;
  return <TenantContext.Provider value={{ tenantId: orgId, revision, userId, branding, isAdmin: orgRole === 'org:admin', request, refresh }}>{needsSetup ? <NavigationContext.Provider value={{ navigateHome: () => { window.location.hash = '#/'; }, navigate: (path) => { window.location.hash = `#/${path}`; } }}><TenantSettings onboarding /></NavigationContext.Provider> : children}</TenantContext.Provider>;
}
