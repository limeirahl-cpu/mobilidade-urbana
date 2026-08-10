alter table public.profiles
  add column avatar_url text;

-- saved_addresses ---------------------------------------------------------

create table public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  lat double precision not null,
  lng double precision not null,
  address_text text,
  created_at timestamptz not null default now()
);

alter table public.saved_addresses enable row level security;

create policy "saved_addresses_owner_select"
  on public.saved_addresses for select
  using (user_id = auth.uid());

create policy "saved_addresses_owner_insert"
  on public.saved_addresses for insert
  with check (user_id = auth.uid());

create policy "saved_addresses_owner_delete"
  on public.saved_addresses for delete
  using (user_id = auth.uid());

-- favorite_drivers ----------------------------------------------------------

create table public.favorite_drivers (
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (passenger_id, driver_id)
);

alter table public.favorite_drivers enable row level security;

-- No select policy for the driver side on purpose — they never learn who
-- favorited them, same "not even readable via the API" pattern as ride_pins.
create policy "favorite_drivers_owner_select"
  on public.favorite_drivers for select
  using (passenger_id = auth.uid());

create policy "favorite_drivers_owner_insert"
  on public.favorite_drivers for insert
  with check (passenger_id = auth.uid());

create policy "favorite_drivers_owner_delete"
  on public.favorite_drivers for delete
  using (passenger_id = auth.uid());

-- profiles.profiles_select_own_or_active_ride_partner (0004) only shows a
-- driver's profile while a ride between the two is still active — it goes
-- out of view once the ride is completed. The "Motoristas favoritos" list
-- needs to keep showing favorited drivers after their rides are long done,
-- so add a second SELECT policy (permissive policies OR together for
-- reads — no cross-policy WITH CHECK gotcha here, unlike UPDATE).
create policy "profiles_select_favorited_driver"
  on public.profiles for select
  using (exists (select 1 from public.favorite_drivers f where f.passenger_id = auth.uid() and f.driver_id = profiles.id));

-- avatars storage bucket ------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
