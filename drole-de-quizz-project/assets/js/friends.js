/* Gestion des amis et des invitations de salon via Supabase. */
(() => {
 const $ = id => document.getElementById(id);
 const api = () => window.DQSupabase?.client;
 let currentUser = null, inviteSubscription = null, friendSubscription = null;
 const status = message => { if ($('friendsStatus')) $('friendsStatus').textContent = message || ''; };
 const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const avatarSrc = (avatar, customAvatar) => {
   if (avatar === 'custom' && typeof customAvatar === 'string' && customAvatar.startsWith('data:image/')) return customAvatar;
   if (!avatar || avatar === 'custom') return '';
   if (/^(https?:|data:image\/)/i.test(avatar)) return avatar;
   return 'assets/avatar/' + encodeURIComponent(String(avatar).replace(/^assets\/avatar\//, ''));
 };
 const friendAvatar = f => { const src=avatarSrc(f.avatar, f.custom_avatar); return src ? `<img class="friend-avatar" src="${esc(src)}" alt="Avatar de ${esc(f.display_name)}" loading="lazy" onerror="this.hidden=true">` : '<span class="friend-avatar-fallback" aria-hidden="true">🙂</span>'; };
 async function refresh() {
   const db = api();
   if (!db) { status('Configure l’URL et la clé publique Supabase dans assets/js/config.js.'); return; }
   currentUser = await window.DQSupabase.user();
   if (!currentUser) { pendingGameInvitations=[]; updateHomeInviteBadges(); $('myFriendCode').textContent='—'; $('friendsList').innerHTML='<p class="small">Connecte-toi pour retrouver tes amis.</p>'; $('friendRequests').innerHTML=''; $('gameInvitations').innerHTML=''; return; }
   const {data:profile,error:pErr}=await db.from('player_profiles').select('friend_code').eq('user_id',currentUser.id).maybeSingle();
   if (pErr) status(pErr.message); else {
     const code = profile?.friend_code || 'Code en création';
     $('myFriendCode').textContent = code;
     if ($('shareFriendCode')) $('shareFriendCode').textContent = code;
   }
   await Promise.all([loadFriends(),loadRequests(),loadGameInvites()]);
   subscribeInvites(); renderRoomPicker();
 }
 async function loadFriends() {
   const db=api(); if(!db||!currentUser)return;
   const {data,error}=await db.rpc('get_friend_profiles');
   if(error){$('friendsList').innerHTML=`<p class="small">${esc(error.message)}</p>`;return;}
   $('friendsList').innerHTML=(data||[]).length?(data||[]).map(f=>`<div class="friend-item"><div class="friend-main">${friendAvatar(f)}<span><strong>${esc(f.display_name)}</strong></span></div><button class="btn soft" data-remove-friend="${f.user_id}">Retirer</button></div>`).join(''):'<p class="small">Tu n’as pas encore d’amis. Ajoute-les avec leur code ami.</p>';
   $('friendsList').querySelectorAll('[data-remove-friend]').forEach(b=>b.onclick=()=>removeFriend(b.dataset.removeFriend));
 }
 async function loadRequests(){const {data,error}=await api().rpc('get_pending_friend_requests');
   if(error){$('friendRequests').innerHTML=`<p class="small">${esc(error.message)}</p>`;return;}
   $('friendRequests').innerHTML=(data||[]).length?data.map(r=>`<div class="friend-item"><div class="friend-main">${friendAvatar(r)}<strong>${esc(r.display_name||'Joueur')}</strong></div><div class="friend-actions"><button class="btn" data-accept-friend="${r.id}">Accepter</button><button class="btn soft" data-decline-friend="${r.id}">Refuser</button></div></div>`).join(''):'<p class="small">Aucune demande en attente.</p>';
   $('friendRequests').querySelectorAll('[data-accept-friend]').forEach(b=>b.onclick=()=>respondFriend(b.dataset.acceptFriend,'accepted'));
   $('friendRequests').querySelectorAll('[data-decline-friend]').forEach(b=>b.onclick=()=>respondFriend(b.dataset.declineFriend,'declined'));
 }
 let pendingGameInvitations = [];
 function renderGameInvitationRows(target, rows) {
   if (!target) return;
   target.innerHTML = rows.length ? rows.map(i=>`<div class="game-invite-item"><span><strong>${esc(i.inviter_name||'Un ami')}</strong> t’invite à jouer (${i.game_mode === 'challenge' ? 'Défi' : 'Multijoueur'})${i.topic_id ? ' · '+esc(i.topic_id) : ''}</span><div class="friend-actions"><button class="btn" data-accept-game="${i.id}">Rejoindre</button><button class="btn soft" data-decline-game="${i.id}">Refuser</button></div></div>`).join('') : '<p class="small">Aucune invitation pour le moment.</p>';
   target.querySelectorAll('[data-accept-game]').forEach(b=>b.onclick=()=>acceptGameInvite(b.dataset.acceptGame));
   target.querySelectorAll('[data-decline-game]').forEach(b=>b.onclick=()=>respondGameInvite(b.dataset.declineGame,'declined'));
 }
 function updateHomeInviteBadges() {
   const challengeCount = pendingGameInvitations.filter(i => i.game_mode === 'challenge').length;
   const multiCount = pendingGameInvitations.filter(i => i.game_mode === 'multiplayer').length;
   const challengeBadge = $('challengeInviteBadge'), multiBadge = $('multiInviteBadge');
   if (challengeBadge) { challengeBadge.hidden = !challengeCount; challengeBadge.textContent = challengeCount ? `🔔 ${challengeCount} invitation${challengeCount>1?'s':''}` : ''; }
   if (multiBadge) { multiBadge.hidden = !multiCount; multiBadge.textContent = multiCount ? `🔔 ${multiCount} invitation${multiCount>1?'s':''}` : ''; }
 }
 async function loadGameInvites(){
   const {data,error}=await api().rpc('get_pending_game_invitations');
   if(error){$('gameInvitations').innerHTML=`<p class="small">${esc(error.message)}</p>`;return;}
   pendingGameInvitations = data || [];
   updateHomeInviteBadges();
   renderGameInvitationRows($('gameInvitations'), pendingGameInvitations);
   renderModeInvitations(window.DQOnline?.currentMode?.() || '');
 }
 function renderModeInvitations(mode) {
   const box=$('modeGameInvitations'), list=$('modeGameInvitationsList');
   if(!box || !list) return;
   const isOnline = mode === 'multiplayer' || (mode === 'challenge' && $('challengePlayMode')?.value === 'online');
   if (!isOnline || !currentUser) { box.hidden=true; return; }
   const rows=pendingGameInvitations.filter(i => i.game_mode === mode);
   box.hidden=false;
   $('modeGameInvitationsTitle').textContent = mode === 'challenge' ? 'Invitations de défi reçues' : 'Invitations multijoueur reçues';
   renderGameInvitationRows(list, rows);
 }
 async function addFriend(){const db=api();if(!db||!currentUser){status('Connecte-toi pour ajouter un ami.');return;}const code=$('friendCodeInput').value.trim().toUpperCase();if(!code){status('Saisis le code ami.');return;}const {error}=await db.rpc('send_friend_request_by_code',{p_friend_code:code});status(error?error.message:'Demande envoyée !');$('friendCodeInput').value='';await loadRequests();}
 async function respondFriend(id,next){const {error}=await api().from('friendships').update({status:next}).eq('id',id);status(error?.message|| (next==='accepted'?'Demande acceptée.':'Demande refusée.'));await Promise.all([loadFriends(),loadRequests()]);}
 async function removeFriend(id){const db=api();const {error}=await db.from('friendships').delete().or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUser.id})`);status(error?.message||'Ami retiré.');loadFriends();}
 async function respondGameInvite(id,next){const {error}=await api().from('room_invitations').update({status:next,responded_at:new Date().toISOString()}).eq('id',id);status(error?.message||(next==='accepted'?'Invitation acceptée.':'Invitation refusée.'));loadGameInvites();}
 async function acceptGameInvite(id){const db=api();const {data,error}=await db.from('room_invitations').select('id,room_id,room_code,peer_id,game_mode,topic_id').eq('id',id).single();if(error){status(error.message);return;}if(!window.DQOnline?.acceptInvite){status('Le module de jeu en ligne n’est pas prêt.');return;}const joined=await db.rpc('join_room_by_code',{p_room_code:data.room_code});if(joined.error){status(joined.error.message);return;}const upd=await db.from('room_invitations').update({status:'accepted',responded_at:new Date().toISOString()}).eq('id',id);if(upd.error){status(upd.error.message);return;}await window.DQOnline.acceptInvite(data);}
 function subscribeInvites(){const db=api();if(!db||!currentUser)return;if(inviteSubscription)db.removeChannel(inviteSubscription);inviteSubscription=db.channel('dq-invites-'+currentUser.id).on('postgres_changes',{event:'*',schema:'public',table:'room_invitations',filter:'invitee_id=eq.'+currentUser.id},()=>loadGameInvites()).on('postgres_changes',{event:'*',schema:'public',table:'friendships',filter:'addressee_id=eq.'+currentUser.id},()=>{loadRequests();loadFriends()}).subscribe();}
 let roomSubscription=null;
 async function subscribeRoomChanges(){
   const db=api(),info=window.DQOnline?.roomInfo?.();if(!db||!info?.supabaseRoomId)return;
   if(roomSubscription)db.removeChannel(roomSubscription);
   roomSubscription=db.channel('dq-room-'+info.supabaseRoomId)
     .on('postgres_changes',{event:'*',schema:'public',table:'room_invitations',filter:'room_id=eq.'+info.supabaseRoomId},()=>{renderRoomPicker();renderRoomLobby(info.supabaseRoomId,window.DQOnline?.currentRoster?.()||[])})
     .on('postgres_changes',{event:'*',schema:'public',table:'room_members',filter:'room_id=eq.'+info.supabaseRoomId},()=>{renderRoomPicker();renderRoomLobby(info.supabaseRoomId,window.DQOnline?.currentRoster?.()||[])})
     .subscribe();
 }
 async function renderRoomPicker(){
   const box=$('roomFriendInvites'),list=$('roomFriendInviteList'),info=window.DQOnline?.roomInfo?.();
   if(!box||!list)return;
   if(!info?.peerId||!info?.supabaseRoomId||!currentUser){box.hidden=true;return;}
   const db=api();
   const [{data:friends},{data:invites},{data:members}]=await Promise.all([
      db.rpc('get_friend_profiles'),
      db.from('room_invitations').select('id,invitee_id,status').eq('room_id',info.supabaseRoomId),
      db.from('room_members').select('user_id,peer_id,member_status').eq('room_id',info.supabaseRoomId)
   ]);
   activeRoomInviteRows=invites||[]; activeRoomMemberRows=members||[];
   box.hidden=false;
   list.innerHTML=(friends||[]).map(friend=>{
      const invite=activeRoomInviteRows.find(row=>row.invitee_id===friend.user_id);
      const member=activeRoomMemberRows.find(row=>row.user_id===friend.user_id && row.member_status==='joined');
      let label='Inviter', action='invite', disabled='';
      if(member && invite?.status==='accepted'){label='Sortir du salon';action='leave';}
      else if(invite?.status==='pending'){label="Annuler l’invitation";action='cancel';}
      else if(invite?.status==='accepted'){label='Invitation acceptée';action='waiting';disabled='disabled';}
      return `<div class="friend-item"><div class="friend-main">${friendAvatar(friend)}<strong>${esc(friend.display_name)}</strong></div><button class="btn ${action==='cancel'?'soft':''}" data-room-action="${action}" data-friend-id="${friend.user_id}" ${disabled}>${label}</button></div>`;
   }).join('')||'<p class="small">Ajoute d’abord des amis pour leur envoyer une invitation.</p>';
   list.querySelectorAll('[data-room-action]').forEach(button=>button.onclick=async()=>{
      const friendId=button.dataset.friendId,action=button.dataset.roomAction;
      if(action==='invite') await sendGameInvite(friendId,info);
      else if(action==='cancel') await cancelGameInvite(friendId,info);
      else if(action==='leave') await removeRoomFriend(friendId,info);
      await renderRoomPicker();
   });
 }
 async function cancelGameInvite(friendId,info){
   const {error}=await api().from('room_invitations').update({status:'cancelled',responded_at:new Date().toISOString()})
      .eq('room_id',info.supabaseRoomId).eq('invitee_id',friendId);
   status(error?.message||'Invitation annulée.');
 }
 async function removeRoomFriend(friendId,info){
   const member=activeRoomMemberRows.find(row=>row.user_id===friendId&&row.member_status==='joined');
   if(member?.peer_id) window.DQOnline?.kickRoomPlayer?.(member.peer_id);
   const {error}=await api().from('room_members').update({member_status:'left',left_at:new Date().toISOString()})
      .eq('room_id',info.supabaseRoomId).eq('user_id',friendId);
   await api().from('room_invitations').update({status:'cancelled',responded_at:new Date().toISOString()})
      .eq('room_id',info.supabaseRoomId).eq('invitee_id',friendId);
   status(error?.message||'Le joueur a été retiré du salon.');
 }
 async function renderRoomLobby(roomId,players){
   const panel=$('roomLobbyPanel'); if(!panel||!roomId)return;
   const db=api(); if(!db)return;
   panel.hidden=false;
   const mode=window.DQOnline?.currentMode?.();
   $('roomLobbyTitle').textContent=mode==='challenge'?'Salon de défi':'Salon multijoueur';
   $('roomLobbyNotice').textContent='Tu as rejoint le salon. L’hôte peut démarrer la partie dès que les joueurs nécessaires sont présents.';
   $('roomLobbyPlayers').innerHTML=(players||[]).map(player=>`<div class="friend-item"><div class="friend-main">${friendAvatar({avatar:player.avatar,custom_avatar:player.customAvatar,display_name:player.name})}<strong>${esc(player.name)}</strong></div><span class="small">Présent</span></div>`).join('');
   const [{data:invites},{data:members}]=await Promise.all([
      db.from('room_invitations').select('invitee_id,status').eq('room_id',roomId).in('status',['pending','accepted']),
      db.from('room_members').select('user_id,member_status').eq('room_id',roomId).eq('member_status','joined')
   ]);
   const joinedIds=new Set((members||[]).map(row=>row.user_id));
   const ids=[...new Set((invites||[]).map(row=>row.invitee_id).filter(id=>!joinedIds.has(id)))];
   if(!ids.length){$('roomLobbyExpected').innerHTML='<p class="small">Aucun autre joueur attendu.</p>';return;}
   const {data:profiles}=await db.from('player_profiles').select('user_id,display_name,avatar,custom_avatar').in('user_id',ids);
   $('roomLobbyExpected').innerHTML=(profiles||[]).map(profile=>`<div class="friend-item"><div class="friend-main">${friendAvatar({...profile,custom_avatar:profile.custom_avatar})}<strong>${esc(profile.display_name)}</strong></div><span class="small">Invitation envoyée</span></div>`).join('');
 }
 async function sendGameInvite(friendId,info){const db=api();const {data:{user}}=await db.auth.getUser();const {error}=await db.from('room_invitations').upsert({room_id:info.supabaseRoomId,inviter_id:user.id,invitee_id:friendId,room_code:info.roomCode,peer_id:info.peerId,game_mode:info.gameMode,topic_id:info.topicId,status:'pending',responded_at:null},{onConflict:'room_id,invitee_id'});status(error?error.message:'Invitation envoyée !');await renderRoomPicker();await renderRoomLobby(info.supabaseRoomId,window.DQOnline?.currentRoster?.()||[]);}
 $('addFriendBtn')?.addEventListener('click',addFriend);$('copyFriendCode')?.addEventListener('click',()=>{const code=$('myFriendCode').textContent;if(code&&code!=='—')navigator.clipboard?.writeText(code);});
 window.addEventListener('dq-auth-changed',refresh);window.addEventListener('dq-room-ready',()=>{renderRoomPicker();subscribeRoomChanges();});window.addEventListener('dq-profile-open',refresh);
 window.DQFriends={refresh,renderRoomPicker,renderModeInvitations,renderRoomLobby};document.addEventListener('DOMContentLoaded',refresh);
})();
