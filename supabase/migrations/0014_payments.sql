-- Pagamentos reais via Mercado Pago (Checkout Pro). A linha aqui é criada
-- e atualizada pelas Edge Functions mercadopago-create-preference e
-- mercadopago-webhook (usando a service role, que ignora RLS) — o cliente
-- só lê a própria linha, pra saber via Realtime quando o pagamento aprovou.
--
-- Sem ride_id: a corrida ainda não existe no momento da cobrança (Fase 13 —
-- a cobrança acontece antes de createRide(), na tela de confirmação). É o
-- cliente, já com os dados da corrida em mãos, quem cria a corrida de
-- verdade assim que vê o pagamento aprovado.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  amount numeric not null,
  payment_method text not null check (payment_method in ('pix', 'cartao_credito', 'cartao_debito')),
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_owner_select"
  on public.payments for select
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.payments;
