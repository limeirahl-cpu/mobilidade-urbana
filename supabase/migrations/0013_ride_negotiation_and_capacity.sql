-- Capacidade de passageiros por categoria (puramente informativo no cartão
-- de categoria do passageiro).
alter table public.ride_categories
  add column capacity_passengers int not null default 4;

update public.ride_categories set capacity_passengers = 1 where key = 'moto';

-- Registro do valor sugerido pelo passageiro durante a negociação de preço
-- (nulo quando ele só aceita o preço estimado da categoria, sem negociar).
-- O preço final acordado continua sendo rides.estimated_fare, exatamente
-- como já era antes desta fase.
alter table public.rides
  add column suggested_fare numeric;

-- ETA estimado até o motorista online mais próximo daquela categoria, pra
-- mostrar no cartão de categoria antes de pedir a corrida. driver_status só
-- é legível pelo próprio motorista ou por um passageiro com corrida ativa
-- (0002/0004) — não dá pra listar localizações de motoristas online direto
-- do cliente. Esta function roda com SECURITY DEFINER e devolve só o número
-- final em minutos, nunca as coordenadas dos motoristas.
create or replace function public.estimate_driver_eta_minutes(
  p_category_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select min(
    2 * 6371 * asin(sqrt(
      power(sin(radians((ds.current_lat - p_lat) / 2)), 2) +
      cos(radians(p_lat)) * cos(radians(ds.current_lat)) *
      power(sin(radians((ds.current_lng - p_lng) / 2)), 2)
    )) / 25 * 60
  )
  from public.driver_status ds
  join public.profiles p on p.id = ds.driver_id
  where ds.is_online = true
    and p.category_id = p_category_id
    and ds.current_lat is not null
    and ds.current_lng is not null;
$$;

grant execute on function public.estimate_driver_eta_minutes(uuid, double precision, double precision) to authenticated;
