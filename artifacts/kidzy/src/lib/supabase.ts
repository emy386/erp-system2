import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const hasSupabase = !!(supabaseUrl && supabaseAnonKey);

console.log("[Supabase] VITE_SUPABASE_URL present:", !!rawUrl);
console.log("[Supabase] VITE_SUPABASE_ANON_KEY present:", !!(import.meta.env.VITE_SUPABASE_ANON_KEY));
console.log("[Supabase] hasSupabase:", hasSupabase);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
