import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Group, Loader, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { usePlatformAccess } from './context';

interface ManagedTenant {
  tenantId: string;
  name: string;
  status: 'active' | 'paused';
  phone: string | null;
  email: string | null;
}

export function TenantAdministration() {
  const { request } = usePlatformAccess();
  const [tenants, setTenants] = useState<ManagedTenant[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await (await request(`/platform/tenants?offset=${offset}`)).json() as { tenants: ManagedTenant[]; total: number };
      setTenants(result.tenants); setTotal(result.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load businesses.'); }
    finally { setLoading(false); }
  }, [request, offset]);
  useEffect(() => { void load(); }, [load]);
  async function change(tenant: ManagedTenant) {
    setBusy(tenant.tenantId); setError('');
    try {
      await request(`/platform/tenants/${encodeURIComponent(tenant.tenantId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: tenant.status === 'active' ? 'paused' : 'active' }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update business access.'); }
    finally { setBusy(''); }
  }
  return <Stack mt="xl">
    <Group justify="space-between"><Title order={3}>Business workspaces</Title><Button variant="default" disabled={Boolean(busy)} onClick={() => void load()}>Refresh businesses</Button></Group>
    <Text c="dimmed">Pause a business to block access for all of its members. Resuming restores access for approved users with an active plan. Superadmins retain access to manage the platform.</Text>
    {error && <Alert color="red">{error}</Alert>}{loading && <Loader size="sm" />}
    <Paper p="md" withBorder radius="md"><Table.ScrollContainer minWidth={600}><Table verticalSpacing="md">
      <Table.Thead><Table.Tr><Table.Th>Business</Table.Th><Table.Th>Contact</Table.Th><Table.Th>Status</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>{tenants.map((tenant) => <Table.Tr key={tenant.tenantId}>
        <Table.Td><Text fw={600}>{tenant.name}</Text><Text size="xs" c="dimmed">{tenant.tenantId}</Text></Table.Td>
        <Table.Td><Text size="sm">{tenant.phone || '—'}</Text><Text size="sm">{tenant.email}</Text></Table.Td>
        <Table.Td><Badge color={tenant.status === 'active' ? 'green' : 'orange'}>{tenant.status}</Badge></Table.Td>
        <Table.Td><Button size="xs" color={tenant.status === 'active' ? 'orange' : 'green'} loading={busy === tenant.tenantId} disabled={Boolean(busy) && busy !== tenant.tenantId} onClick={() => void change(tenant)}>{tenant.status === 'active' ? 'Pause business' : 'Resume business'}</Button></Table.Td>
      </Table.Tr>)}</Table.Tbody>
    </Table></Table.ScrollContainer>{!loading && !tenants.length && <Text ta="center" c="dimmed" p="xl">Businesses appear after an approved user opens their workspace.</Text>}</Paper>
    <Group justify="space-between"><Text size="sm">{total} businesses</Text><Group><Button variant="default" disabled={offset === 0 || loading || Boolean(busy)} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous businesses</Button><Button variant="default" disabled={offset + 25 >= total || loading || Boolean(busy)} onClick={() => setOffset(offset + 25)}>Next businesses</Button></Group></Group>
  </Stack>;
}
