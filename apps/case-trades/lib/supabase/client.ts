import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client
 * CASE Trades
 * Client components ONLY
 */
export const supabaseCaseTrades = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES!
);
