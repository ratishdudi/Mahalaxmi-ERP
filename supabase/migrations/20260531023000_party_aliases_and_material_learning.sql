create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null unique,
  phone text,
  gstin text,
  billing_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.party_aliases (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists party_aliases_party_id_idx on public.party_aliases(party_id);

insert into public.parties (canonical_name, normalized_name)
select initcap(trim(regexp_replace(buyer_name, '\s+', ' ', 'g'))),
       lower(trim(regexp_replace(buyer_name, '\s+', ' ', 'g')))
from public.sales
where buyer_name is not null and trim(buyer_name) <> ''
on conflict (normalized_name) do nothing;

insert into public.party_aliases (party_id, alias_name, normalized_alias)
select p.id,
       s.buyer_name,
       lower(trim(regexp_replace(s.buyer_name, '\s+', ' ', 'g')))
from public.sales s
join public.parties p
  on p.normalized_name = lower(trim(regexp_replace(s.buyer_name, '\s+', ' ', 'g')))
where s.buyer_name is not null and trim(s.buyer_name) <> ''
on conflict (normalized_alias) do nothing;

alter table if exists public.sales
  add column if not exists party_id uuid references public.parties(id) on delete set null;

update public.sales s
set party_id = pa.party_id
from public.party_aliases pa
where s.party_id is null
  and lower(trim(regexp_replace(s.buyer_name, '\s+', ' ', 'g'))) = pa.normalized_alias;

create table if not exists public.machine_rate_profiles (
  machine_id text primary key,
  label text not null,
  baseline_minutes_per_ton numeric,
  baseline_minutes_per_sqft numeric,
  hourly_rate numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.machine_rate_profiles (machine_id, label, baseline_minutes_per_ton, baseline_minutes_per_sqft, hourly_rate)
values
  ('14-blade', '14 Blade Cutter', 900, null, 2200),
  ('7-blade', '7 Blade Cutter', 1200, null, 1500),
  ('liner', 'Liner Polish', null, 0.08, 950)
on conflict (machine_id) do nothing;

create table if not exists public.material_cost_profiles (
  id uuid primary key default gen_random_uuid(),
  stone_type text not null,
  quarry_name text not null,
  learned_hardness_multiplier numeric not null default 1,
  observed_session_count integer not null default 0,
  confidence numeric not null default 0,
  avg_minutes_per_ton numeric,
  avg_minutes_per_sqft numeric,
  last_observed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (stone_type, quarry_name)
);

create or replace view public.material_hardness_observations as
select
  ms.id as session_id,
  ms.block_id,
  b.stone_type,
  coalesce(nullif(trim(b.quarry_name), ''), 'Unknown') as quarry_name,
  ms.machine_id,
  ms.duration_mins,
  b.weight_tons,
  b.total_sqft,
  case
    when mr.baseline_minutes_per_ton is not null and b.weight_tons > 0
      then (ms.duration_mins / b.weight_tons) / mr.baseline_minutes_per_ton
    when mr.baseline_minutes_per_sqft is not null and b.total_sqft > 0
      then (ms.duration_mins / b.total_sqft) / mr.baseline_minutes_per_sqft
    else null
  end as raw_multiplier,
  ms.stopped_at
from public.machine_sessions ms
join public.blocks b on b.id = ms.block_id
left join public.machine_rate_profiles mr on mr.machine_id = ms.machine_id
where ms.stopped_at is not null
  and ms.duration_mins between 5 and 4320;

create or replace function public.refresh_material_cost_profiles()
returns void
language plpgsql
as $$
begin
  insert into public.material_cost_profiles (
    stone_type,
    quarry_name,
    learned_hardness_multiplier,
    observed_session_count,
    confidence,
    avg_minutes_per_ton,
    avg_minutes_per_sqft,
    last_observed_at,
    updated_at
  )
  select
    stone_type,
    quarry_name,
    round(least(1.6, greatest(0.75, avg(least(1.8, greatest(0.6, raw_multiplier)))))::numeric, 3),
    count(*)::integer,
    round(least(1, count(*) / 12.0)::numeric, 2),
    round(avg(case when weight_tons > 0 then duration_mins / weight_tons end)::numeric, 2),
    round(avg(case when total_sqft > 0 then duration_mins / total_sqft end)::numeric, 4),
    max(stopped_at),
    now()
  from public.material_hardness_observations
  where raw_multiplier is not null
    and raw_multiplier between 0.45 and 2.25
  group by stone_type, quarry_name
  on conflict (stone_type, quarry_name)
  do update set
    learned_hardness_multiplier = excluded.learned_hardness_multiplier,
    observed_session_count = excluded.observed_session_count,
    confidence = excluded.confidence,
    avg_minutes_per_ton = excluded.avg_minutes_per_ton,
    avg_minutes_per_sqft = excluded.avg_minutes_per_sqft,
    last_observed_at = excluded.last_observed_at,
    updated_at = now();
end;
$$;

select public.refresh_material_cost_profiles();
