// Vercel discovers this catch-all as a Node function alongside the Vite build.
// Export the same protected API used locally; functions must not call listen().
import '../server/env.mjs';
import { createApp } from '../server/app.mjs';

export default createApp();
