import { useState } from 'react';
import { Alert, Box, Button, FileInput, Group, Image, Paper, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import Layout from '../components/Layout';
import { useTenant } from './context';

export default function TenantSettings() {
  const { branding, isAdmin, request, refresh } = useTenant();
  const [form, setForm] = useState(branding);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const { name, addressLine1, addressLine2, phone, additionalPhone, email } = form;
      await request('/tenant', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, addressLine1, addressLine2, phone, additionalPhone, email }) });
      if (logo) {
        await request('/tenant/logo', { method: 'PUT', headers: { 'Content-Type': logo.type }, body: logo });
      }
      await refresh(); setLogo(null); setMessage('Business details saved. Your tools now use this branding.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }
  async function removeLogo() {
    setBusy(true); setError(''); setMessage('');
    try { await request('/tenant/logo', { method: 'DELETE' }); await refresh(); setLogo(null); setMessage('Logo removed. Your business name will be displayed.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove logo.'); }
    finally { setBusy(false); }
  }
  return <Layout title="Business settings" withBottomBorder><Box style={{ overflow: 'auto', flex: 1 }} p="xl" bg="#f8fafc"><Paper maw={800} mx="auto" p="xl" radius="lg" withBorder><Stack>
    <Title order={2}>{branding.name}</Title><Text c="dimmed">Customize your business details for invoices, posters, and brochures. N3 Travel Kit branding stays visible across the platform.</Text>
    {!isAdmin && <Alert>Only business admins can update these settings.</Alert>}
    {error && <Alert color="red">{error}</Alert>}{message && <Alert color="green">{message}</Alert>}
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}><Stack><fieldset disabled={!isAdmin || busy} style={{ border: 0, padding: 0, margin: 0 }}><Stack>
      <TextInput label="Business name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
      <TextInput label="Address line 1" maxLength={160} value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.currentTarget.value })} />
      <TextInput label="Address line 2" maxLength={160} value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.currentTarget.value })} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}><TextInput label="Mobile number" type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} /><TextInput label="Additional number" type="tel" maxLength={30} value={form.additionalPhone} onChange={(e) => setForm({ ...form, additionalPhone: e.currentTarget.value })} /></SimpleGrid>
      <TextInput label="Email address" type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} />
      {branding.logoUrl && <Image src={branding.logoUrl} alt={branding.name} w={180} h={80} fit="contain" />}
      <FileInput label="Business logo" description="PNG, JPEG, or WebP. Maximum 2 MB." accept="image/png,image/jpeg,image/webp" value={logo} clearable onChange={(file) => { if (file && file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB.'); return; } setError(''); setLogo(file); }} />
    </Stack></fieldset><Group><Button type="submit" disabled={!isAdmin} loading={busy}>Save business details</Button>{branding.hasLogo && <Button color="red" variant="subtle" disabled={!isAdmin || busy} onClick={() => void removeLogo()}>Remove logo</Button>}</Group></Stack></form>
    <Text size="xs" c="dimmed">Powered by N3 Travel Kit · N3 Global Tech</Text>
  </Stack></Paper></Box></Layout>;
}
