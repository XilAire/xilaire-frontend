import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createOrganization(formData: FormData) {
  "use server";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const rawName = String(formData.get("name") || "").trim();
  const rawSlug = String(formData.get("slug") || "").trim();
  const rawOwnerEmail = String(formData.get("owner_email") || "").trim();
  const rawDiscordInviteUrl = String(
    formData.get("discord_invite_url") || ""
  ).trim();
  const rawDiscordGuildId = String(formData.get("discord_guild_id") || "").trim();

  const name = rawName;
  const slug = rawSlug ? slugify(rawSlug) : slugify(rawName);
  const ownerEmail = rawOwnerEmail.toLowerCase();
  const discordInviteUrl = rawDiscordInviteUrl || null;
  const discordGuildId = rawDiscordGuildId || null;

  if (!name) {
    throw new Error("Organization name is required.");
  }

  if (!slug) {
    throw new Error("Organization slug is required.");
  }

  const { data: existingOrganization } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingOrganization) {
    throw new Error("An organization with this slug already exists.");
  }

  const organizationPayload: Record<string, string | null> = {
    name,
    slug,
    discord_invite_url: discordInviteUrl,
  };

  if (discordGuildId) {
    organizationPayload.discord_guild_id = discordGuildId;
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert(organizationPayload)
    .select("id, name, slug")
    .single();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if (ownerEmail) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", ownerEmail)
      .maybeSingle();

    if (ownerProfile?.id) {
      const { data: ownerRole } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "organization_owner")
        .maybeSingle();

      const memberPayload: Record<string, string | null> = {
        organization_id: organization.id,
        user_id: ownerProfile.id,
      };

      if (ownerRole?.id) {
        memberPayload.role_id = ownerRole.id;
      }

      await supabase
        .from("organization_members")
        .upsert(memberPayload, {
          onConflict: "organization_id,user_id",
        });
    }
  }

  redirect(`/dashboard/admin/organizations/${organization.id}`);
}

export default function NewOrganizationPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Create Organization
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Add a new customer organization to CASE Trades. After creation, you
            can configure Discord, products, members, and billing access.
          </p>
        </div>

        <Link
          href="/dashboard/admin/organizations"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Back to Organizations
        </Link>
      </div>

      <form
        action={createOrganization}
        className="space-y-6 rounded-xl border border-white/10 bg-slate-900/80 p-6"
      >
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-100">
              Organization Details
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Basic tenant identity used across the platform.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Organization Name
              </span>
              <input
                name="name"
                required
                placeholder="CASE Trades"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Slug
              </span>
              <input
                name="slug"
                placeholder="case-trades"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
              />
              <p className="text-xs text-slate-500">
                Leave blank to auto-generate from the organization name.
              </p>
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-white/10 pt-6">
          <div>
            <h2 className="font-semibold text-slate-100">
              Organization Owner
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Optional. If the owner already has a profile, they will be linked
              as the organization owner.
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">
              Owner Email
            </span>
            <input
              name="owner_email"
              type="email"
              placeholder="owner@example.com"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />
            <p className="text-xs text-slate-500">
              If the user has not signed up yet, create the organization now and
              assign them later after signup.
            </p>
          </label>
        </section>

        <section className="space-y-4 border-t border-white/10 pt-6">
          <div>
            <h2 className="font-semibold text-slate-100">
              Discord Configuration
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Optional. These values power organization-specific Discord invite
              links and future role mapping.
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">
              Discord Invite URL
            </span>
            <input
              name="discord_invite_url"
              type="url"
              placeholder="https://discord.gg/example"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">
              Discord Guild ID
            </span>
            <input
              name="discord_guild_id"
              placeholder="924807386085089351"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />
            <p className="text-xs text-slate-500">
              Required later for automatic role assignment. Leave blank if not
              available yet.
            </p>
          </label>
        </section>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/admin/organizations"
            className="rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Create Organization
          </button>
        </div>
      </form>
    </main>
  );
}