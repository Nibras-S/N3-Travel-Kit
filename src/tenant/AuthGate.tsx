import { ClerkProvider, SignIn, OrganizationSwitcher, CreateOrganization, UserButton, useAuth } from '@clerk/react';
import { Alert, Center, Group, Image, Loader, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { TenantProvider } from './TenantProvider';

function WorkspaceGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, orgId, userId } = useAuth();
  if (!isLoaded) return <Center mih="100vh"><Loader /></Center>;
  if (!isSignedIn) return <Center mih="100vh"><Stack align="center" p="xl"><Image src="/N3TravelKit.png" alt="N3 Travel Kit" w={180} /><SignIn routing="hash" /></Stack></Center>;
  if (!orgId) return <Center mih="100vh"><Stack align="center" p="xl"><Title order={2}>Your travel workspace</Title><Text>Select a business or create one to get started.</Text><Group><OrganizationSwitcher hidePersonal /><UserButton /></Group><CreateOrganization routing="hash" afterCreateOrganizationUrl="/" /></Stack></Center>;
  return <TenantProvider key={`${userId}:${orgId}`}>{children}</TenantProvider>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!key) return <Center mih="100vh"><Stack maw={520} p="xl"><Image src="/N3TravelKit.png" alt="N3 Travel Kit" w={180} /><Title order={2}>Workspace setup required</Title><Alert>Authentication is not configured yet. Follow the project README to connect Clerk, Neon, and R2.</Alert></Stack></Center>;
  return <ClerkProvider publishableKey={key}><WorkspaceGate>{children}</WorkspaceGate></ClerkProvider>;
}
