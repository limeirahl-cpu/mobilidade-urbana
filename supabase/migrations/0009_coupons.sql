create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null,
  min_fare numeric,
  max_uses int,
  uses_count int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- Deliberately no SELECT policy for regular clients: a broad "active
-- coupons" policy would let anyone list every live code with `select *`.
-- The only way to validate/consume a code is the function below.

alter table public.rides
  add column coupon_id uuid references public.coupons (id),
  add column discount_amount numeric;

-- SECURITY DEFINER so it can read/update coupons despite there being no
-- client SELECT policy on that table. The UPDATE's WHERE clause is the
-- same atomic-guard trick as accept_ride (0001) / start_ride_with_pin
-- (0006): incrementing uses_count only succeeds while it's still under
-- max_uses, so concurrent redemptions can't blow past the cap.
create or replace function public.apply_coupon(p_code text, p_fare numeric)
returns table(coupon_id uuid, discount_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_type text;
  v_value numeric;
  v_discount numeric;
begin
  update public.coupons c
  set uses_count = uses_count + 1
  where upper(c.code) = upper(p_code)
    and c.active
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.uses_count < c.max_uses)
    and (c.min_fare is null or p_fare >= c.min_fare)
  returning c.id, c.discount_type, c.discount_value into v_id, v_type, v_value;

  if v_id is null then
    return;
  end if;

  if v_type = 'percent' then
    v_discount := p_fare * (v_value / 100.0);
  else
    v_discount := v_value;
  end if;

  coupon_id := v_id;
  discount_amount := least(v_discount, p_fare);
  return next;
end;
$$;

grant execute on function public.apply_coupon(text, numeric) to authenticated;

insert into public.coupons (code, discount_type, discount_value) values
  ('BEMVINDO10', 'percent', 10);
