import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

type PlanRow = {
  id: string;
  key: string;
  name: string | null;
};

type RoleMappingRow = {
  id: string;
  organization_id: string;
  plan_key: string;
  discord_role_id: string;
  created_at: string | null;
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

function formatPlanName(value: string | null | undefined, fallback: string) {
  if (value) return value;

  return fallback
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function saveRoleMapping(formData: FormData) {
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
  const planKey = String(formData.get("plan_key") || "").trim();
  const discordRoleId = String(formData.get("discord_role_id") || "").trim();

  if (!organizationId || !planKey || !discordRoleId) {
    throw new Error("Organization, plan, and Discord role ID are required.");
  }

  const { error } = await supabase.from("organization_discord_roles").upsert(
    {
      organization_id: organizationId,
      plan_key: planKey,
      discord_role_id: discordRoleId,
    },
    {
      onConflict: "organization_id,plan_key",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/admin/organizations/${organizationId}/role-mappings`);
}

async function deleteRoleMapping(formData: FormData) {
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
  const mappingId = String(formData.get("mapping_id") || "").trim();

  if (!organizationId || !mappingId) {
    throw new Error("Organization and mapping are required.");
  }

  const { error } = await supabase
    .from("organization_discord_roles")
    .delete()
    .eq("id", mappingId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/admin/organizations/${organizationId}/role-mappings`);
}

export default async function OrganizationRoleMappingsPage({
  params,
}: PageProps) {
  const supabase = createAdminSupabaseClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, discord_invite_url, discord_guild_id")
    .eq("id", params.id)
    .maybeSingle();

  if (organizationError || !organization) {
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

  const { data: plans } = await supabase
    .from("plans")
    .select("id, key, name")
    .order("key", { ascending: true });

  const { data: mappings, error: mappingsError } = await supabase
    .from("organization_discord_roles")
    .select("id, organization_id, plan_key, discord_role_id, created_at")
    .eq("organization_id", organization.id)
    .order("plan_key", { ascending: true });

  const safePlans: PlanRow[] = Array.isArray(plans) ? plans : [];
  const safeMappings: RoleMappingRow[] = Array.isArray(mappings)
    ? mappings
    : [];

  const mappingByPlanKey = new Map(
    safeMappings.map((mapping) => [mapping.plan_key, mapping])
  );

  const mappedCount = safeMappings.length;
  const unmappedCount = safePlans.filter(
    (plan) => !mappingByPlanKey.has(plan.key)
  ).length;

  const hasInviteUrl = Boolean(organization.discord_invite_url);
  const hasGuildId = Boolean(organization.discord_guild_id);

  const productionReady = hasInviteUrl && hasGuildId && unmappedCount === 0;

  const needsAttention =
    (hasInviteUrl || hasGuildId || mappedCount > 0) && !productionReady;

  const readinessStatus = productionReady
    ? "Production Ready"
    : needsAttention
    ? "Needs Attention"
    : "Not Configured";

  const readinessClass = productionReady
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    : needsAttention
    ? "border-orange-500/20 bg-orange-500/10 text-orange-200"
    : "border-red-500/20 bg-red-500/10 text-red-200";

  const readinessDescription = productionReady
    ? "Discord automation is fully configured. Customers can join Discord and receive roles based on active subscriptions."
    : needsAttention
    ? "Discord integration is partially configured. Complete the missing items below before production use."
    : "Discord integration is not configured yet. Add the invite URL, guild ID, and plan role mappings.";

  const readinessItems = [
    {
      label: "Discord Invite URL",
      ready: hasInviteUrl,
      actionHref: `/dashboard/admin/organizations/${organization.id}/discord`,
    },
    {
      label: "Discord Guild ID",
      ready: hasGuildId,
      actionHref: `/dashboard/admin/organizations/${organization.id}/discord`,
    },
    {
      label: "Plan Role Mappings",
      ready: unmappedCount === 0 && safePlans.length > 0,
      actionHref: `/dashboard/admin/organizations/${organization.id}/role-mappings`,
    },
  ];

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-100">
            Discord Role Mappings
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Map CASE Trades subscription plans to Discord role IDs for{" "}
            {organization.name}.
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
            href={`/dashboard/admin/organizations/${organization.id}/discord`}
            className="rounded-lg border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10"
          >
            Discord Settings
          </Link>

          <Link
            href="/dashboard/admin/organizations"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            All Organizations
          </Link>
        </div>
      </div>

      <section className={`rounded-xl border p-5 ${readinessClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">
              Discord Integration Status
            </p>

            <h2 className="mt-1 text-2xl font-bold">{readinessStatus}</h2>

            <p className="mt-2 max-w-3xl text-sm opacity-90">
              {readinessDescription}
            </p>
          </div>

          <Link
            href={`/dashboard/admin/organizations/${organization.id}/discord`}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Review Discord Settings
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {readinessItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-white/10 bg-slate-950/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.label}</p>

                <span
                  className={
                    "rounded-full px-2 py-1 text-xs font-medium " +
                    (item.ready
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-orange-500/20 text-orange-200")
                  }
                >
                  {item.ready ? "Ready" : "Missing"}
                </span>
              </div>

              {!item.ready && (
                <Link
                  href={item.actionHref}
                  className="mt-3 inline-flex text-sm font-medium underline underline-offset-4"
                >
                  Fix now
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Available Plans</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {safePlans.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Mapped Roles</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {mappedCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Unmapped Plans</p>
          <p className="mt-2 text-2xl font-bold text-orange-300">
            {unmappedCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Guild ID</p>
          <p
            className={
              "mt-2 truncate text-lg font-semibold " +
              (organization.discord_guild_id
                ? "text-emerald-300"
                : "text-slate-500")
            }
          >
            {organization.discord_guild_id || "Missing"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
        <h2 className="font-semibold text-slate-100">Add / Update Mapping</h2>

        <p className="mt-1 text-sm text-slate-400">
          Select a subscription plan and enter the Discord role ID that should
          be assigned when that plan is active.
        </p>

        <form
          action={saveRoleMapping}
          className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="organization_id" value={organization.id} />

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Plan</span>

            <select
              name="plan_key"
              required
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60"
            >
              <option value="">Select plan</option>

              {safePlans.map((plan) => (
                <option key={plan.id} value={plan.key}>
                  {formatPlanName(plan.name, plan.key)} ({plan.key})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">
              Discord Role ID
            </span>

            <input
              name="discord_role_id"
              required
              placeholder="1517291223000416306"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Save Mapping
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Existing Role Mappings
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            These mappings are used by the Discord role sync engine.
          </p>
        </div>

        {mappingsError ? (
          <div className="p-5 text-sm text-red-300">
            Failed to load role mappings: {mappingsError.message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Plan Key</th>
                  <th className="px-5 py-3">Discord Role ID</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {safeMappings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No role mappings configured yet.
                    </td>
                  </tr>
                ) : (
                  safeMappings.map((mapping) => {
                    const plan = safePlans.find(
                      (item) => item.key === mapping.plan_key
                    );

                    return (
                      <tr key={mapping.id} className="hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-100">
                            {formatPlanName(plan?.name, mapping.plan_key)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {mapping.plan_key}
                        </td>

                        <td className="px-5 py-4">
                          <code className="rounded bg-slate-950 px-2 py-1 text-xs text-sky-300">
                            {mapping.discord_role_id}
                          </code>
                        </td>

                        <td className="px-5 py-4">
                          <form
                            action={deleteRoleMapping}
                            className="flex justify-end"
                          >
                            <input
                              type="hidden"
                              name="organization_id"
                              value={organization.id}
                            />

                            <input
                              type="hidden"
                              name="mapping_id"
                              value={mapping.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}