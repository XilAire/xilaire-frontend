import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 10 chars):', supabaseKey?.substring(0, 10));

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env variables!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
