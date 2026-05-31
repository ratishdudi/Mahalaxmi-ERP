update public.factory_ledger
set category = 'payment_received'
where entry_type = 'income'
  and category = 'other'
  and (
    lower(coalesce(description, '')) like '%received%'
    or lower(coalesce(description, '')) like '%recieved%'
    or lower(coalesce(description, '')) like '%amt%'
  );

delete from public.factory_ledger
where category = 'payment_received'
  and coalesce(amount, 0) = 0;

create or replace view public.accounts_summary as
select
  coalesce(sum(amount) filter (where entry_type = 'income' and category = 'sale_invoice'), 0) as total_invoiced,
  coalesce(sum(amount) filter (where entry_type = 'income' and category <> 'sale_invoice'), 0) as total_received,
  coalesce(sum(amount) filter (where entry_type = 'expense'), 0) as total_expenses,
  coalesce(sum(amount) filter (where entry_type = 'asset'), 0) as total_asset_purchases,
  coalesce(sum(amount) filter (where entry_type = 'income' and category = 'sale_invoice'), 0)
    - coalesce(sum(amount) filter (where entry_type = 'income' and category <> 'sale_invoice'), 0) as receivables,
  coalesce(sum(amount) filter (where entry_type = 'income' and category <> 'sale_invoice'), 0)
    - coalesce(sum(amount) filter (where entry_type = 'expense'), 0)
    - coalesce(sum(amount) filter (where entry_type = 'asset'), 0) as cash_position
from public.factory_ledger;
