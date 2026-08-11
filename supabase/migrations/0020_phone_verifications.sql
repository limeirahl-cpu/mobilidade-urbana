-- Verificação de telefone real, do lado do servidor — substitui o mock que
-- vivia inteiramente em memória no cliente (services/sms.ts), com o código
-- mostrado na própria tela. Sem nenhuma policy de RLS pro cliente: só as
-- Edge Functions (service role, que ignora RLS) leem e escrevem aqui. O
-- código nunca é devolvido pro app em nenhum momento.
create table public.phone_verifications (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  last_sent_at timestamptz not null default now()
);

alter table public.phone_verifications enable row level security;
