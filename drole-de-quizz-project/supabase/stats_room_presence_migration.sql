-- Drôle de Quizz — persistance des statistiques et présence réseau
-- À exécuter une seule fois dans Supabase > SQL Editor.

-- Identifiant PeerJS associé au membre (permet à l'hôte de retirer un ami du salon).
alter table public.room_members
  add column if not exists peer_id text,
  add column if not exists left_at timestamptz;

create index if not exists room_members_peer_id_idx
  on public.room_members(room_id, peer_id);

-- Le navigateur ne peut modifier que son identifiant PeerJS via cette RPC,
-- sans obtenir le droit de modifier son rôle ou son score.
create or replace function public.set_room_peer_id(p_room_id uuid, p_peer_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;
  update public.room_members
     set peer_id = p_peer_id, last_seen_at = now()
   where room_id = p_room_id and user_id = auth.uid()
     and member_status in ('joined','ready');
  return found;
end;
$$;
revoke all on function public.set_room_peer_id(uuid,text) from public;
grant execute on function public.set_room_peer_id(uuid,text) to authenticated;

-- Agrégats persistants synchronisés entre appareils.
create table if not exists public.player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_solo integer not null default 0,
  games_challenge integer not null default 0,
  games_multi integer not null default 0,
  correct_count bigint not null default 0,
  wrong_count bigint not null default 0,
  total_response_ms bigint not null default 0,
  timed_answers bigint not null default 0,
  themes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_stats enable row level security;

drop policy if exists "player_stats_select_own" on public.player_stats;
create policy "player_stats_select_own" on public.player_stats
for select to authenticated using (user_id = auth.uid());

grant select on public.player_stats to authenticated;

-- Les navigateurs ne modifient jamais directement les totaux :
-- cette fonction n'accepte que l'utilisateur authentifié et incrémente les compteurs.
create or replace function public.record_player_stats(
  p_mode text default null,
  p_topic text default null,
  p_correct integer default 0,
  p_wrong integer default 0,
  p_total_response_ms bigint default 0,
  p_timed_answers integer default 0,
  p_game_count integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_topic text := nullif(trim(coalesce(p_topic, '')), '');
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Authentification requise pour sauvegarder les statistiques.';
  end if;
  if coalesce(p_correct,0) < 0 or coalesce(p_wrong,0) < 0
     or coalesce(p_total_response_ms,0) < 0 or coalesce(p_timed_answers,0) < 0
     or coalesce(p_game_count,0) < 0 then
    raise exception 'Valeur statistique invalide.';
  end if;
  if p_mode not in ('solo','challenge','multi') and p_mode is not null then
    raise exception 'Mode de jeu invalide.';
  end if;

  insert into public.player_stats as current_stats (
    user_id, games_solo, games_challenge, games_multi,
    correct_count, wrong_count, total_response_ms, timed_answers, themes
  ) values (
    v_user,
    case when p_mode='solo' then coalesce(p_game_count,0) else 0 end,
    case when p_mode='challenge' then coalesce(p_game_count,0) else 0 end,
    case when p_mode='multi' then coalesce(p_game_count,0) else 0 end,
    coalesce(p_correct,0), coalesce(p_wrong,0),
    coalesce(p_total_response_ms,0), coalesce(p_timed_answers,0),
    case when v_topic is not null and (coalesce(p_correct,0)+coalesce(p_wrong,0)) > 0
      then jsonb_build_object(v_topic, jsonb_build_object(
        'played', coalesce(p_correct,0)+coalesce(p_wrong,0),
        'correct', coalesce(p_correct,0), 'wrong', coalesce(p_wrong,0)))
      else '{}'::jsonb end
  )
  on conflict (user_id) do update set
    games_solo = current_stats.games_solo + excluded.games_solo,
    games_challenge = current_stats.games_challenge + excluded.games_challenge,
    games_multi = current_stats.games_multi + excluded.games_multi,
    correct_count = current_stats.correct_count + excluded.correct_count,
    wrong_count = current_stats.wrong_count + excluded.wrong_count,
    total_response_ms = current_stats.total_response_ms + excluded.total_response_ms,
    timed_answers = current_stats.timed_answers + excluded.timed_answers,
    themes = case
      when v_topic is null or (coalesce(p_correct,0)+coalesce(p_wrong,0)) = 0
        then current_stats.themes
      else current_stats.themes || jsonb_build_object(v_topic, jsonb_build_object(
        'played', coalesce((current_stats.themes->v_topic->>'played')::integer,0)+coalesce(p_correct,0)+coalesce(p_wrong,0),
        'correct', coalesce((current_stats.themes->v_topic->>'correct')::integer,0)+coalesce(p_correct,0),
        'wrong', coalesce((current_stats.themes->v_topic->>'wrong')::integer,0)+coalesce(p_wrong,0)))
    end,
    updated_at = now()
  returning to_jsonb(current_stats) into v_result;

  return v_result;
end;
$$;

revoke all on function public.record_player_stats(text,text,integer,integer,bigint,integer,integer) from public;
grant execute on function public.record_player_stats(text,text,integer,integer,bigint,integer,integer) to authenticated;

-- Les invitations doivent pouvoir être annulées par leur auteur (l'hôte).
drop policy if exists "invitations_update_by_inviter" on public.room_invitations;
create policy "invitations_update_by_inviter" on public.room_invitations
for update to authenticated
using (inviter_id = auth.uid())
with check (inviter_id = auth.uid() and status in ('pending','cancelled'));
