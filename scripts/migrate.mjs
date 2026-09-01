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

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function columnExists(table, column) {
  const r = await client.query(
    `select 1 from information_schema.columns where table_name=$1 and column_name=$2`,
    [table, column]
  );
  return !!r.rowCount;
}

async function main() {
  await client.connect();

  // 1) Schema base (idempotente)
  const sqlPath = join(__dirname, '..', 'src', 'lib', 'schema.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  await client.query(sql);

  // 2) Migraciones incrementales para bases ya existentes
  //    (agrega columnas nuevas si no existen)

  // cards -> expenses.card_id
  if (!(await columnExists('expenses', 'card_id'))) {
    await client.query('alter table expenses add column card_id uuid references cards(id) on delete set null');
  }

  // expenses.effective_date
  if (!(await columnExists('expenses', 'effective_date'))) {
    await client.query('alter table expenses add column effective_date date default current_date');
    await client.query('update expenses set effective_date = expense_date where effective_date is null');
    await client.query('alter table expenses alter column effective_date set not null');
  }

  // expenses.paid_installments
  if (!(await columnExists('expenses', 'paid_installments'))) {
    await client.query('alter table expenses add column paid_installments int not null default 1');
  }

  // payment_method check: permitir debit/credit y migrar 'card' -> 'credit'
  await client.query('alter table expenses drop constraint if exists expenses_payment_method_check');
  await client.query(`update expenses set payment_method='credit' where payment_method='card'`);
  await client.query(
    `alter table expenses add constraint expenses_payment_method_check check (payment_method in ('cash','transfer','debit','credit'))`
  );

  console.log('Schema y migraciones aplicados OK en Neon');
  await client.end();
}

main().catch((e) => {
  console.error('Error migrando:', e.message);
  process.exit(1);
});
