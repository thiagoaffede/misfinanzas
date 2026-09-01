import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env.local manualmente (sin dotenv)
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { Client } = pg;
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const sqlPath = join(__dirname, '..', 'src', 'lib', 'schema.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  await client.connect();
  await client.query(sql);
  console.log('Schema aplicado OK en Neon');
  await client.end();
}

async function applyDefaults() {
  // Seeds de categorías se manejan por app al crear hogar, no acá.
}

main().catch((e) => {
  console.error('Error migrando:', e.message);
  process.exit(1);
});
