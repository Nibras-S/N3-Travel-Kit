import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthGate } from "./tenant/AuthGate";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";

createRoot(document.getElementById("root")!).render(
  <MantineProvider>
    <AuthGate><App /></AuthGate>
  </MantineProvider>
);
