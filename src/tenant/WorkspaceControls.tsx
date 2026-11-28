import { usePlatformAccess } from "../access/context";
import { OrganizationSwitcher, UserButton } from '@clerk/react';
import { Button, Group } from '@mantine/core';
import { useNavigation } from '../NavigationContext';
export function WorkspaceControls() {
  const { access } = usePlatformAccess();
  const { navigate } = useNavigation();
  return <Group gap="sm" wrap="wrap">{access.isSuperadmin && <Button variant="light" color="violet" size="xs" onClick={() => { window.location.hash = "#/admin"; }}>Superadmin</Button>}<Button variant="light" size="xs" onClick={() => navigate('settings')}>Business settings</Button><OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/" /><UserButton /></Group>;
}
