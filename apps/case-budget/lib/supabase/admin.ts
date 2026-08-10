import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  WorkspaceDatabase,
} from "@/types/database";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME =
  "SUPABASE_SERVICE_ROLE_KEY_CASE_BUDGET";

let adminClient:
  SupabaseClient | null =
    null;

let workspaceAdminClient:
  SupabaseClient<WorkspaceDatabase> | null =
    null;

/**
 * Creates the general CASE Budget Supabase service-role client.
 *
 * IMPORTANT:
 *
 * This client intentionally remains permissive because CASE Budget's
 * complete generated Supabase Database type has not yet been imported.
 *
 * Existing features such as:
 *
 * - subscriptions
 * - billing
 * - Stripe webhooks
 * - financial connections
 * - investments
 * - AI usage
 * - profiles
 *
 * already depend on this client.
 *
 * Applying a partially defined Database generic to this shared client
 * would cause currently untyped tables to resolve their fields as
 * unknown and break otherwise valid application code.
 *
 * Once CASE Budget has a complete Supabase-generated Database type,
 * this client can safely become:
 *
 *   SupabaseClient<Database>
 *
 * Until then, keep this general-purpose client permissive.
 */
export function createAdminClient():
  SupabaseClient {
  if (
    adminClient
  ) {
    return adminClient;
  }

  const url =
    requireEnvironmentVariable(
      SUPABASE_URL_ENV_NAME,
    );

  const serviceRoleKey =
    requireEnvironmentVariable(
      SUPABASE_SERVICE_ROLE_KEY_ENV_NAME,
    );

  adminClient =
    createClient(
      url,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false,
        },
      },
    );

  return adminClient;
}

/**
 * Creates a strongly typed CASE Budget workspace service-role client.
 *
 * This client is intentionally scoped to database objects that have
 * been explicitly confirmed against the existing Supabase schema:
 *
 * - public.workspaces
 * - public.workspace_members
 *
 * It is used by workspace-specific server operations such as:
 *
 * - creating workspaces
 * - creating owner memberships
 * - future workspace lifecycle management
 *
 * Keeping this client separate prevents incomplete database typing
 * from affecting unrelated CASE Budget systems.
 */
export function createWorkspaceAdminClient():
  SupabaseClient<WorkspaceDatabase> {
  if (
    workspaceAdminClient
  ) {
    return workspaceAdminClient;
  }

  const url =
    requireEnvironmentVariable(
      SUPABASE_URL_ENV_NAME,
    );

  const serviceRoleKey =
    requireEnvironmentVariable(
      SUPABASE_SERVICE_ROLE_KEY_ENV_NAME,
    );

  workspaceAdminClient =
    createClient<WorkspaceDatabase>(
      url,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false,
        },
      },
    );

  return workspaceAdminClient;
}

function requireEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    value
  ) {
    return value;
  }

  throw new Error(
    `${variableName} is missing.`,
  );
}