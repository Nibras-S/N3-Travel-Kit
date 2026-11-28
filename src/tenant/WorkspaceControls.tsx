import { OrganizationSwitcher, UserButton } from '@clerk/react';
import { Button, Group } from '@mantine/core';
import { useNavigation } from '../NavigationContext';
export function WorkspaceControls() {
  const { navigate } = useNavigation();
  return <Group gap="sm" wrap="wrap"><Button variant="light" size="xs" onClick={() => navigate('settings')}>Business settings</Button><OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/" /><UserButton /></Group>;
}
