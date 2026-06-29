import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;

export const supabase = createClient(URL, ANON);