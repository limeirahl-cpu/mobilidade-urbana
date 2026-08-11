-- Registro de aceite dos Termos de Uso/Política de Privacidade — exigido
-- antes de completar o cadastro (role-select.tsx). Guarda quando aceitou,
-- não só um boolean, pra ter prova de consentimento com data.
alter table public.profiles
  add column terms_accepted_at timestamptz;
