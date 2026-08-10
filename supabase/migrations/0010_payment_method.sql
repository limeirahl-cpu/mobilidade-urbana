alter table public.rides
  add column payment_method text check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito'));

-- Require every new ride to already carry a payment method — the app only
-- lets the passenger reach "Pedir corrida" once one is picked, and this is
-- the server-side backstop for that rule (current version from 0004).
drop policy if exists "rides_insert_self_as_passenger" on public.rides;
create policy "rides_insert_self_as_passenger"
  on public.rides for insert
  with check (
    passenger_id = auth.uid()
    and status = 'requested'
    and driver_id is null
    and payment_method is not null
    and public.current_user_role() = 'passenger'
  );
