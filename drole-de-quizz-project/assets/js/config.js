/* Configuration publique du frontend.
 * Supabase Dashboard > Project Settings > API :
 * - url : Project URL
 * - anonKey : clé publishable / anon (jamais service_role)
 * L'URL du backend ne sert qu'aux fonctions IA/voix hébergées séparément.
 */
//window.API_BASE_URL = "http://localhost:3000"; // Remplacer par l'URL HTTPS du backend déployé.
window.SUPABASE_CONFIG = {
  url: "https://ipzdlrfnlnzupujygxri.supabase.co",      // Ex. https://xxxxxxxx.supabase.co
  anonKey: "sb_publishable_hpKEJjDQKfQrZe6TILknew_Oyodcv_n"   // Clé publique anon/publishable du projet
};
