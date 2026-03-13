// Supabase client configuration
// Uses the publishable (anon) key only — safe for frontend use.

const SUPABASE_URL = 'https://evglunzvwcrlzpemnklw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9SfqpPFk-RLQqxig-WEBlw_5vTh3Ypc';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
