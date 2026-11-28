import { useCallback, useEffect, useState } from 'react';
import { UserButton } from '@clerk/react';
import { Alert, Badge, Box, Button, Container, Group, Image, Loader, Paper, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { usePlatformAccess } from './context';
import { TenantAdministration } from './TenantAdministration';

interface ManagedUser {
  userId: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'suspended';
  planName: string;
  expiresAt: string | null;
  isSuperadmin: boolean;
}
function localDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function UserRow({ user, onSaved }: { user: ManagedUser; onSaved: () => Promise<void> }) {
  const { request } = usePlatformAccess();
  const [status, setStatus] = useState(user.status);
  const [planName, setPlanName] = useState(user.planName);
  const [expiry, setExpiry] = useState(localDate(user.expiresAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const expired = user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now();
  async function save() {
    setBusy(true); setError('');
    try {
      await request(`/platform/users/${encodeURIComponent(user.userId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, planName, expiresAt: expiry ? new Date(expiry).toISOString() : null }),
      });
      await onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update access.'); }
    finally { setBusy(false); }
  }
  return <Table.Tr>
    <Table.Td miw={220}><Text fw={600}>{user.name || user.email || 'New account'}</Text><Text size="sm" c="dimmed">{user.email}</Text><Text size="xs" c="dimmed">{user.userId}</Text>{error && <Text size="sm" c="red">{error}</Text>}</Table.Td>
    <Table.Td miw={160}><Badge mb="xs" color={user.isSuperadmin ? 'violet' : user.status === 'approved' && !expired ? 'green' : 'orange'}>{user.isSuperadmin ? 'Superadmin' : expired && user.status === 'approved' ? 'Expired' : user.status === 'suspended' ? 'Paused' : user.status}</Badge>
      {!user.isSuperadmin && <Select aria-label={`Access status for ${user.email}`} value={status} data={[{ value: 'pending', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'suspended', label: 'Paused' }]} onChange={(value) => setStatus(value as ManagedUser['status'])} disabled={busy} allowDeselect={false} />}
    </Table.Td>
    <Table.Td miw={140}><TextInput aria-label={`Plan for ${user.email}`} value={planName} onChange={(e) => setPlanName(e.currentTarget.value)} maxLength={60} disabled={busy || user.isSuperadmin} /></Table.Td>
    <Table.Td miw={220}><TextInput aria-label={`Plan expiry for ${user.email}`} type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.currentTarget.value)} disabled={busy || user.isSuperadmin} /><Text size="xs" c="dimmed">Local time · empty means no expiry</Text></Table.Td>
    <Table.Td><Button size="xs" loading={busy} disabled={user.isSuperadmin || !planName.trim()} onClick={() => void save()}>Save access</Button></Table.Td>
  </Table.Tr>;
}

export function PlatformAdmin() {
  const { request } = usePlatformAccess();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await request(`/platform/users?search=${encodeURIComponent(search)}&offset=${offset}`);
      const result = await response.json() as { users: ManagedUser[]; total: number };
      setUsers(result.users); setTotal(result.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load accounts.'); }
    finally { setLoading(false); }
  }, [request, search, offset]);
  useEffect(() => { void load(); }, [load]);
  return <Box mih="100vh" bg="#f8fafc"><Paper p="md" withBorder radius={0}><Group justify="space-between"><Image src="/N3TravelKit.png" alt="N3 Travel Kit" w={130} /><Group><Button variant="light" onClick={() => { window.location.hash = '#/'; }}>Open travel tools</Button><UserButton /></Group></Group></Paper>
    <Container size="xl" py="xl"><Stack><Group justify="space-between"><div><Title order={2}>Platform administration</Title><Text c="dimmed">Approve accounts, manage plan expiry, and pause user access.</Text></div><Badge color="violet">Superadmin</Badge></Group>
      <Alert>New sign-ins require approval. Pausing a user blocks their server access immediately; open tool screens recheck access within 30 seconds. These controls manage app access, not payment collection.</Alert>
      <form onSubmit={(e) => { e.preventDefault(); setOffset(0); setSearch(query); }}><Group><TextInput placeholder="Search name, email, or user ID" aria-label="Search accounts" value={query} onChange={(e) => setQuery(e.currentTarget.value)} style={{ flex: 1 }} /><Button type="submit">Search</Button><Button variant="default" onClick={() => void load()}>Refresh</Button></Group></form>
      {error && <Alert color="red">{error}</Alert>}{loading && <Loader size="sm" />}
      <Paper p="md" withBorder radius="md"><Table.ScrollContainer minWidth={900}><Table verticalSpacing="md"><Table.Thead><Table.Tr><Table.Th>Account</Table.Th><Table.Th>Access</Table.Th><Table.Th>Plan</Table.Th><Table.Th>Expires</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{users.map((user) => <UserRow key={`${user.userId}:${user.status}:${user.planName}:${user.expiresAt}`} user={user} onSaved={load} />)}</Table.Tbody></Table></Table.ScrollContainer>{!loading && !users.length && <Text ta="center" c="dimmed" p="xl">No accounts found. Users appear after their first sign-in to the app.</Text>}</Paper>
      <Group justify="space-between"><Text size="sm">{total} account{total === 1 ? '' : 's'}</Text><Group><Button variant="default" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous</Button><Button variant="default" disabled={offset + 25 >= total || loading} onClick={() => setOffset(offset + 25)}>Next</Button></Group></Group>
      <TenantAdministration />
    </Stack></Container>
  </Box>;
}
