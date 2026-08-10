create table public.ride_categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  base_fare numeric not null,
  per_km_rate numeric not null,
  per_min_rate numeric not null,
  min_fare numeric not null,
  surge_multiplier numeric not null default 1.0,
  active boolean not null default true,
  sort_order int not null default 0
);

alter table public.ride_categories enable row level security;

-- Reference data, not sensitive: any authenticated user can read it.
create policy "ride_categories_select_authenticated"
  on public.ride_categories for select
  to authenticated
  using (true);

insert into public.ride_categories (key, label, base_fare, per_km_rate, per_min_rate, min_fare, sort_order) values
  ('economico', 'Econômico', 4.00, 1.80, 0.25, 7.00, 1),
  ('conforto', 'Conforto', 6.00, 2.40, 0.35, 10.00, 2),
  ('moto', 'Moto', 3.00, 1.20, 0.15, 5.00, 3);

-- Driver's own vehicle category (nullable: only relevant once role='driver').
alter table public.profiles
  add column category_id uuid references public.ride_categories (id);

-- Which category a ride was requested in. ADD COLUMN can't take a subquery
-- as its DEFAULT, so backfill any existing rows first, then enforce NOT
-- NULL — every insert going forward always supplies category_id explicitly.
alter table public.rides
  add column category_id uuid references public.ride_categories (id);

update public.rides
  set category_id = (select id from public.ride_categories where key = 'economico')
  where category_id is null;

alter table public.rides
  alter column category_id set not null;

alter table public.rides
  add column estimated_duration_min numeric;

-- Same SECURITY DEFINER pattern as current_user_role() in 0004: bypasses
-- RLS on profiles so calling this from rides' policies doesn't re-trigger
-- profiles' policy and risk recursion again.
create or replace function public.current_user_category()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select category_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_category() to authenticated;

-- Tighten accept: a driver can only accept a ride in their own category.
drop policy if exists "rides_update_driver_accept" on public.rides;
create policy "rides_update_driver_accept"
  on public.rides for update
  using (
    status = 'requested'
    and driver_id is null
    and public.current_user_role() = 'driver'
    and category_id = public.current_user_category()
  )
  with check (driver_id = auth.uid() and status = 'accepted');
