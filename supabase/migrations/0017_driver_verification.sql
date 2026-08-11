-- Verificação básica de documento do motorista, pra poder soltar motoristas
-- de verdade na rua com algum controle mínimo — antes disso, qualquer um
-- virava motorista sem enviar nada.
alter table public.profiles
  add column cnh_photo_url text,
  add column vehicle_document_url text,
  add column vehicle_photo_url text,
  add column vehicle_plate text,
  add column verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  add column verification_notes text;

-- Sem painel admin ainda (não existe um no projeto) — aprovação continua
-- manual via SQL Editor por enquanto, igual já é hoje pra categorias e
-- cupons (`update profiles set verification_status='approved' where id=...`).

-- Bucket privado (diferente do `avatars`, público, de 0008) — documento de
-- motorista não deve ser lido por qualquer um com a URL. Sem policy de
-- select pública: o painel do Supabase (Storage) usa a service role, que
-- ignora RLS, então continua dando pra revisar os arquivos por ali mesmo
-- sem uma policy de leitura liberada pro cliente.
insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', false)
on conflict (id) do nothing;

create policy "driver_documents_owner_select"
  on storage.objects for select
  using (bucket_id = 'driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "driver_documents_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "driver_documents_owner_update"
  on storage.objects for update
  using (bucket_id = 'driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fecha no banco a possibilidade de o app cliente simplesmente pular a
-- checagem de verificação e ligar is_online direto via update na tabela —
-- toggleOnline() passa a chamar esta function em vez de dar update direto
-- em driver_status.
create or replace function public.set_driver_online(p_online boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_online and not exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_status = 'approved'
  ) then
    raise exception 'Motorista ainda não foi aprovado';
  end if;

  update public.driver_status
  set is_online = p_online, updated_at = now()
  where driver_id = auth.uid();
end;
$$;

grant execute on function public.set_driver_online(boolean) to authenticated;

-- Defesa em profundidade: mesmo que alguém chame um UPDATE direto na tabela
-- (pulando o app/RPC acima), a policy já barra ligar is_online=true sem
-- aprovação — só desligar (is_online=false) continua livre.
drop policy if exists "driver_status_update_self" on public.driver_status;
create policy "driver_status_update_self"
  on public.driver_status for update
  using (driver_id = auth.uid())
  with check (
    driver_id = auth.uid()
    and (
      is_online = false
      or exists (select 1 from public.profiles where id = auth.uid() and verification_status = 'approved')
    )
  );
