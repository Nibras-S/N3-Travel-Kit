import './env.mjs';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before running migrations.');
await neon(process.env.DATABASE_URL).query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
console.log('Tenant schema is ready.');
