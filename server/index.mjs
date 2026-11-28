import './env.mjs';
import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app.mjs';
if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) throw new Error('Configure Clerk server keys before starting the API.');
const app = createApp();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
}
app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('N3 Travel Kit API is ready.'));
