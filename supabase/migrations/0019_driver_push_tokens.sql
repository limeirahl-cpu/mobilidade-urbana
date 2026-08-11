-- Token de push do Expo, salvo quando o motorista fica online — é o que a
-- Edge Function notify-drivers-new-ride usa pra avisar de corrida nova
-- mesmo com o app em segundo plano/tela bloqueada.
alter table public.driver_status
  add column push_token text;
