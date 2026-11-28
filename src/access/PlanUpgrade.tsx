import { Button, Center, Image, Modal, Stack, Text, Title } from '@mantine/core';

export function PlanUpgrade({ tool, onClose, page = false }: { tool: string; onClose: () => void; page?: boolean }) {
  const content = <Stack align="center" p="md">
    <Text fz={32} aria-hidden>🔒</Text>
    {page && <Title order={2}>Upgrade to Pro</Title>}
    <Text ta="center"><strong>{tool}</strong> is available on Pro.</Text>
    <Text ta="center" c="dimmed">Your Plus plan includes Invoice Generator and Tour Brochure. Contact the N3 Travel Kit administrator to upgrade to Pro and unlock all tools.</Text>
    <Button onClick={onClose}>{page ? 'Back to dashboard' : 'Continue with Plus'}</Button>
  </Stack>;
  return page ? <Center mih="100vh"><Stack maw={520} p="xl" align="center"><Image src="/N3TravelKit.png" alt="N3 Travel Kit" w={180} />{content}</Stack></Center>
    : <Modal opened onClose={onClose} title="Upgrade to Pro" centered>{content}</Modal>;
}
