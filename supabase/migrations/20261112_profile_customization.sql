-- Solstreak: campos para personalização do perfil
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.profiles
  add column if not exists avatar text not null default '☀️',
  add column if not exists avatar_color text not null default '#F8DFB5';

alter table public.profiles
  drop constraint if exists profiles_avatar_check,
  add constraint profiles_avatar_check
    check (avatar in ('☀️','🌻','🌼','🌞','🍊','🦋','🌈','🌿')),
  drop constraint if exists profiles_avatar_color_check,
  add constraint profiles_avatar_color_check
    check (avatar_color in ('#F8DFB5','#F9D8C8','#F5E5A8','#DCEBCF','#D9E8F4','#E8DDF3'));
