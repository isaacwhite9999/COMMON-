/* Public frontend configuration. Never put service-role secrets here.
   Set communityBackendReady only after RLS and real-user workflows are tested. */
window.COMMON_CONFIG = {
  supabaseUrl: null,
  supabaseAnonKey: null,
  communityBackendReady: false
};
