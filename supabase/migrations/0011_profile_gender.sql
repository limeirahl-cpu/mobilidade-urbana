alter table public.profiles
  add column gender text check (gender in ('male', 'female'));
