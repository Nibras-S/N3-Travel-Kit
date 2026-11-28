import './env.mjs';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Run neon deploy to configure Postgres before running migrations.');
await neon(databaseUrl).query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
console.log('Tenant schema is ready.');
