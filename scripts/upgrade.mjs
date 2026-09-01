import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function main() {
  await client.connect();

  // Tabla cards (idempotente)
  await client.query(`
    create table if not exists cards (
      id uuid primary key default gen_random_uuid(),
      household_id uuid not null references households(id) on delete cascade,
      name text not null,
      type text not null check (type in ('debit','credit')),
      cutoff_day int not null default 1 check (cutoff_day between 1 and 31),
      limit_amount numeric(12,2) default 0,
      last4 text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `);

  // Columna card_id en expenses
  const hasCard = await client.query(
    `select 1 from information_schema.columns where table_name='expenses' and column_name='card_id'`
  );
  if (!hasCard.rowCount) {
    await client.query(`alter table expenses add column card_id uuid references cards(id) on delete set null`);
  }

  // Columna effective_date
  const hasEff = await client.query(
    `select 1 from information_schema.columns where table_name='expenses' and column_name='effective_date'`
  );
  if (!hasEff.rowCount) {
    await client.query(
      `alter table expenses add column effective_date date default current_date`
    );
    await client.query(`update expenses set effective_date = expense_date where effective_date is null`);
    await client.query(`alter table expenses alter column effective_date set not null`);
  }

  // Columna paid_installments (cuotas ya pagadas)
  const hasPaid = await client.query(
    `select 1 from information_schema.columns where table_name='expenses' and column_name='paid_installments'`
  );
  if (!hasPaid.rowCount) {
    await client.query(`alter table expenses add column paid_installments int not null default 1`);
  }

  // Check constraint de payment_method: permitir debit/credit
  await client.query(`alter table expenses drop constraint if exists expenses_payment_method_check`);
  // valores viejos 'card' -> 'credit'
  await client.query(`update expenses set payment_method='credit' where payment_method='card'`);
  await client.query(
    `alter table expenses add constraint expenses_payment_method_check check (payment_method in ('cash','transfer','debit','credit'))`
  );

  // Índices
  await client.query(`create index if not exists idx_expenses_card on expenses(card_id)`);
  await client.query(`create index if not exists idx_expenses_effective on expenses(household_id, effective_date)`);
  await client.query(`create index if not exists idx_cards_household on cards(household_id)`);

  console.log('Upgrade aplicado OK (cards + columnas de gastos)');
  await client.end();
}

main().catch((e) => {
  console.error('Error en upgrade:', e.message);
  process.exit(1);
});
