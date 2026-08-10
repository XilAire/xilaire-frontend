import {
  createBrowserClient,
} from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET!,
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_CASE_BUDGET!,
  );
}