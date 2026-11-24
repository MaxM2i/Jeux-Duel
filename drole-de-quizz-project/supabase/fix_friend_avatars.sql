-- Drôle de Quizz — correctif affichage des avatars amis
-- À exécuter dans Supabase > SQL Editor.
-- La fonction précédente ne renvoyait que avatar et omettait custom_avatar.

drop function if exists public.get_friend_profiles();

create function public.get_friend_profiles()
returns table (
  user_id uuid,
  display_name text,
  avatar text,
  custom_avatar text,
  best_solo_score integer,
  best_streak integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.display_name, p.avatar, p.custom_avatar,
         p.best_solo_score, p.best_streak
  from public.player_profiles p
  where auth.uid() is not null
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = p.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = p.user_id))
    );
$$;

revoke all on function public.get_friend_profiles() from public;
grant execute on function public.get_friend_profiles() to authenticated;
