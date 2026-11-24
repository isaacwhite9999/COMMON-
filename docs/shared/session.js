/* Shared member identity client. The SDK owns session persistence and recovery. */
(() => {
  'use strict';

  let client;
  function memberClient() {
    const config = window.COMMON_CONFIG;
    if (config?.communityBackendReady !== true || !config.supabaseUrl ||
        !config.supabaseAnonKey || !window.supabase?.createClient) return null;

    client ??= window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  window.CommonSession = Object.freeze({ memberClient });
})();
