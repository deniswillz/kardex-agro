import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabaseUrl && supabaseKey && supabaseUrl.includes('supabase.co');
};
