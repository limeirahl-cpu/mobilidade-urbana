-- Trocamos Zenvia (SMS cru, com tabela própria pra guardar o código) por
-- Twilio Verify — um serviço pronto pra verificação de telefone que já
-- cuida de gerar código, expiração e limite de tentativas do lado dele.
-- Não precisamos mais guardar nada localmente.
drop table if exists public.phone_verifications;
