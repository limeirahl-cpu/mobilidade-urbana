create table public.ride_ratings (
  ride_id uuid not null references public.rides (id) on delete cascade,
  rater_id uuid not null references public.profiles (id),
  ratee_id uuid not null references public.profiles (id),
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  primary key (ride_id, rater_id)
);

alter table public.ride_ratings enable row level security;

create policy "ride_ratings_select_own"
  on public.ride_ratings for select
  using (rater_id = auth.uid() or ratee_id = auth.uid());

create policy "ride_ratings_insert_own"
  on public.ride_ratings for insert
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.status = 'completed'
        and (
          (r.passenger_id = auth.uid() and r.driver_id = ratee_id)
          or (r.driver_id = auth.uid() and r.passenger_id = ratee_id)
        )
    )
  );

alter table public.profiles
  add column rating_avg numeric,
  add column rating_count int not null default 0;

-- SECURITY DEFINER because the rater is updating the ratee's profile row,
-- which profiles_update_self (0001) only allows for your own row.
create or replace function public.update_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    rating_avg = (coalesce(rating_avg, 0) * rating_count + new.stars) / (rating_count + 1),
    rating_count = rating_count + 1
  where id = new.ratee_id;
  return new;
end;
$$;

create trigger ride_ratings_update_profile
  after insert on public.ride_ratings
  for each row execute function public.update_profile_rating();
