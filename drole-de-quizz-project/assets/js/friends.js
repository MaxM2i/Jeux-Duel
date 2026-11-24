/* Gestion des amis et des invitations de salon via Supabase. */
(() => {
 const $ = id => document.getElementById(id);
 const api = () => window.DQSupabase?.client;
 let currentUser = null, inviteSubscription = null, friendSubscription = null;
 const status = message => { if ($('friendsStatus')) $('friendsStatus').textContent = message || ''; };
 const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function refresh() {
   const db = api();
   if (!db) { status('Configure l’URL et la clé publique Supabase dans assets/js/config.js.'); return; }
   currentUser = await window.DQSupabase.user();
   if (!currentUser) { $('myFriendCode').textContent='—'; $('friendsList').innerHTML='<p class="small">Connecte-toi pour retrouver tes amis.</p>'; $('friendRequests').innerHTML=''; $('gameInvitations').innerHTML=''; return; }
   const {data:profile,error:pErr}=await db.from('player_profiles').select('friend_code').eq('user_id',currentUser.id).maybeSingle();
   if (pErr) status(pErr.message); else $('myFriendCode').textContent=profile?.friend_code || 'Code en création';
   await Promise.all([loadFriends(),loadRequests(),loadGameInvites()]);
   subscribeInvites(); renderRoomPicker();
 }
 async function loadFriends() {
   const db=api(); if(!db||!currentUser)return;
   const {data,error}=await db.rpc('get_friend_profiles');
   if(error){$('friendsList').innerHTML=`<p class="small">${esc(error.message)}</p>`;return;}
   $('friendsList').innerHTML=(data||[]).length?(data||[]).map(f=>`<div class="friend-item"><div class="friend-main">${f.avatar?`<img src="${esc(f.avatar)}" alt="">`:''}<span><strong>${esc(f.display_name)}</strong></span></div><button class="btn soft" data-remove-friend="${f.user_id}">Retirer</button></div>`).join(''):'<p class="small">Tu n’as pas encore d’amis. Ajoute-les avec leur code ami.</p>';
   $('friendsList').querySelectorAll('[data-remove-friend]').forEach(b=>b.onclick=()=>removeFriend(b.dataset.removeFriend));
 }
 async function loadRequests(){const {data,error}=await api().rpc('get_pending_friend_requests');
   if(error){$('friendRequests').innerHTML=`<p class="small">${esc(error.message)}</p>`;return;}
   $('friendRequests').innerHTML=(data||[]).length?data.map(r=>`<div class="friend-item"><strong>${esc(r.display_name||'Joueur')}</strong><div class="friend-actions"><button class="btn" data-accept-friend="${r.id}">Accepter</button><button class="btn soft" data-decline-friend="${r.id}">Refuser</button></div></div>`).join(''):'<p class="small">Aucune demande en attente.</p>';
   $('friendRequests').querySelectorAll('[data-accept-friend]').forEach(b=>b.onclick=()=>respondFriend(b.dataset.acceptFriend,'accepted'));
   $('friendRequests').querySelectorAll('[data-decline-friend]').forEach(b=>b.onclick=()=>respondFriend(b.dataset.declineFriend,'declined'));
 }
 async function loadGameInvites(){const {data,error}=await api().rpc('get_pending_game_invitations');
   if(error){$('gameInvitations').innerHTML=`<p class="small">${esc(error.message)}</p>`;return;}
   $('gameInvitations').innerHTML=(data||[]).length?data.map(i=>`<div class="game-invite-item"><span><strong>${esc(i.inviter_name||'Un ami')}</strong> t’invite à jouer (${esc(i.game_mode)})</span><div class="friend-actions"><button class="btn" data-accept-game="${i.id}">Rejoindre</button><button class="btn soft" data-decline-game="${i.id}">Refuser</button></div></div>`).join(''):'<p class="small">Aucune invitation de jeu.</p>';
   $('gameInvitations').querySelectorAll('[data-accept-game]').forEach(b=>b.onclick=()=>acceptGameInvite(b.dataset.acceptGame));
   $('gameInvitations').querySelectorAll('[data-decline-game]').forEach(b=>b.onclick=()=>respondGameInvite(b.dataset.declineGame,'declined'));
 }
 async function addFriend(){const db=api();if(!db||!currentUser){status('Connecte-toi pour ajouter un ami.');return;}const code=$('friendCodeInput').value.trim().toUpperCase();if(!code){status('Saisis le code ami.');return;}const {error}=await db.rpc('send_friend_request_by_code',{p_friend_code:code});status(error?error.message:'Demande envoyée !');$('friendCodeInput').value='';await loadRequests();}
 async function respondFriend(id,next){const {error}=await api().from('friendships').update({status:next}).eq('id',id);status(error?.message|| (next==='accepted'?'Demande acceptée.':'Demande refusée.'));await Promise.all([loadFriends(),loadRequests()]);}
 async function removeFriend(id){const db=api();const {error}=await db.from('friendships').delete().or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUser.id})`);status(error?.message||'Ami retiré.');loadFriends();}
 async function respondGameInvite(id,next){const {error}=await api().from('room_invitations').update({status:next,responded_at:new Date().toISOString()}).eq('id',id);status(error?.message||(next==='accepted'?'Invitation acceptée.':'Invitation refusée.'));loadGameInvites();}
 async function acceptGameInvite(id){const db=api();const {data,error}=await db.from('room_invitations').select('id,room_id,room_code,peer_id,game_mode,topic_id').eq('id',id).single();if(error){status(error.message);return;}if(!window.DQOnline?.acceptInvite){status('Le module de jeu en ligne n’est pas prêt.');return;}const joined=await db.rpc('join_room_by_code',{p_room_code:data.room_code});if(joined.error){status(joined.error.message);return;}const upd=await db.from('room_invitations').update({status:'accepted',responded_at:new Date().toISOString()}).eq('id',id);if(upd.error){status(upd.error.message);return;}await window.DQOnline.acceptInvite(data);}
 function subscribeInvites(){const db=api();if(!db||!currentUser)return;if(inviteSubscription)db.removeChannel(inviteSubscription);inviteSubscription=db.channel('dq-invites-'+currentUser.id).on('postgres_changes',{event:'*',schema:'public',table:'room_invitations',filter:'invitee_id=eq.'+currentUser.id},()=>loadGameInvites()).on('postgres_changes',{event:'*',schema:'public',table:'friendships',filter:'addressee_id=eq.'+currentUser.id},()=>{loadRequests();loadFriends()}).subscribe();}
 async function renderRoomPicker(){const box=$('roomFriendInvites'),list=$('roomFriendInviteList');if(!box||!list)return;const info=window.DQOnline?.roomInfo?.();if(!info?.peerId||!info?.supabaseRoomId||!currentUser){box.hidden=true;return;}const {data:friends}=await api().rpc('get_friend_profiles');box.hidden=false;list.innerHTML=(friends||[]).map(f=>`<div class="friend-item"><strong>${esc(f.display_name)}</strong><button class="btn" data-invite-friend="${f.user_id}">Inviter</button></div>`).join('')||'<p class="small">Ajoute d’abord des amis pour leur envoyer une invitation.</p>';list.querySelectorAll('[data-invite-friend]').forEach(b=>b.onclick=()=>sendGameInvite(b.dataset.inviteFriend,info));}
 async function sendGameInvite(friendId,info){const db=api();const {data:{user}}=await db.auth.getUser();const {error}=await db.from('room_invitations').insert({room_id:info.supabaseRoomId,inviter_id:user.id,invitee_id:friendId,room_code:info.roomCode,peer_id:info.peerId,game_mode:info.gameMode,topic_id:info.topicId});status(error?error.message:'Invitation envoyée !');}
 $('addFriendBtn')?.addEventListener('click',addFriend);$('copyFriendCode')?.addEventListener('click',()=>{const code=$('myFriendCode').textContent;if(code&&code!=='—')navigator.clipboard?.writeText(code);});
 window.addEventListener('dq-auth-changed',refresh);window.addEventListener('dq-room-ready',renderRoomPicker);window.addEventListener('dq-profile-open',refresh);
 window.DQFriends={refresh,renderRoomPicker};document.addEventListener('DOMContentLoaded',refresh);
})();
