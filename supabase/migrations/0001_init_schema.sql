-- Profiles: 1:1 with auth.users, holds role (passenger|driver) and basic info.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('passenger', 'driver')),
  full_name text not null,
  phone text,
  vehicle_info text,
  created_at timestamptz not null default now()
);

-- Driver live status: split from profiles so frequent location writes don't
-- touch the profile row.
create table public.driver_status (
  driver_id uuid primary key references public.profiles (id) on delete cascade,
  is_online boolean not null default false,
  current_lat double precision,
  current_lng double precision,
  heading double precision,
  updated_at timestamptz not null default now()
);

-- Rides: one row per ride request, moving through a fixed state machine.
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id),
  driver_id uuid references public.profiles (id),
  status text not null default 'requested' check (
    status in ('requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')
  ),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  dropoff_address text,
  estimated_distance_km double precision,
  estimated_fare numeric,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id)
);

create index rides_status_idx on public.rides (status);
create index rides_passenger_id_idx on public.rides (passenger_id);
create index rides_driver_id_idx on public.rides (driver_id);

alter table public.profiles enable row level security;
alter table public.driver_status enable row level security;
alter table public.rides enable row level security;
