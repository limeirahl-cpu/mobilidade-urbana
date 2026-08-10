-- profiles: contato opcional (não é identificador de login) + flag de
-- verificação de telefone (sempre true a partir de agora, já que todo
-- cadastro passa pelo fluxo de código por SMS antes de chegar em createProfile).
alter table public.profiles
  add column email text,
  add column phone_verified boolean not null default false;

-- payment_methods: carteira de métodos de pagamento salvos pelo passageiro,
-- reutilizável entre corridas. Feature separada de rides.payment_method
-- (0010), que é só a escolha simples no momento do pedido — não mexe nela.
--
-- MOCK/MVP: sem gateway de pagamento real (Stripe/Mercado Pago/PagSeguro)
-- integrado ainda. `data` guarda só últimos 4 dígitos, bandeira, validade e
-- nome do titular — nunca o número completo do cartão nem o CVV, que são
-- validados no app e descartados antes de qualquer insert.
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('cartao', 'pix')),
  data jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.payment_methods enable row level security;

create policy "payment_methods_owner_select"
  on public.payment_methods for select
  using (user_id = auth.uid());

create policy "payment_methods_owner_insert"
  on public.payment_methods for insert
  with check (user_id = auth.uid());

create policy "payment_methods_owner_delete"
  on public.payment_methods for delete
  using (user_id = auth.uid());

-- Garante um único método padrão por usuário no banco. Não existe policy de
-- update direta — a troca de padrão só acontece pela function abaixo, que
-- desliga o antigo e liga o novo dentro da mesma transação, então esse
-- índice nunca vê um estado intermediário de "dois padrões".
create unique index payment_methods_one_default_per_user
  on public.payment_methods (user_id)
  where (is_default);

create or replace function public.set_default_payment_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.payment_methods where id = p_id and user_id = auth.uid()
  ) then
    raise exception 'payment method not found';
  end if;

  update public.payment_methods set is_default = false
  where user_id = auth.uid() and is_default = true and id <> p_id;

  update public.payment_methods set is_default = true
  where id = p_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_default_payment_method(uuid) to authenticated;
