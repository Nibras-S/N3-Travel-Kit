import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { OrganizationSwitcher, UserButton } from '@clerk/react';
import { Alert, Button, Center, Group, Image, Loader, Stack, Text, Title } from '@mantine/core';
import { usePlatformAccess } from './context';
const PlatformAdmin = lazy(() => import('./PlatformAdmin').then((module) => ({ default: module.PlatformAdmin })));

export function AccessGate({ children }: { children: ReactNode }) {
  const { access, refreshAccess } = usePlatformAccess();
  const [path, setPath] = useState(window.location.hash);
  const [error, setError] = useState('');
  useEffect(() => {
    const changed = () => setPath(window.location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  if (path === '#/admin') {
    if (access.isSuperadmin) return <Suspense fallback={<Center mih="100vh"><Loader /></Center>}><PlatformAdmin /></Suspense>;
    return <Center mih="100vh"><Stack p="xl"><Alert color="red">Platform superadmin access is required.</Alert><Button onClick={() => { window.location.hash = '#/'; }}>Back to your workspace</Button></Stack></Center>;
  }
  if (access.allowed) return children;
  const message = access.status === 'pending'
    ? ['Account created — approval requested', 'Your email is verified and your access request has been submitted. Once the superadmin approves your account, you can use the app and set up your business logo, name, address, and mobile number. You can stay on this page or sign in again later.']
    : access.status === 'tenant_paused'
      ? ['Business access paused', 'Your business workspace has been paused by the superadmin. Contact the administrator to resume access. Your business details are saved.']
    : access.status === 'expired'
      ? ['Plan expired', 'Contact the platform administrator to renew your plan.']
      : ['Access paused', 'Your access has been paused. Contact the platform administrator to reactivate your plan.'];
  return <Center mih="100vh"><Stack maw={500} p="xl" align="center">
    <Image src="/N3TravelKit.png" alt="N3 Travel Kit" w={200} />
    <Title order={2}>{message[0]}</Title><Text ta="center" c="dimmed">{message[1]}</Text><Text size="sm">{access.email}</Text>
    {error && <Alert color="red">{error}</Alert>}
    {access.status === 'tenant_paused' && <OrganizationSwitcher hidePersonal />}
    <Group><Button variant="light" onClick={() => void refreshAccess().catch((e: Error) => setError(e.message))}>Check approval status</Button><UserButton /></Group>
  </Stack></Center>;
}
