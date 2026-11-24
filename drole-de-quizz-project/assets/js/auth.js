/* Auth Supabase + synchronisation du profil joueur. */
(() => {
 const $=id=>document.getElementById(id),cfg=window.SUPABASE_CONFIG;let client=null;
 if(cfg.url&&cfg.anonKey&&window.supabase)client=window.supabase.createClient(cfg.url,cfg.anonKey);
 window.DQSupabase={get client(){return client},get ready(){return !!client},async user(){if(!client)return null;const {data}=await client.auth.getUser();return data.user||null;}};
 const profile=()=>{try{return JSON.parse(localStorage.getItem("player_profile_v1")||"{}")}catch(_){return{}}};
 async function sync(){if(!client)return;const {data:{user}}=await client.auth.getUser();if(!user)return;const p=profile();const row={user_id:user.id,display_name:String(p.name||"Super joueur").slice(0,18),avatar:p.avatar||null,custom_avatar:p.customAvatar||null,best_solo_score:+localStorage.getItem("drole_quizz_best_solo")||0,best_streak:+localStorage.getItem("drole_quizz_best_streak")||0,voice_id:localStorage.getItem("drole_quizz_voice_id_v1")||null,updated_at:new Date().toISOString()};const {error}=await client.from("player_profiles").upsert(row);if(error)console.warn(error.message)}
 async function refresh(){if(!client){$("accountStatus").textContent="Configure Supabase dans assets/js/config.js pour activer les comptes.";return}const {data:{session}}=await client.auth.getSession();$("signOut").hidden=!session;$("accountStatus").textContent=session?`Connecté : ${session.user.email}`:"Non connecté.";if(session){sync();window.dispatchEvent(new CustomEvent("dq-auth-changed",{detail:{user:session.user}}));}else{window.dispatchEvent(new CustomEvent("dq-auth-changed",{detail:{user:null}}));}}
 $("signUp").onclick=async()=>{if(!client)return refresh();const {error}=await client.auth.signUp({email:$("accountEmail").value,password:$("accountPassword").value});$("accountStatus").textContent=error?error.message:"Compte créé. Confirme ton adresse e-mail."};
 $("signIn").onclick=async()=>{if(!client)return refresh();const {error}=await client.auth.signInWithPassword({email:$("accountEmail").value,password:$("accountPassword").value});$("accountStatus").textContent=error?error.message:"Connexion réussie.";refresh()};
 $("signOut").onclick=async()=>{if(client)await client.auth.signOut();refresh()};refresh();
})();
