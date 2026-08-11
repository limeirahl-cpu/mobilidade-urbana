-- Propostas de preço de motoristas reais, substituindo o simulateDriverOffers
-- (client-side, mockado) usado desde a Fase 12. Uma corrida pode receber
-- várias propostas (uma por motorista); o passageiro escolhe uma.
create table public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  driver_id uuid not null references public.profiles (id),
  price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (ride_id, driver_id)
);

alter table public.ride_offers enable row level security;

-- Motorista vê a própria proposta; passageiro vê todas as propostas da
-- própria corrida (pra montar a lista de ofertas na tela de negociação).
create policy "ride_offers_select_participants"
  on public.ride_offers for select
  using (
    driver_id = auth.uid()
    or exists (select 1 from public.rides r where r.id = ride_id and r.passenger_id = auth.uid())
  );

-- Motorista só propõe enquanto a corrida ainda está aberta (sem motorista
-- atribuído) e na própria categoria — mesma checagem de
-- rides_update_driver_accept (0005), que esta migration substitui.
create policy "ride_offers_insert_driver"
  on public.ride_offers for insert
  with check (
    driver_id = auth.uid()
    and public.current_user_role() = 'driver'
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.status = 'requested'
        and r.driver_id is null
        and r.category_id = public.current_user_category()
    )
  );

alter publication supabase_realtime add table public.ride_offers;

-- Aceitar uma proposta precisa ser atômico: confirma que quem chama é o
-- passageiro da corrida, que a proposta ainda está pendente e a corrida
-- ainda está aberta, e então aplica tudo de uma vez (driver_id, status,
-- preço final) — mesmo padrão de apply_coupon (0009) / start_ride_with_pin
-- (0006). As demais propostas da mesma corrida viram "rejected", pra cada
-- motorista saber que a dele não foi escolhida.
create or replace function public.accept_ride_offer(p_offer_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride_id uuid;
  v_driver_id uuid;
  v_price numeric;
  v_ride public.rides;
begin
  select o.ride_id, o.driver_id, o.price
  into v_ride_id, v_driver_id, v_price
  from public.ride_offers o
  join public.rides r on r.id = o.ride_id
  where o.id = p_offer_id
    and o.status = 'pending'
    and r.passenger_id = auth.uid()
    and r.status = 'requested'
    and r.driver_id is null;

  if v_ride_id is null then
    raise exception 'Proposta não encontrada ou não está mais disponível';
  end if;

  update public.rides
  set driver_id = v_driver_id, status = 'accepted', estimated_fare = v_price, accepted_at = now()
  where id = v_ride_id
  returning * into v_ride;

  update public.ride_offers set status = 'accepted' where id = p_offer_id;
  update public.ride_offers set status = 'rejected' where ride_id = v_ride_id and id <> p_offer_id;

  return v_ride;
end;
$$;

grant execute on function public.accept_ride_offer(uuid) to authenticated;

-- O "primeiro que aceitar leva" desaparece — todo aceite de corrida passa a
-- ir só pela função acima, igual o PIN de embarque já fechou a porta de
-- update direto pra in_progress (0006).
drop policy if exists "rides_update_driver_accept" on public.rides;

-- Liga um pagamento (Fase 13) à corrida que o originou. Nullable porque
-- corridas em dinheiro nunca passam por `payments`. Antes desta fase, o
-- pagamento sempre era criado depois da negociação inteira (a corrida só
-- nascia no fim); agora a corrida nasce no começo da negociação, então dá
-- pra amarrar os dois desde a criação da preferência do Mercado Pago.
alter table public.payments
  add column ride_id uuid references public.rides (id);
