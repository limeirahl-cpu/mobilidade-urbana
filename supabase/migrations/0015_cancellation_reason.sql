-- Motivo de cancelamento (passageiro ou motorista), puramente informativo
-- por enquanto — ajuda a entender depois se foi passageiro sumindo,
-- endereço errado, trânsito, etc. Sem RLS nova: quem já pode fazer o
-- UPDATE que cancela a corrida (policies existentes de 0002) também pode
-- preencher esta coluna, é só mais um campo do mesmo update.
alter table public.rides
  add column cancellation_reason text;
