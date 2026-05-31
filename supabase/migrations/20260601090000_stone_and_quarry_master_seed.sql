create table if not exists public.stone_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  family text,
  hardness numeric,
  base_price numeric,
  avg_yield_pct numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stone_types add column if not exists family text;
alter table public.stone_types add column if not exists hardness numeric;
alter table public.stone_types add column if not exists base_price numeric;
alter table public.stone_types add column if not exists avg_yield_pct numeric;
alter table public.stone_types add column if not exists updated_at timestamptz not null default now();

insert into public.stone_types (name, family, hardness, base_price, avg_yield_pct)
values
  ('Markino Black', 'Black', 1.18, 165, 62),
  ('Rajasthan Black', 'Black', 1.12, 145, 64),
  ('Pebble Black', 'Black', 1.08, 135, 65),
  ('Coin Black', 'Black', 1.08, 135, 65),
  ('Ash Black', 'Black', 1.06, 125, 66),
  ('Pearl Black', 'Black', 1.14, 150, 63),
  ('Black Galaxy', 'Black', 1.20, 190, 60),
  ('Kotda Black', 'Black', 1.10, 140, 64),
  ('Majestic Black', 'Black', 1.16, 170, 62),
  ('Forest Black', 'Black', 1.12, 155, 63),
  ('Fish Black', 'Black', 1.08, 130, 65),
  ('P-White (Platinum)', 'White', 1.04, 150, 67),
  ('S White', 'White', 1.00, 125, 68),
  ('Cotton White', 'White', 0.98, 115, 69),
  ('China White', 'White', 0.96, 110, 70),
  ('Alaska White', 'White', 1.08, 175, 64),
  ('Viscon White', 'White', 1.06, 165, 65),
  ('Steel Grey', 'Grey', 1.12, 145, 64),
  ('Armani Grey', 'Grey', 1.10, 155, 64),
  ('Web Grey', 'Grey', 1.06, 135, 66),
  ('Moon White', 'White', 1.02, 130, 68),
  ('Kashmir White', 'White', 1.04, 145, 67),
  ('Crystal Yellow', 'Yellow', 1.02, 120, 68),
  ('Alaska Gold', 'Gold', 1.10, 180, 63),
  ('Alaska Mango', 'Gold', 1.12, 185, 62),
  ('Tiger Skin Gold', 'Gold', 1.16, 190, 61),
  ('Titanium Gold', 'Gold', 1.20, 210, 60),
  ('Imperial Gold', 'Gold', 1.14, 195, 62),
  ('Desert Brown', 'Brown', 1.04, 125, 67),
  ('Z Brown', 'Brown', 1.08, 135, 65),
  ('Brazil Brown', 'Brown', 1.14, 175, 62),
  ('Sindoori Red', 'Red', 1.08, 145, 65),
  ('Kharda Red', 'Red', 1.06, 130, 66),
  ('Ruby Red', 'Red', 1.18, 190, 60),
  ('Lakha Red', 'Red', 1.14, 170, 62),
  ('Rosy Pink', 'Pink', 1.00, 110, 69),
  ('Chima Pink', 'Pink', 1.02, 115, 68),
  ('Blue Dunes', 'Blue', 1.16, 210, 61),
  ('Jasper Blue', 'Blue', 1.18, 220, 60),
  ('Alaska Pink', 'Pink', 1.08, 165, 64),
  ('Alaska Red', 'Red', 1.12, 175, 63),
  ('Fantasy Brown', 'Brown', 1.10, 185, 63)
on conflict (name) do update set
  family = excluded.family,
  hardness = excluded.hardness,
  base_price = excluded.base_price,
  avg_yield_pct = excluded.avg_yield_pct,
  updated_at = now();

create table if not exists public.quarry_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text,
  hardness_multiplier numeric not null default 1,
  transport_multiplier numeric not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.quarry_profiles (name, region, hardness_multiplier, transport_multiplier, notes)
values
  ('Jalore', 'Rajasthan', 1.08, 1.04, 'Usually dense red and brown material.'),
  ('Chima', 'Rajasthan', 1.02, 1.02, 'Pink material, moderate cutting load.'),
  ('Kotda', 'Rajasthan', 1.10, 1.03, 'Black material, slightly slower cutting.'),
  ('Kharda', 'Rajasthan', 1.04, 1.02, 'Red material, average yield.'),
  ('Lakha', 'Rajasthan', 1.12, 1.05, 'Hard red material, watch blade cost.'),
  ('Kishangarh Local', 'Rajasthan', 1.00, 1.00, 'Default local benchmark.'),
  ('Bangalore', 'Karnataka', 1.16, 1.12, 'Harder southern material and higher logistics.'),
  ('Ongole', 'Andhra Pradesh', 1.18, 1.13, 'Hard black material, higher cutting hours.'),
  ('Imported', 'Mixed', 1.20, 1.15, 'Use until enough session data exists.')
on conflict (name) do update set
  region = excluded.region,
  hardness_multiplier = excluded.hardness_multiplier,
  transport_multiplier = excluded.transport_multiplier,
  notes = excluded.notes,
  updated_at = now();
