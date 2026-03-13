// Supabase client configuration
// Uses the publishable (anon) key only — safe for frontend use.

const SUPABASE_URL = 'https://evglunzvwcrlzpemnklw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9SfqpPFk-RLQqxig-WEBlw_5vTh3Ypc';

if (typeof window.supabase === 'undefined') {
  console.error('[Supabase] CDN not loaded — window.supabase is undefined.');
} else {
  console.log('[Supabase] CDN loaded OK.');
}

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('[Supabase] Client initialized:', supabaseClient ? 'OK' : 'FAILED');
