/* Configuration publique du frontend.
 * Supabase Dashboard > Project Settings > API :
 * - url : Project URL
 * - anonKey : clé publishable / anon (jamais service_role)
 * L'URL du backend ne sert qu'aux fonctions IA/voix hébergées séparément.
 */
window.API_BASE_URL = "http://localhost:3000"; // Remplacer par l'URL HTTPS du backend déployé.
window.SUPABASE_CONFIG = {
  url: "",      // Ex. https://xxxxxxxx.supabase.co
  anonKey: ""   // Clé publique anon/publishable du projet
};
