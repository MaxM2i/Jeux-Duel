-- Profils privés : chaque utilisateur ne peut lire et modifier que sa propre ligne.
create table if not exists public.player_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Super joueur' check (char_length(display_name)<=18),
 avatar text, custom_avatar text, best_solo_score integer not null default 0,
 best_streak integer not null default 0, voice_id text, updated_at timestamptz not null default now()
);
alter table public.player_profiles enable row level security;
create policy "read own profile" on public.player_profiles for select using (auth.uid()=user_id);
create policy "insert own profile" on public.player_profiles for insert with check (auth.uid()=user_id);
create policy "update own profile" on public.player_profiles for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
