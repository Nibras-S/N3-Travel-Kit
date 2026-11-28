import './env.mjs';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Run neon deploy to configure Postgres before running migrations.');
const sql = neon(databaseUrl);
const statements = (await readFile(new URL('./schema.sql', import.meta.url), 'utf8')).split(';').map((statement) => statement.trim()).filter(Boolean);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log('Tenant schema is ready.');
