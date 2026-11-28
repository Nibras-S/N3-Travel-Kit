import { useEffect, useState, type ReactNode } from 'react';
import { UserButton } from '@clerk/react';
import { Alert, Button, Center, Group, Image, Stack, Text, Title } from '@mantine/core';
import { usePlatformAccess } from './context';
import { PlatformAdmin } from './PlatformAdmin';

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
    if (access.isSuperadmin) return <PlatformAdmin />;
    return <Center mih="100vh"><Stack p="xl"><Alert color="red">Platform superadmin access is required.</Alert><Button onClick={() => { window.location.hash = '#/'; }}>Back to your workspace</Button></Stack></Center>;
  }
  if (access.allowed) return children;
  const message = access.status === 'pending'
    ? ['Awaiting approval', 'Your account is registered. A platform administrator must approve access before you can use the tools.']
    : access.status === 'expired'
      ? ['Plan expired', 'Contact the platform administrator to renew your plan.']
      : ['Access paused', 'Your access has been paused. Contact the platform administrator to reactivate your plan.'];
  return <Center mih="100vh"><Stack maw={500} p="xl" align="center">
    <Image src="/N3TravelKit.png" alt="N3 Travel Kit" w={200} />
    <Title order={2}>{message[0]}</Title><Text ta="center" c="dimmed">{message[1]}</Text><Text size="sm">{access.email}</Text>
    {error && <Alert color="red">{error}</Alert>}
    <Group><Button variant="light" onClick={() => void refreshAccess().catch((e: Error) => setError(e.message))}>Check approval status</Button><UserButton /></Group>
  </Stack></Center>;
}
