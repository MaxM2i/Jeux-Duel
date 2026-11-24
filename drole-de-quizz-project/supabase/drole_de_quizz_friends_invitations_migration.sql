-- Drôle de Quizz — extension amis + invitations directes de salons
-- À exécuter dans Supabase SQL Editor après le schéma principal.

-- 1) Code ami public, unique et non devinable.
alter table public.player_profiles
  add column if not exists friend_code text;
update public.player_profiles
set friend_code = upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
where friend_code is null;
alter table public.player_profiles
  alter column friend_code set default upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8)),
  alter column friend_code set not null;
create unique index if not exists player_profiles_friend_code_uidx
  on public.player_profiles(friend_code);

-- 2) Informations nécessaires pour une invitation sans code à saisir.
alter table public.room_invitations
  add column if not exists room_code text,
  add column if not exists peer_id text,
  add column if not exists game_mode text not null default 'multiplayer'
    check (game_mode in ('challenge','multiplayer')),
  add column if not exists topic_id text;

-- 3) Ajout d'un ami à partir de son code.
create or replace function public.send_friend_request_by_code(p_friend_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_target uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'Connexion requise.'; end if;
  select user_id into v_target from public.player_profiles
    where friend_code = upper(trim(p_friend_code));
  if v_target is null then raise exception 'Code ami introuvable.'; end if;
  if v_target = v_me then raise exception 'Tu ne peux pas t’ajouter toi-même.'; end if;
  if exists (select 1 from public.friendships f
      where least(f.requester_id,f.addressee_id)=least(v_me,v_target)
        and greatest(f.requester_id,f.addressee_id)=greatest(v_me,v_target)
        and f.status in ('pending','accepted','blocked')) then
    raise exception 'Une demande existe déjà, vous êtes déjà amis ou cette relation est bloquée.';
  end if;
  update public.friendships f set requester_id=v_me, addressee_id=v_target, status='pending', updated_at=now()
    where least(f.requester_id,f.addressee_id)=least(v_me,v_target)
      and greatest(f.requester_id,f.addressee_id)=greatest(v_me,v_target)
      and f.status='declined'
    returning f.id into v_id;
  if v_id is null then
    insert into public.friendships(requester_id,addressee_id,status)
      values(v_me,v_target,'pending') returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- 4) Données d'affichage des demandes reçues, sans exposer les profils privés.
create or replace function public.get_pending_friend_requests()
returns table(id uuid, requester_id uuid, display_name text, avatar text, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select f.id, f.requester_id, p.display_name, p.avatar, f.created_at
  from public.friendships f
  join public.player_profiles p on p.user_id=f.requester_id
  where f.addressee_id=auth.uid() and f.status='pending'
  order by f.created_at desc;
$$;

-- 5) Invitations de jeu reçues.
create or replace function public.get_pending_game_invitations()
returns table(
  id uuid, room_id uuid, room_code text, peer_id text,
  game_mode text, topic_id text, inviter_id uuid,
  inviter_name text, created_at timestamptz
)
language sql stable security definer set search_path=public as $$
  select i.id, i.room_id, i.room_code, i.peer_id, i.game_mode,
         i.topic_id, i.inviter_id, p.display_name, i.created_at
  from public.room_invitations i
  join public.player_profiles p on p.user_id=i.inviter_id
  where i.invitee_id=auth.uid() and i.status='pending'
  order by i.created_at desc;
$$;

-- 6) RLS : invitations créées uniquement par un membre du salon,
-- à destination d'un ami accepté. Réponse réservée au destinataire.
drop policy if exists "invitations_create_by_inviter" on public.room_invitations;
create policy "invitations_create_by_inviter" on public.room_invitations
for insert to authenticated
with check (
  inviter_id=auth.uid()
  and public.is_room_member(room_id)
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and ((f.requester_id=auth.uid() and f.addressee_id=invitee_id)
        or (f.addressee_id=auth.uid() and f.requester_id=invitee_id))
  )
);

-- Le destinataire peut accepter/refuser ; les colonnes d'identité/invitation
-- restent inchangées par le client.
drop policy if exists "invitations_respond_by_invitee" on public.room_invitations;
create policy "invitations_respond_by_invitee" on public.room_invitations
for update to authenticated
using (invitee_id=auth.uid() and status='pending')
with check (invitee_id=auth.uid() and status in ('accepted','declined'));

revoke all on function public.send_friend_request_by_code(text) from public;
revoke all on function public.get_pending_friend_requests() from public;
revoke all on function public.get_pending_game_invitations() from public;
grant execute on function public.send_friend_request_by_code(text) to authenticated;
grant execute on function public.get_pending_friend_requests() to authenticated;
grant execute on function public.get_pending_game_invitations() to authenticated;

-- Activer les événements Realtime des invitations.
do $$ begin
  alter publication supabase_realtime add table public.room_invitations;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Empêche le destinataire d'altérer l'identité du salon ou de l'invitant
-- lorsqu'il accepte/refuse : seuls status et responded_at peuvent changer.
create or replace function public.guard_room_invitation_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() = old.invitee_id then
    if new.id is distinct from old.id
      or new.room_id is distinct from old.room_id
      or new.inviter_id is distinct from old.inviter_id
      or new.invitee_id is distinct from old.invitee_id
      or new.room_code is distinct from old.room_code
      or new.peer_id is distinct from old.peer_id
      or new.game_mode is distinct from old.game_mode
      or new.topic_id is distinct from old.topic_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Les informations de l’invitation ne peuvent pas être modifiées.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_room_invitation_update on public.room_invitations;
create trigger trg_guard_room_invitation_update
before update on public.room_invitations
for each row execute function public.guard_room_invitation_update();
