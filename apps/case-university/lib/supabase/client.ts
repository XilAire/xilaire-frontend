import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client
 * CASE University
 *
 * Uses the shared CASE Supabase platform.
 *
 * createBrowserClient from @supabase/ssr is required so
 * authentication sessions are synchronized through cookies
 * and can be read by:
 *
 * - Next.js Server Components
 * - middleware / proxy
 * - Server Actions
 * - protected CASE University routes
 */
export const supabaseCaseUniversity =
  createBrowserClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY!,
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_UNIVERSITY!,
  );