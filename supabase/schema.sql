-- SOLSTREAK: schema inicial
-- Execute este arquivo no SQL Editor do seu projeto Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique
    check (char_length(nickname) between 3 and 18)
    check (nickname ~ '^[A-Za-z0-9_.-]+$'),
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index if not exists checkins_user_date_idx
  on public.checkins(user_id, checkin_date desc);

alter table public.profiles enable row level security;
alter table public.checkins enable row level security;

-- Perfis e registros são públicos para consulta.
create policy "Perfis visíveis publicamente"
  on public.profiles for select using (true);

create policy "Cada pessoa cria seu próprio perfil"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Cada pessoa atualiza seu próprio perfil"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Registros visíveis publicamente"
  on public.checkins for select using (true);

create policy "Cada pessoa registra apenas para si"
  on public.checkins for insert to authenticated
  with check (auth.uid() = user_id);

-- Não permitir que alguém altere ou apague registros de outra pessoa.
create policy "Cada pessoa pode apagar apenas seus registros"
  on public.checkins for delete to authenticated
  using (auth.uid() = user_id);

-- Acesso anônimo precisa estar habilitado em Authentication > Sign In / Providers.
-- Usuários anônimos recebem papel authenticated no Supabase.
