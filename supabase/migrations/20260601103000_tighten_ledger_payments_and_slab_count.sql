  alter table if exists public.blocks
    add column if not exists slab_count numeric;

  delete from public.factory_ledger
  where category = 'payment_received'
    and source_table = 'sales'
    and coalesce(amount, 0) = 0;

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

    if coalesce(new.amount_paid, 0) > 0 then
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
    else
      delete from public.factory_ledger
      where source_table = 'sales'
        and source_id = new.id
        and category = 'payment_received';
    end if;

    return new;
  end;
  $$;

  drop trigger if exists sync_sale_to_party_and_ledger_trg on public.sales;
  create trigger sync_sale_to_party_and_ledger_trg
  before insert or update of buyer_name, total_amount, amount_paid, block_id, sold_at
  on public.sales
  for each row execute function public.sync_sale_to_party_and_ledger();
