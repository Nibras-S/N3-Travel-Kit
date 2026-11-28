// vercel.json sends every /api/* path to this single Node function.
// Export the same protected API used locally; functions must not call listen().
import '../server/env.mjs';
import { createApp } from '../server/app.mjs';

export default createApp();
