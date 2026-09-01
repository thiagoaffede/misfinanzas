-- MiFinanzas schema (Postgres / Neon)
-- Extensiones
create extension if not exists pgcrypto;

-- ============ USERS ============
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- ============ HOUSEHOLDS ============
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- ============ CATEGORIES (personalizables, con defaults) ============
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  icon text default 'tag',
  "isDefault" boolean default false,
  sort int default 0,
  created_at timestamptz not null default now()
);

-- ============ CARDS (tarjetas débito/crédito) ============
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
);

-- ============ EXPENSES ============
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references categories(id),
  title text not null,
  amount numeric(12,2) not null,
  kind text not null check (kind in ('joint','individual')),
  payer_id uuid references household_members(id) on delete set null,
  payment_method text not null default 'cash' check (payment_method in ('cash','transfer','debit','credit')),
  card_id uuid references cards(id) on delete set null,
  installments int not null default 1 check (installments >= 1),
  paid_installments int not null default 1 check (paid_installments >= 1),
  installment_index int not null default 1 check (installment_index >= 1),
  parent_id uuid references expenses(id) on delete cascade,
  expense_date date not null default current_date,
  effective_date date not null default current_date,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Partes de un gasto conjunto (reparto en partes iguales)
create table if not exists expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  amount numeric(12,2) not null,
  unique (expense_id, member_id)
);

-- ============ INCOMES ============
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid references categories(id),
  title text not null,
  amount numeric(12,2) not null,
  income_date date not null default current_date,
  is_recurring boolean default false,
  created_at timestamptz not null default now()
);

-- ============ RECURRING EXPENSES (mensuales) ============
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  category_id uuid references categories(id),
  day_of_month int not null default 1 check (day_of_month between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ SETTLEMENTS (liquidaciones de deudas) ============
create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  from_member_id uuid not null references household_members(id) on delete cascade,
  to_member_id uuid not null references household_members(id) on delete cascade,
  amount numeric(12,2) not null,
  note text,
  paid_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============ INDICES ============
create index if not exists idx_expenses_household on expenses(household_id);
create index if not exists idx_expenses_category on expenses(category_id);
create index if not exists idx_shares_expense on expense_shares(expense_id);
create index if not exists idx_shares_member on expense_shares(member_id);
create index if not exists idx_incomes_household on incomes(household_id);
create index if not exists idx_settlements_household on settlements(household_id);
create index if not exists idx_expenses_card on expenses(card_id);
create index if not exists idx_expenses_effective on expenses(household_id, effective_date);
create index if not exists idx_cards_household on cards(household_id);
