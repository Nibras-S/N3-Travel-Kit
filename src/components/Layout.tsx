import {
  Paper,
  Title,
  Group,
  ActionIcon,
  Image,
  Box,
} from "@mantine/core";
import {  ChevronLeft } from "lucide-react";
import { WorkspaceControls } from "../tenant/WorkspaceControls";
import { useNavigation } from "../NavigationContext";

interface LayoutProps {
  title: string;
  onNavigateHome?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  withBottomBorder?: boolean;
}

const Layout = ({
  title,
  onNavigateHome: propOnNavigateHome,
  actions,
  children,
  withBottomBorder,
}: LayoutProps) => {
  const { navigateHome: ctxNavigateHome } = useNavigation();
  const handleHome = propOnNavigateHome || ctxNavigateHome;

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top Navigation Bar */}
      <Paper
        style={{
          flexShrink: 0,
          zIndex: 9000,
          borderBottom: withBottomBorder ? "1px solid #dee2e6" : undefined,
        }}
        py="sm"
        px="lg"
        radius={0}
      >
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={handleHome}
              title="Back to Dashboard"
            >
              <ChevronLeft size={18} />
            </ActionIcon>
            <Box
              style={{
                width: 1,
                height: 24,
                background: "#dee2e6",
              }}
            />
            <Image
              src="/N3TravelKit.png"
              alt="N3 TravelKit Logo"
              w={95}
              style={{ cursor: "pointer" }}
              onClick={handleHome}
            />
          </Group>

          <Title order={5} c="gray.8" style={{ letterSpacing: -0.2 }}>
            {title}
          </Title>

          <Group gap="sm">
            {actions}
            <WorkspaceControls />
          </Group>
        </Group>
      </Paper>

      {/* Page Content */}
      <Box style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
