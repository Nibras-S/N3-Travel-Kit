import { config } from 'dotenv';

// Match Vite's local-file precedence without replacing host-provided secrets.
config({ path: ['.env.local', '.env'], quiet: true });
process.env.CLERK_PUBLISHABLE_KEY ||= process.env.VITE_CLERK_PUBLISHABLE_KEY;
