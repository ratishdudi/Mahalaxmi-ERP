-- Keep live production costing stable.
-- Actual paid expenses are still summarized for reporting, but they no longer overwrite
-- the hourly_rate used for new machine sessions during an open accounting period.

alter table if exists public.machine_rate_profiles
  add column if not exists baseline_hourly_rate numeric,
  add column if not exists actual_hourly_rate_90d numeric,
  add column if not exists rate_mode text not null default 'baseline';

update public.machine_rate_profiles
set baseline_hourly_rate = coalesce(baseline_hourly_rate, hourly_rate),
    rate_mode = 'baseline'
where baseline_hourly_rate is null
   or rate_mode is null;

create or replace function public.refresh_machine_rate_profiles()
returns void
language plpgsql
as $$
begin
  with session_hours as (
    select
      machine_id,
      sum(duration_mins) / 60.0 as hours_run
    from public.machine_sessions
    where stopped_at is not null
      and duration_mins is not null
      and duration_mins between 5 and 4320
      and stopped_at >= now() - interval '90 days'
    group by machine_id
  ),
  direct_costs as (
    select machine_id, sum(amount) as amount
    from public.factory_ledger
    where entry_type = 'expense'
      and machine_id is not null
      and entry_date >= current_date - interval '90 days'
    group by machine_id
  ),
  shared_costs as (
    select coalesce(sum(amount), 0) as amount
    from public.factory_ledger
    where entry_type = 'expense'
      and machine_id is null
      and category in ('electricity', 'labour', 'diamond_segments', 'polishing_bricks', 'epoxy_resin', 'machine_repair', 'other', 'legacy_monthly_overhead')
      and entry_date >= current_date - interval '90 days'
  ),
  total_hours as (
    select coalesce(sum(hours_run), 0) as hours_run from session_hours
  ),
  calculated as (
    select
      mr.machine_id,
      coalesce(sh.hours_run, 0) as hours_run,
      coalesce(dc.amount, 0) as direct_cost,
      case when th.hours_run > 0 then sc.amount * (coalesce(sh.hours_run, 0) / th.hours_run) else 0 end as allocated_shared_cost,
      case
        when coalesce(sh.hours_run, 0) >= 20
          then (coalesce(dc.amount, 0) + case when th.hours_run > 0 then sc.amount * (coalesce(sh.hours_run, 0) / th.hours_run) else 0 end) / sh.hours_run
        else null
      end as observed_hourly_rate,
      least(1, coalesce(sh.hours_run, 0) / 160.0) as confidence
    from public.machine_rate_profiles mr
    left join session_hours sh on sh.machine_id = mr.machine_id
    left join direct_costs dc on dc.machine_id = mr.machine_id
    cross join shared_costs sc
    cross join total_hours th
  )
  update public.machine_rate_profiles mr
  set
    learned_hourly_rate = case
      when c.observed_hourly_rate is not null and c.observed_hourly_rate > 0 then round(c.observed_hourly_rate::numeric, 2)
      else mr.learned_hourly_rate
    end,
    actual_hourly_rate_90d = case
      when c.observed_hourly_rate is not null and c.observed_hourly_rate > 0 then round(c.observed_hourly_rate::numeric, 2)
      else mr.actual_hourly_rate_90d
    end,
    hourly_rate = coalesce(mr.baseline_hourly_rate, mr.hourly_rate),
    observed_hours_90d = round(c.hours_run::numeric, 2),
    direct_cost_90d = round(c.direct_cost::numeric, 2),
    allocated_shared_cost_90d = round(c.allocated_shared_cost::numeric, 2),
    confidence = round(c.confidence::numeric, 2),
    rate_mode = 'baseline',
    last_calculated_at = now(),
    updated_at = now()
  from calculated c
  where c.machine_id = mr.machine_id;
end;
$$;

create or replace function public.set_machine_session_cost()
returns trigger
language plpgsql
as $$
declare
  block_row public.blocks%rowtype;
  rate numeric;
  multiplier numeric;
begin
  if new.stopped_at is null or new.duration_mins is null then
    return new;
  end if;

  select * into block_row from public.blocks where id = new.block_id;

  select coalesce(baseline_hourly_rate, hourly_rate, 0)
  into rate
  from public.machine_rate_profiles
  where machine_id = new.machine_id;

  select coalesce(learned_hardness_multiplier, 1)
  into multiplier
  from public.material_cost_profiles
  where stone_type = coalesce(block_row.stone_type, new.stone_type)
    and quarry_name = coalesce(nullif(trim(block_row.quarry_name), ''), 'Unknown')
  order by confidence desc, updated_at desc
  limit 1;

  if multiplier is null then
    multiplier := 1;
  end if;

  new.hourly_rate_used := rate;
  new.material_multiplier_used := multiplier;
  new.cost_rupees := round(((new.duration_mins / 60.0) * rate * multiplier)::numeric, 2);

  return new;
end;
$$;

select public.refresh_machine_rate_profiles();
