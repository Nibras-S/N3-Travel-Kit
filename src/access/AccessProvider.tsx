import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth, UserButton } from '@clerk/react';
import { Alert, Button, Center, Loader, Stack, Title } from '@mantine/core';
import { PlatformAccessContext, type PlatformAccess } from './context';

export function AccessProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [access, setAccess] = useState<PlatformAccess | null>(null);
  const [error, setError] = useState('');
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Please sign in again.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`/api${path}`, { ...init, headers, cache: 'no-store' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (typeof body.code === 'string' && body.code.startsWith('ACCESS_')) {
        setAccess((current) => current ? { ...current, allowed: false, status: body.code.replace('ACCESS_', '').toLowerCase() as PlatformAccess['status'] } : current);
      }
      throw new Error(body.error || 'Unable to check app access.');
    }
    return response;
  }, [getToken]);
  const refreshAccess = useCallback(async () => {
    const result = await (await request('/access')).json() as PlatformAccess;
    setAccess(result);
    setError('');
  }, [request]);
  useEffect(() => {
    const refresh = () => { void refreshAccess().catch((e: Error) => setError(e.message)); };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [refreshAccess]);
  if (error) return <Center mih="100vh"><Stack maw={480} p="xl"><Title order={2}>Unable to verify access</Title><Alert color="red">{error}</Alert><Button onClick={() => void refreshAccess().catch((e: Error) => setError(e.message))}>Try again</Button><UserButton /></Stack></Center>;
  if (!access) return <Center mih="100vh"><Loader /></Center>;
  return <PlatformAccessContext.Provider value={{ access, request, refreshAccess }}>{children}</PlatformAccessContext.Provider>;
}
