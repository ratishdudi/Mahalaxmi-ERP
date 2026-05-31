create or replace view public.ready_stock_summary as
select
  b.id as block_id,
  b.block_no,
  b.stone_type,
  b.quarry_name,
  b.status,
  coalesce(b.total_sqft, 0) as total_sqft,
  coalesce(sum(s.sqft_sold), 0) as sold_sqft,
  greatest(coalesce(b.total_sqft, 0) - coalesce(sum(s.sqft_sold), 0), 0) as available_sqft
from public.blocks b
left join public.sales s on s.block_id = b.id
where b.status = 'ready_to_sell'
group by b.id, b.block_no, b.stone_type, b.quarry_name, b.status, b.total_sqft;

create or replace view public.party_balance_summary as
with sales_by_party as (
  select
    public.normalize_party_name(buyer_name) as normalized_name,
    public.title_party_name(buyer_name) as party_name,
    sum(coalesce(total_amount, 0)) as total_sales,
    sum(coalesce(amount_paid, 0)) as sales_paid,
    count(*) as sale_count,
    max(sold_at) as last_sale_at
  from public.sales
  group by public.normalize_party_name(buyer_name), public.title_party_name(buyer_name)
),
ledger_payments_by_party as (
  select
    public.normalize_party_name(party_name) as normalized_name,
    public.title_party_name(party_name) as party_name,
    sum(coalesce(amount, 0)) as ledger_paid
  from public.factory_ledger
  where entry_type = 'income'
    and category in ('payment_received', 'sale_receipt')
    and coalesce(party_name, '') <> ''
  group by public.normalize_party_name(party_name), public.title_party_name(party_name)
)
select
  coalesce(s.normalized_name, l.normalized_name) as normalized_name,
  coalesce(s.party_name, l.party_name) as party_name,
  coalesce(s.total_sales, 0) as total_sales,
  case
    when coalesce(l.ledger_paid, 0) > 0 then coalesce(l.ledger_paid, 0)
    else coalesce(s.sales_paid, 0)
  end as total_paid,
  coalesce(s.total_sales, 0) -
    case
      when coalesce(l.ledger_paid, 0) > 0 then coalesce(l.ledger_paid, 0)
      else coalesce(s.sales_paid, 0)
    end as outstanding,
  coalesce(s.sale_count, 0) as sale_count,
  s.last_sale_at
from sales_by_party s
full outer join ledger_payments_by_party l on l.normalized_name = s.normalized_name;
