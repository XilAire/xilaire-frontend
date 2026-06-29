import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

export const supabaseBrowser = createClient(URL, ANON);

// Expose to browser console for debugging
if (typeof window !== "undefined") {
  (window as any).supabase = supabaseBrowser;
}
