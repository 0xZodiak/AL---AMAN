// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client for Frontend usage.
 * Uses Anon Key for limited public access (governed by RLS).
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing in frontend.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
