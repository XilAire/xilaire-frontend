import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * CASE University privileged server-side Supabase client.
 *
 * SECURITY BOUNDARY
 * ------------------------------------------------------------------
 * This client uses the Supabase service-role key and therefore bypasses
 * normal Row Level Security enforcement.
 *
 * It MUST only be imported by trusted server-side CASE University code.
 *
 * Never:
 * - import this module into a Client Component
 * - expose the service-role key through NEXT_PUBLIC_ variables
 * - return the service-role key to the browser
 * - use this client as a replacement for ordinary user-scoped reads
 * - trust browser-supplied user IDs or Stripe environment values
 *
 * Intended uses include privileged server-controlled operations where:
 * - the authenticated user has already been verified server-side
 * - authorization is enforced by a hardened database RPC
 * - CASE_UNIVERSITY_STRIPE_MODE is supplied from the trusted server
 *   environment rather than from browser input
 */

let caseUniversityServiceClient:
  SupabaseClient | null = null;

function requireServerEnvironmentVariable(
  name: string,
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `[CASE University] Missing required server environment variable: ${name}`,
    );
  }

  return value;
}

/**
 * Returns the privileged CASE University Supabase service client.
 *
 * The client is created lazily so importing this module does not
 * immediately fail during build-time module evaluation when environment
 * configuration is unavailable.
 *
 * Session persistence and automatic token refresh are disabled because
 * this is a server-only service-role client, not an end-user session.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (
    caseUniversityServiceClient
  ) {
    return caseUniversityServiceClient;
  }

  const supabaseUrl =
    requireServerEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY",
    );

  const serviceRoleKey =
    requireServerEnvironmentVariable(
      "SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY",
    );

  caseUniversityServiceClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

  return caseUniversityServiceClient;
}

/**
 * Alias for code that prefers an explicit "server service" name.
 *
 * Both functions return the same singleton service-role client.
 */
export function createSupabaseServerServiceClient(): SupabaseClient {
  return createSupabaseServiceClient();
}