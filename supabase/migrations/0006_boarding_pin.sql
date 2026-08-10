-- 1:1 with rides, kept in its own table (not a column on `rides`) because
-- RLS is row-level, not column-level: any policy that lets the driver read
-- a ride row would also expose a `pin` column on that same row. Keeping it
-- separate lets us give the driver zero select access to the value at all.
create table public.ride_pins (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  pin text not null
);

alter table public.ride_pins enable row level security;

create policy "ride_pins_select_passenger_only"
  on public.ride_pins for select
  using (exists (select 1 from public.rides r where r.id = ride_id and r.passenger_id = auth.uid()));

create policy "ride_pins_insert_passenger_only"
  on public.ride_pins for insert
  with check (exists (select 1 from public.rides r where r.id = ride_id and r.passenger_id = auth.uid()));

-- The driver never gets a row back from `ride_pins` — they can only call
-- this function with a guess. It's SECURITY DEFINER so its internal read of
-- ride_pins bypasses RLS; the driver_id/status checks below are what stand
-- in for the RLS check that would normally gate this update.
create or replace function public.start_ride_with_pin(ride_id uuid, pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched boolean;
begin
  select exists (
    select 1
    from public.rides r
    join public.ride_pins p on p.ride_id = r.id
    where r.id = start_ride_with_pin.ride_id
      and r.driver_id = auth.uid()
      and r.status = 'arriving'
      and p.pin = start_ride_with_pin.pin
  ) into matched;

  if matched then
    update public.rides
    set status = 'in_progress', started_at = now()
    where id = start_ride_with_pin.ride_id;
  end if;

  return matched;
end;
$$;

grant execute on function public.start_ride_with_pin(uuid, text) to authenticated;

-- Take 'in_progress' out of what a direct client UPDATE can set — from now
-- on the only way there is through start_ride_with_pin() above.
drop policy if exists "rides_update_driver_progress" on public.rides;
create policy "rides_update_driver_progress"
  on public.rides for update
  using (driver_id = auth.uid() and status in ('accepted', 'arriving', 'in_progress'))
  with check (driver_id = auth.uid() and status in ('arriving', 'completed', 'cancelled'));
