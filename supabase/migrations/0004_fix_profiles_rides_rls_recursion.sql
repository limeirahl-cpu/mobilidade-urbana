-- 0002 had `profiles` policies querying `rides` and `rides` policies
-- querying `profiles` back. Postgres detects that cross-reference
-- structurally and raises 42P17 "infinite recursion detected in policy"
-- the moment either table is touched — regardless of which branch of an
-- OR would actually apply at runtime.
--
-- Fix: move the cross-table checks into SECURITY DEFINER helper functions.
-- Owned by the migration role (table owner), these bypass RLS on the
-- table they query internally, so calling them from another table's
-- policy no longer re-triggers that table's policy evaluation.

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.has_active_ride_with(other_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.rides r
    where r.status not in ('completed', 'cancelled')
      and (
        (r.passenger_id = auth.uid() and r.driver_id = other_id)
        or (r.driver_id = auth.uid() and r.passenger_id = other_id)
      )
  );
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_active_ride_with(uuid) to authenticated;

-- profiles ------------------------------------------------------------------

drop policy if exists "profiles_select_own_or_active_ride_partner" on public.profiles;
create policy "profiles_select_own_or_active_ride_partner"
  on public.profiles for select
  using (id = auth.uid() or public.has_active_ride_with(profiles.id));

-- driver_status ---------------------------------------------------------------

drop policy if exists "driver_status_select_self_or_active_passenger" on public.driver_status;
create policy "driver_status_select_self_or_active_passenger"
  on public.driver_status for select
  using (driver_id = auth.uid() or public.has_active_ride_with(driver_id));

drop policy if exists "driver_status_insert_self" on public.driver_status;
create policy "driver_status_insert_self"
  on public.driver_status for insert
  with check (driver_id = auth.uid() and public.current_user_role() = 'driver');

-- rides -----------------------------------------------------------------------

drop policy if exists "rides_select_own_or_open_pool" on public.rides;
create policy "rides_select_own_or_open_pool"
  on public.rides for select
  using (
    passenger_id = auth.uid()
    or driver_id = auth.uid()
    or (status = 'requested' and public.current_user_role() = 'driver')
  );

drop policy if exists "rides_insert_self_as_passenger" on public.rides;
create policy "rides_insert_self_as_passenger"
  on public.rides for insert
  with check (
    passenger_id = auth.uid()
    and status = 'requested'
    and driver_id is null
    and public.current_user_role() = 'passenger'
  );

drop policy if exists "rides_update_driver_accept" on public.rides;
create policy "rides_update_driver_accept"
  on public.rides for update
  using (
    status = 'requested'
    and driver_id is null
    and public.current_user_role() = 'driver'
  )
  with check (driver_id = auth.uid() and status = 'accepted');
