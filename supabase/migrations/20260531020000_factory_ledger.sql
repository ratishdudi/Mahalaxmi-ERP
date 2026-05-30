create table if not exists public.factory_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in ('expense', 'income', 'asset', 'adjustment')),
  category text not null,
  description text,
  amount numeric not null check (amount >= 0),
  block_id uuid references public.blocks(id) on delete set null,
  party_name text,
  quarry_name text,
  stone_type text,
  processed_sqft numeric,
  created_at timestamptz not null default now()
);

create index if not exists factory_ledger_entry_date_idx on public.factory_ledger(entry_date desc);
create index if not exists factory_ledger_category_idx on public.factory_ledger(category);
create index if not exists factory_ledger_block_id_idx on public.factory_ledger(block_id);
create index if not exists factory_ledger_party_name_idx on public.factory_ledger(party_name);

alter table if exists public.machine_sessions
  add column if not exists cost_rupees numeric;

alter table if exists public.finished_stock
  add column if not exists sqft_available numeric,
  add column if not exists break_even_sqft numeric;
