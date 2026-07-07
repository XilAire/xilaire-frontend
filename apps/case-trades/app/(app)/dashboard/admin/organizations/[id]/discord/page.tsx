import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Organization Discord | CASE Trades",
  description:
    "Manage Discord integration for an organization, including server connections, bot configuration, member synchronization, role mapping, invite management, and community settings within the CASE Trades platform.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  );
}

function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function createAdminSupabaseClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function updateOrganizationDiscord(formData: FormData) {
  "use server";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const organizationId = String(formData.get("organization_id") || "").trim();
  const discordInviteUrl = String(
    formData.get("discord_invite_url") || ""
  ).trim();
  const discordGuildId = String(formData.get("discord_guild_id") || "").trim();

  if (!organizationId) {
    throw new Error("Organization ID is required.");
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      discord_invite_url: discordInviteUrl || null,
      discord_guild_id: discordGuildId || null,
    })
    .eq("id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/admin/organizations/${organizationId}/discord`);
}

export default async function OrganizationDiscordPage({ params }: PageProps) {
  const supabase = createAdminSupabaseClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, slug, discord_invite_url, discord_guild_id")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !organization) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-red-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organization Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            No organization was found for ID: {params.id}
          </p>

          <Link
            href="/dashboard/admin/organizations"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  const hasInvite = Boolean(organization.discord_invite_url);
  const hasGuild = Boolean(organization.discord_guild_id);
  const isConfigured = hasInvite && hasGuild;

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-100">
            Discord Settings
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Manage Discord access for {organization.name}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/admin/organizations/${organization.id}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Organization Details
          </Link>

          <Link
            href="/dashboard/admin/organizations"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            All Organizations
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Discord Status</p>
          <p
            className={
              "mt-2 text-2xl font-bold " +
              (isConfigured ? "text-emerald-300" : "text-orange-300")
            }
          >
            {isConfigured ? "Configured" : "Incomplete"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Invite URL</p>
          <p
            className={
              "mt-2 text-2xl font-bold " +
              (hasInvite ? "text-emerald-300" : "text-slate-500")
            }
          >
            {hasInvite ? "Set" : "Missing"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Guild ID</p>
          <p
            className={
              "mt-2 text-2xl font-bold " +
              (hasGuild ? "text-emerald-300" : "text-slate-500")
            }
          >
            {hasGuild ? "Set" : "Missing"}
          </p>
        </div>
      </div>

      <form
        action={updateOrganizationDiscord}
        className="space-y-6 rounded-xl border border-white/10 bg-slate-900/80 p-6"
      >
        <input type="hidden" name="organization_id" value={organization.id} />

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-100">
              Discord Server Configuration
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              These settings control the customer-facing Discord flow on the
              billing page and the role sync engine.
            </p>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">
              Discord Invite URL
            </span>

            <input
              name="discord_invite_url"
              type="url"
              defaultValue={organization.discord_invite_url || ""}
              placeholder="https://discord.gg/example"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />

            <p className="text-xs text-slate-500">
              Customers use this link to join the organization Discord server
              before role sync.
            </p>
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">
              Discord Guild ID
            </span>

            <input
              name="discord_guild_id"
              defaultValue={organization.discord_guild_id || ""}
              placeholder="924807386085089351"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />

            <p className="text-xs text-slate-500">
              Required for automatic Discord role assignment. This is the
              Discord server ID, not the invite code.
            </p>
          </label>
        </section>

        <section className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
          <h3 className="font-semibold text-sky-200">
            Customer Discord Flow
          </h3>

          <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
              <p className="font-medium text-slate-100">Step 1</p>
              <p className="mt-1 text-slate-400">
                Customer joins the organization Discord server.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
              <p className="font-medium text-slate-100">Step 2</p>
              <p className="mt-1 text-slate-400">
                Customer connects their Discord account in billing.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
              <p className="font-medium text-slate-100">Step 3</p>
              <p className="mt-1 text-slate-400">
                CASE Trades syncs subscription roles into Discord.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
          <Link
            href={`/dashboard/admin/organizations/${organization.id}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Save Discord Settings
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-semibold text-slate-100">
        Discord Role Mappings
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        Configure which Discord roles are assigned when
        customers purchase specific CASE Trades plans.
      </p>
    </div>

    <Link
      href={`/dashboard/admin/organizations/${organization.id}/role-mappings`}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      Manage Role Mappings
    </Link>
  </div>

  <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
    <p className="text-sm text-indigo-200">
      Example:
    </p>

    <ul className="mt-2 space-y-1 text-sm text-slate-300">
      <li>signals_monthly → Discord Signals Member</li>
      <li>signals_pro → Discord Signals Pro</li>
      <li>journal_pro → Discord Journal Pro</li>
    </ul>
  </div>
</section>
    </main>
  );
}