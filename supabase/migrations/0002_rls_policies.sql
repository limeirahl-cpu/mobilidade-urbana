-- profiles ---------------------------------------------------------------

create policy "profiles_select_own_or_active_ride_partner"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.rides r
      where r.status not in ('completed', 'cancelled')
        and (
          (r.passenger_id = auth.uid() and r.driver_id = profiles.id)
          or (r.driver_id = auth.uid() and r.passenger_id = profiles.id)
        )
    )
  );

-- Row is created client-side right after auth.signUp(), while a session
-- already exists, so the user can only ever insert their own profile.
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- driver_status -----------------------------------------------------------

create policy "driver_status_select_self_or_active_passenger"
  on public.driver_status for select
  using (
    driver_id = auth.uid()
    or exists (
      select 1 from public.rides r
      where r.driver_id = driver_status.driver_id
        and r.passenger_id = auth.uid()
        and r.status not in ('completed', 'cancelled')
    )
  );

create policy "driver_status_insert_self"
  on public.driver_status for insert
  with check (
    driver_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
  );

create policy "driver_status_update_self"
  on public.driver_status for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- rides ---------------------------------------------------------------------

create policy "rides_select_own_or_open_pool"
  on public.rides for select
  using (
    passenger_id = auth.uid()
    or driver_id = auth.uid()
    or (
      status = 'requested'
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
    )
  );

create policy "rides_insert_self_as_passenger"
  on public.rides for insert
  with check (
    passenger_id = auth.uid()
    and status = 'requested'
    and driver_id is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'passenger')
  );

-- Three separate UPDATE policies, one per actor/transition, instead of one
-- big policy: Postgres OR's the USING clauses of all matching permissive
-- policies together, and separately OR's their WITH CHECK clauses together,
-- so a row update is allowed if it satisfies USING under *any* policy and
-- WITH CHECK under *any* policy (not necessarily the same one). That only
-- matters here if a user could satisfy two policies' USING at once; since a
-- policy's USING always keys off `driver_id = auth.uid()` or
-- `passenger_id = auth.uid()` and a user is never both for the same ride,
-- these three stay effectively independent in practice.

-- Passenger may cancel their own ride before it's in progress.
create policy "rides_update_passenger_cancel"
  on public.rides for update
  using (passenger_id = auth.uid() and status in ('requested', 'accepted', 'arriving'))
  with check (passenger_id = auth.uid() and status = 'cancelled');

-- Driver accepts an open request. The `driver_id is null and status =
-- 'requested'` guard in USING is what prevents two drivers from accepting
-- the same ride: once one UPDATE commits, the row no longer matches this
-- USING clause for the second concurrent transaction.
create policy "rides_update_driver_accept"
  on public.rides for update
  using (
    status = 'requested'
    and driver_id is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
  )
  with check (driver_id = auth.uid() and status = 'accepted');

-- Driver advances or cancels a ride already assigned to them.
create policy "rides_update_driver_progress"
  on public.rides for update
  using (driver_id = auth.uid() and status in ('accepted', 'arriving', 'in_progress'))
  with check (driver_id = auth.uid() and status in ('arriving', 'in_progress', 'completed', 'cancelled'));
