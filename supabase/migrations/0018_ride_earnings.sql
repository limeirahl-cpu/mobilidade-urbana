-- Registro contábil de repasse: quanto cada motorista tem a receber (Pix e
-- cartão, onde a plataforma fica com 100% na hora da cobrança) ou deve
-- (dinheiro, onde o motorista já fica com o valor físico e é a plataforma
-- quem tem a receber a comissão dela). Só o registro por enquanto — mover
-- dinheiro de verdade (saque, split payment do Mercado Pago) fica pra uma
-- fase futura, quando o modelo operacional estiver validado.
alter table public.ride_categories
  add column commission_rate numeric not null default 0.20;

alter table public.rides
  add column platform_fee numeric,
  add column driver_earnings numeric;

-- Substitui o update direto que completeRide() fazia — calcula a comissão
-- de forma atômica no mesmo momento em que a corrida é concluída, e nunca
-- deixa o cliente inventar o próprio valor de platform_fee/driver_earnings.
create or replace function public.complete_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
  v_fare numeric;
  v_commission numeric;
  v_platform_fee numeric;
  v_driver_earnings numeric;
begin
  select r.estimated_fare, c.commission_rate
  into v_fare, v_commission
  from public.rides r
  join public.ride_categories c on c.id = r.category_id
  where r.id = p_ride_id
    and r.driver_id = auth.uid()
    and r.status = 'in_progress';

  if v_fare is null then
    raise exception 'Corrida não encontrada ou não está em andamento';
  end if;

  v_platform_fee := round(v_fare * v_commission, 2);
  v_driver_earnings := v_fare - v_platform_fee;

  update public.rides
  set status = 'completed',
      completed_at = now(),
      platform_fee = v_platform_fee,
      driver_earnings = v_driver_earnings
  where id = p_ride_id
  returning * into v_ride;

  return v_ride;
end;
$$;

grant execute on function public.complete_ride(uuid) to authenticated;

-- Tira 'completed' do que um UPDATE direto do motorista pode setar — toda
-- conclusão de corrida passa a ir só pela function acima, mesmo padrão já
-- usado pro PIN de embarque (0006) e pra aceitar proposta (0016).
drop policy if exists "rides_update_driver_progress" on public.rides;
create policy "rides_update_driver_progress"
  on public.rides for update
  using (driver_id = auth.uid() and status in ('accepted', 'arriving', 'in_progress'))
  with check (driver_id = auth.uid() and status in ('arriving', 'cancelled'));
