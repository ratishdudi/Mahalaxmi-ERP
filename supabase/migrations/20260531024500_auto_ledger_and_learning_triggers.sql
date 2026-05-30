-- Auto-sync the ledger from operational tables and refresh material learning.
-- Safe to run more than once.

alter table if exists public.factory_ledger
  add column if not exists source_table text,
  add column if not exists source_id uuid;

create unique index if not exists factory_ledger_source_unique_idx
  on public.factory_ledger(source_table, source_id, category)
  where source_table is not null and source_id is not null;

create or replace function public.normalize_party_name(input text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(coalesce(input, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.title_party_name(input text)
returns text
language sql
immutable
as $$
  select initcap(trim(regexp_replace(coalesce(input, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.ensure_party(input_name text)
returns uuid
language plpgsql
as $$
declare
  normalized text;
  party uuid;
begin
  normalized := public.normalize_party_name(input_name);
  if normalized = '' then
    return null;
  end if;

  insert into public.parties (canonical_name, normalized_name)
  values (public.title_party_name(input_name), normalized)
  on conflict (normalized_name) do update
    set canonical_name = excluded.canonical_name
  returning id into party;

  insert into public.party_aliases (party_id, alias_name, normalized_alias)
  values (party, input_name, normalized)
  on conflict (normalized_alias) do update
    set party_id = excluded.party_id,
        alias_name = excluded.alias_name;

  return party;
end;
$$;

create or replace function public.sync_block_purchase_to_ledger()
returns trigger
language plpgsql
as $$
begin
  insert into public.factory_ledger (
    entry_date,
    entry_type,
    category,
    description,
    amount,
    block_id,
    quarry_name,
    stone_type,
    source_table,
    source_id
  )
  values (
    coalesce(new.created_at::date, current_date),
    'asset',
    'block_purchase',
    'Block purchase ' || coalesce(new.block_no, ''),
    coalesce(new.landed_cost, 0),
    new.id,
    new.quarry_name,
    new.stone_type,
    'blocks',
    new.id
  )
  on conflict (source_table, source_id, category)
  where source_table is not null and source_id is not null
  do update set
    entry_date = excluded.entry_date,
    amount = excluded.amount,
    description = excluded.description,
    quarry_name = excluded.quarry_name,
    stone_type = excluded.stone_type,
    block_id = excluded.block_id;

  return new;
end;
$$;

drop trigger if exists sync_block_purchase_to_ledger_trg on public.blocks;
create trigger sync_block_purchase_to_ledger_trg
after insert or update of landed_cost, block_no, quarry_name, stone_type
on public.blocks
for each row execute function public.sync_block_purchase_to_ledger();

create or replace function public.sync_sale_to_party_and_ledger()
returns trigger
language plpgsql
as $$
declare
  party uuid;
  block_row public.blocks%rowtype;
begin
  party := public.ensure_party(new.buyer_name);
  select * into block_row from public.blocks where id = new.block_id;

  if new.party_id is null and party is not null then
    new.party_id := party;
  end if;

  insert into public.factory_ledger (
    entry_date,
    entry_type,
    category,
    description,
    amount,
    block_id,
    party_name,
    quarry_name,
    stone_type,
    source_table,
    source_id
  )
  values (
    coalesce(new.sold_at::date, current_date),
    'income',
    'sale_invoice',
    'Sale invoice to ' || coalesce(new.buyer_name, ''),
    coalesce(new.total_amount, 0),
    new.block_id,
    public.title_party_name(new.buyer_name),
    block_row.quarry_name,
    block_row.stone_type,
    'sales',
    new.id
  )
  on conflict (source_table, source_id, category)
  where source_table is not null and source_id is not null
  do update set
    entry_date = excluded.entry_date,
    amount = excluded.amount,
    description = excluded.description,
    party_name = excluded.party_name,
    quarry_name = excluded.quarry_name,
    stone_type = excluded.stone_type,
    block_id = excluded.block_id;

  insert into public.factory_ledger (
    entry_date,
    entry_type,
    category,
    description,
    amount,
    block_id,
    party_name,
    quarry_name,
    stone_type,
    source_table,
    source_id
  )
  values (
    coalesce(new.sold_at::date, current_date),
    'income',
    'payment_received',
    'Payment received from ' || coalesce(new.buyer_name, ''),
    coalesce(new.amount_paid, 0),
    new.block_id,
    public.title_party_name(new.buyer_name),
    block_row.quarry_name,
    block_row.stone_type,
    'sales',
    new.id
  )
  on conflict (source_table, source_id, category)
  where source_table is not null and source_id is not null
  do update set
    entry_date = excluded.entry_date,
    amount = excluded.amount,
    description = excluded.description,
    party_name = excluded.party_name,
    quarry_name = excluded.quarry_name,
    stone_type = excluded.stone_type,
    block_id = excluded.block_id;

  return new;
end;
$$;

drop trigger if exists sync_sale_to_party_and_ledger_trg on public.sales;
create trigger sync_sale_to_party_and_ledger_trg
before insert or update of buyer_name, total_amount, amount_paid, block_id, sold_at
on public.sales
for each row execute function public.sync_sale_to_party_and_ledger();

create or replace function public.sync_monthly_cost_to_ledger()
returns trigger
language plpgsql
as $$
begin
  insert into public.factory_ledger (
    entry_date,
    entry_type,
    category,
    description,
    amount,
    processed_sqft,
    source_table,
    source_id
  )
  values (
    coalesce(new.created_at::date, current_date),
    'expense',
    'legacy_monthly_overhead',
    'Monthly overhead ' || coalesce(new.month, ''),
    coalesce(new.total_overhead, 0),
    new.sqft_processed,
    'monthly_costs',
    new.id
  )
  on conflict (source_table, source_id, category)
  where source_table is not null and source_id is not null
  do update set
    entry_date = excluded.entry_date,
    amount = excluded.amount,
    description = excluded.description,
    processed_sqft = excluded.processed_sqft;

  return new;
end;
$$;

drop trigger if exists sync_monthly_cost_to_ledger_trg on public.monthly_costs;
create trigger sync_monthly_cost_to_ledger_trg
after insert or update of total_overhead, sqft_processed, month
on public.monthly_costs
for each row execute function public.sync_monthly_cost_to_ledger();

create or replace function public.refresh_learning_after_machine_session()
returns trigger
language plpgsql
as $$
begin
  if new.stopped_at is not null then
    perform public.refresh_material_cost_profiles();
  end if;
  return new;
end;
$$;

drop trigger if exists refresh_learning_after_machine_session_trg on public.machine_sessions;
create trigger refresh_learning_after_machine_session_trg
after insert or update of stopped_at, duration_mins, cost_rupees
on public.machine_sessions
for each row execute function public.refresh_learning_after_machine_session();

-- Backfill existing data once.
insert into public.factory_ledger (
  entry_date,
  entry_type,
  category,
  description,
  amount,
  block_id,
  quarry_name,
  stone_type,
  source_table,
  source_id
)
select
  coalesce(created_at::date, current_date),
  'asset',
  'block_purchase',
  'Block purchase ' || coalesce(block_no, ''),
  coalesce(landed_cost, 0),
  id,
  quarry_name,
  stone_type,
  'blocks',
  id
from public.blocks
on conflict (source_table, source_id, category)
where source_table is not null and source_id is not null
do nothing;

insert into public.factory_ledger (
  entry_date,
  entry_type,
  category,
  description,
  amount,
  block_id,
  party_name,
  quarry_name,
  stone_type,
  source_table,
  source_id
)
select
  coalesce(s.sold_at::date, current_date),
  'income',
  'sale_invoice',
  'Sale invoice to ' || coalesce(s.buyer_name, ''),
  coalesce(s.total_amount, 0),
  s.block_id,
  public.title_party_name(s.buyer_name),
  b.quarry_name,
  b.stone_type,
  'sales',
  s.id
from public.sales s
left join public.blocks b on b.id = s.block_id
on conflict (source_table, source_id, category)
where source_table is not null and source_id is not null
do nothing;

insert into public.factory_ledger (
  entry_date,
  entry_type,
  category,
  description,
  amount,
  block_id,
  party_name,
  quarry_name,
  stone_type,
  source_table,
  source_id
)
select
  coalesce(s.sold_at::date, current_date),
  'income',
  'payment_received',
  'Payment received from ' || coalesce(s.buyer_name, ''),
  coalesce(s.amount_paid, 0),
  s.block_id,
  public.title_party_name(s.buyer_name),
  b.quarry_name,
  b.stone_type,
  'sales',
  s.id
from public.sales s
left join public.blocks b on b.id = s.block_id
where coalesce(s.amount_paid, 0) > 0
on conflict (source_table, source_id, category)
where source_table is not null and source_id is not null
do nothing;

insert into public.factory_ledger (
  entry_date,
  entry_type,
  category,
  description,
  amount,
  processed_sqft,
  source_table,
  source_id
)
select
  coalesce(created_at::date, current_date),
  'expense',
  'legacy_monthly_overhead',
  'Monthly overhead ' || coalesce(month, ''),
  coalesce(total_overhead, 0),
  sqft_processed,
  'monthly_costs',
  id
from public.monthly_costs
on conflict (source_table, source_id, category)
where source_table is not null and source_id is not null
do nothing;

select public.refresh_material_cost_profiles();
