-- ============================================================
-- DRÔLE DE QUIZZ — Schéma Supabase
-- Version : 1.0
-- À exécuter dans Supabase > SQL Editor > New query.
--
-- Authentification : Supabase Auth (aucun mot de passe stocké ici).
-- Les clés service_role / API secrètes ne doivent JAMAIS être
-- placées dans le navigateur ou dans GitHub Pages.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PROFILS JOUEURS
-- Compatible avec assets/js/auth.js : user_id, display_name,
-- avatar, custom_avatar, best_solo_score, best_streak, voice_id.
-- ------------------------------------------------------------
create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Super joueur'
    check (char_length(display_name) between 1 and 24),
  avatar text,
  custom_avatar text,
  best_solo_score integer not null default 0 check (best_solo_score >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  voice_id text,
  bio text check (char_length(coalesce(bio, '')) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_profiles
  add column if not exists bio text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ------------------------------------------------------------
-- 2. AMIS : demande, acceptation, refus, blocage.
-- Une seule relation par paire, quel que soit le sens.
-- ------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);

-- ------------------------------------------------------------
-- 3. SALONS / PARTIES
-- game_mode : challenge (défi en ligne), multiplayer, solo.
-- settings JSONB conserve les réglages de partie sans devoir
-- modifier le schéma à chaque nouvelle option.
-- ------------------------------------------------------------
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique default upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
    check (room_code = upper(room_code) and char_length(room_code) between 5 and 10),
  game_mode text not null check (game_mode in ('challenge', 'multiplayer', 'solo')),
  status text not null default 'waiting'
    check (status in ('waiting', 'ready', 'playing', 'finished', 'cancelled')),
  host_id uuid not null references auth.users(id) on delete restrict,
  topic_id text,
  settings jsonb not null default
    '{"question_count":15,"answer_time_seconds":20,"points_per_correct_answer":100,"voice_enabled":true,"top_signal_enabled":true}'::jsonb,
  max_players integer not null default 6 check (max_players between 1 and 30),
  is_public boolean not null default false,
  current_question integer not null default 0 check (current_question >= 0),
  rematch_of uuid references public.game_rooms(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_rooms_host_idx on public.game_rooms(host_id);
create index if not exists game_rooms_status_idx on public.game_rooms(status);
create index if not exists game_rooms_mode_idx on public.game_rooms(game_mode);
create index if not exists game_rooms_created_idx on public.game_rooms(created_at desc);

-- ------------------------------------------------------------
-- 4. PARTICIPANTS D'UN SALON
-- Les noms/avatars sont des instantanés au moment de la partie :
-- le résultat reste cohérent même si le profil change ensuite.
-- ------------------------------------------------------------
create table if not exists public.room_members (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name_snapshot text not null default 'Joueur'
    check (char_length(display_name_snapshot) between 1 and 24),
  avatar_snapshot text,
  role text not null default 'player' check (role in ('host', 'player')),
  member_status text not null default 'joined'
    check (member_status in ('invited', 'joined', 'ready', 'left', 'disconnected')),
  team_number smallint check (team_number is null or team_number between 1 and 10),
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists room_members_user_idx on public.room_members(user_id);
create index if not exists room_members_room_status_idx on public.room_members(room_id, member_status);

-- Ajoute automatiquement l'hôte comme premier participant.
create or replace function public.add_room_host_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
begin
  select display_name, avatar into v_name, v_avatar
  from public.player_profiles where user_id = new.host_id;

  insert into public.room_members
    (room_id, user_id, display_name_snapshot, avatar_snapshot, role, member_status)
  values
    (new.id, new.host_id, coalesce(v_name, 'Hôte'), v_avatar, 'host', 'joined')
  on conflict (room_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_add_room_host on public.game_rooms;
create trigger trg_add_room_host
after insert on public.game_rooms
for each row execute function public.add_room_host_as_member();

-- ------------------------------------------------------------
-- 5. INVITATIONS À REJOINDRE UN SALON
-- ------------------------------------------------------------
create table if not exists public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint room_invitation_not_self check (inviter_id <> invitee_id),
  unique (room_id, invitee_id)
);

create index if not exists room_invitations_invitee_idx
  on public.room_invitations(invitee_id, status);

-- ------------------------------------------------------------
-- 6. RÉPONSES ET TEMPS DE RÉPONSE
-- Une réponse par joueur et par numéro de question.
-- elapsed_ms est mesuré localement entre le Top et le clic.
-- ------------------------------------------------------------
create table if not exists public.game_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  user_id uuid not null,
  question_index integer not null check (question_index >= 0),
  selected_answer integer,
  is_correct boolean not null default false,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  points_awarded integer not null default 0,
  answered_at timestamptz not null default now(),
  foreign key (room_id, user_id)
    references public.room_members(room_id, user_id) on delete cascade,
  unique (room_id, user_id, question_index)
);

create index if not exists game_answers_room_question_idx
  on public.game_answers(room_id, question_index);

-- ------------------------------------------------------------
-- 7. RÉSULTATS FINAUX
-- ------------------------------------------------------------
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name_snapshot text not null,
  avatar_snapshot text,
  final_score integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  average_response_ms integer,
  fastest_response_ms integer,
  rank_position integer,
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists game_results_user_idx on public.game_results(user_id, created_at desc);
create index if not exists game_results_room_idx on public.game_results(room_id);


-- Fonctions internes SECURITY DEFINER pour éviter les récursions RLS
-- lorsque les règles d'une table doivent vérifier l'appartenance à un salon.
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id
      and m.user_id = auth.uid()
      and m.member_status in ('joined', 'ready')
  );
$$;

create or replace function public.is_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.game_rooms r
    where r.id = p_room_id and r.host_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
revoke all on function public.is_room_host(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_host(uuid) to authenticated;

-- ------------------------------------------------------------
-- 8. FONCTIONS SÉCURISÉES
-- Rejoindre par code sans rendre tous les salons privés lisibles.
-- ------------------------------------------------------------
create or replace function public.join_room_by_code(p_room_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_count integer;
  v_name text;
  v_avatar text;
begin
  if v_user is null then
    raise exception 'Connexion requise pour rejoindre un salon.';
  end if;

  select * into v_room
  from public.game_rooms
  where room_code = upper(trim(p_room_code))
  for update;

  if not found then raise exception 'Code de salon invalide.'; end if;
  if v_room.status not in ('waiting', 'ready') then
    raise exception 'Cette partie a déjà commencé ou est terminée.';
  end if;

  select count(*) into v_count
  from public.room_members
  where room_id = v_room.id and member_status in ('joined', 'ready');

  if v_count >= v_room.max_players then
    raise exception 'Ce salon est complet.';
  end if;

  select display_name, avatar into v_name, v_avatar
  from public.player_profiles where user_id = v_user;

  insert into public.room_members
    (room_id, user_id, display_name_snapshot, avatar_snapshot, role, member_status)
  values
    (v_room.id, v_user, coalesce(v_name, 'Joueur'), v_avatar, 'player', 'joined')
  on conflict (room_id, user_id) do update
    set member_status = 'joined', last_seen_at = now();

  return v_room.id;
end;
$$;

create or replace function public.get_friend_profiles()
returns table (
  user_id uuid,
  display_name text,
  avatar text,
  best_solo_score integer,
  best_streak integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.display_name, p.avatar, p.best_solo_score, p.best_streak
  from public.player_profiles p
  where exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = p.user_id)
        or (f.addressee_id = auth.uid() and f.requester_id = p.user_id))
  );
$$;

-- ------------------------------------------------------------
-- 9. VUES DE STATISTIQUES
-- ------------------------------------------------------------
create or replace view public.player_game_stats
with (security_invoker = true) as
select
  user_id,
  count(*) as games_played,
  count(*) filter (where r.is_winner) as games_won,
  coalesce(sum(r.correct_count), 0) as correct_answers,
  coalesce(sum(r.wrong_count), 0) as wrong_answers,
  round(avg(r.average_response_ms))::integer as average_response_ms,
  coalesce(sum(r.final_score), 0) as total_points
from public.game_results r
group by user_id;

create or replace view public.player_theme_stats
with (security_invoker = true) as
select
  gr.user_id,
  coalesce(room.topic_id, 'mixed') as topic_id,
  count(distinct gr.room_id) as games_played,
  coalesce(sum(gr.correct_count), 0) as correct_answers,
  coalesce(sum(gr.wrong_count), 0) as wrong_answers,
  round(avg(gr.correct_count::numeric /
      nullif(gr.correct_count + gr.wrong_count, 0)) * 100, 1) as success_rate
from public.game_results gr
join public.game_rooms room on room.id = gr.room_id
group by gr.user_id, coalesce(room.topic_id, 'mixed');

-- ------------------------------------------------------------
-- 10. UPDATED_AT AUTOMATIQUE
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.player_profiles;
create trigger trg_profiles_updated_at before update on public.player_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at before update on public.friendships
for each row execute function public.set_updated_at();

drop trigger if exists trg_rooms_updated_at on public.game_rooms;
create trigger trg_rooms_updated_at before update on public.game_rooms
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
alter table public.player_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.game_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invitations enable row level security;
alter table public.game_answers enable row level security;
alter table public.game_results enable row level security;

-- Profils : les données privées (dont voice_id) restent visibles uniquement par soi.
drop policy if exists "profile_select_own" on public.player_profiles;
create policy "profile_select_own" on public.player_profiles
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "profile_insert_own" on public.player_profiles;
create policy "profile_insert_own" on public.player_profiles
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "profile_update_own" on public.player_profiles;
create policy "profile_update_own" on public.player_profiles
for update to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Amis : seules les deux personnes concernées voient la relation.
drop policy if exists "friendships_read_participants" on public.friendships;
create policy "friendships_read_participants" on public.friendships
for select to authenticated
using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "friendships_send_request" on public.friendships;
create policy "friendships_send_request" on public.friendships
for insert to authenticated
with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "friendships_update_recipient" on public.friendships;
create policy "friendships_update_recipient" on public.friendships
for update to authenticated
using (auth.uid() = addressee_id)
with check (auth.uid() = addressee_id and status in ('accepted', 'declined', 'blocked'));

drop policy if exists "friendships_delete_participants" on public.friendships;
create policy "friendships_delete_participants" on public.friendships
for delete to authenticated
using (auth.uid() in (requester_id, addressee_id));

-- Salons : visibles aux membres, à l'hôte et aux salons publics en attente.
drop policy if exists "rooms_read_visible" on public.game_rooms;
create policy "rooms_read_visible" on public.game_rooms
for select to authenticated
using (
  host_id = auth.uid()
  or (is_public and status = 'waiting')
  or public.is_room_member(id)
);

drop policy if exists "rooms_create_as_host" on public.game_rooms;
create policy "rooms_create_as_host" on public.game_rooms
for insert to authenticated
with check (host_id = auth.uid());

drop policy if exists "rooms_update_host" on public.game_rooms;
create policy "rooms_update_host" on public.game_rooms
for update to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

-- Participants : les membres du salon lisent la liste ; chacun ne peut
-- créer/modifier que sa propre présence. L'hôte peut gérer les membres.
drop policy if exists "members_read_room" on public.room_members;
create policy "members_read_room" on public.room_members
for select to authenticated
using (user_id = auth.uid() or public.is_room_member(room_id));

drop policy if exists "members_join_self" on public.room_members;
create policy "members_join_self" on public.room_members
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "members_update_self_or_host" on public.room_members;
create policy "members_update_self_or_host" on public.room_members
for update to authenticated
using (public.is_room_host(room_id))
with check (public.is_room_host(room_id));

-- Invitations : l'invitant crée ; le destinataire consulte et répond.
drop policy if exists "invitations_read_participants" on public.room_invitations;
create policy "invitations_read_participants" on public.room_invitations
for select to authenticated
using (auth.uid() in (inviter_id, invitee_id));

drop policy if exists "invitations_create_by_inviter" on public.room_invitations;
create policy "invitations_create_by_inviter" on public.room_invitations
for insert to authenticated
with check (
  inviter_id = auth.uid()
  and public.is_room_member(room_id)
);

drop policy if exists "invitations_respond_by_invitee" on public.room_invitations;
create policy "invitations_respond_by_invitee" on public.room_invitations
for update to authenticated
using (invitee_id = auth.uid())
with check (invitee_id = auth.uid() and status in ('accepted', 'declined'));

-- Réponses : un joueur ne peut écrire que ses réponses ; les membres
-- d'un même salon peuvent consulter les réponses de la partie.
drop policy if exists "answers_read_room_members" on public.game_answers;
create policy "answers_read_room_members" on public.game_answers
for select to authenticated
using (public.is_room_member(room_id));

-- Les insertions de réponses notées sont réservées au backend de confiance
-- (clé service_role conservée côté serveur), afin d'éviter la falsification
-- des scores et des temps par le navigateur.

-- Résultats : chaque joueur lit les siens ; les membres d'un salon
-- peuvent lire le classement final de cette partie.
drop policy if exists "results_read_self_or_room" on public.game_results;
create policy "results_read_self_or_room" on public.game_results
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_room_member(room_id)
);

-- Les résultats finaux sont également écrits par le backend uniquement.

-- Les fonctions RPC ne sont pas exécutables par les visiteurs anonymes.
revoke all on function public.join_room_by_code(text) from public;
grant execute on function public.join_room_by_code(text) to authenticated;
revoke all on function public.get_friend_profiles() from public;
grant execute on function public.get_friend_profiles() to authenticated;

-- Droits de base pour le rôle authentifié ; RLS limite ensuite les lignes.
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update on public.player_profiles to authenticated;
grant select, insert, update on public.game_rooms to authenticated;
grant select, insert, update on public.room_members to authenticated;
grant select, insert, update on public.room_invitations to authenticated;
grant select on public.game_answers to authenticated;
grant select on public.game_results to authenticated;
grant select on public.player_game_stats, public.player_theme_stats to authenticated;

-- Realtime : active les changements de salons, membres et invitations.
-- Si une table est déjà dans la publication, ignorer l'erreur correspondante.
do $$
begin
  alter publication supabase_realtime add table public.game_rooms;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_invitations;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

-- Fin du schéma.
