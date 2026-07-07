import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Organizations | CASE Trades",
  description:
    "Manage organizations, teams, members, roles, permissions, and collaborative trading workspaces within the CASE Trades platform.",
};

import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Hash,
  LinkIcon,
  Package,
  Radio,
  Save,
  ShieldCheck,
} from "lucide-react";
import { getProfile } from "@/lib/getProfile";
import { getAccessibleOrganizations } from "@/lib/orgs/getAccessibleOrganizations";

export const dynamic = "force-dynamic";

type OrganizationsPageProps = {
  searchParams?: {
    saved?: string;
    error?: string;
  };
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  discord_invite_url: string | null;
  discord_guild_id: string | null;
};

type PlanRow = {
  id: string;
  organization_id: string | null;
  key: string;
  name: string | null;
  stripe_price_id: string | null;
  active: boolean | null;
};

type OrganizationProductRow = {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  description: string | null;
  feature_key: string;
  price_label: string | null;
  billing_interval: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  discord_role_id: string | null;
  active: boolean;
  sort_order: number;
};

type DiscordRoleRow = {
  id: string;
  organization_id: string | null;
  product_key: string | null;
  plan_key: string | null;
  discord_guild_id: string | null;
  discord_role_id: string | null;
  active: boolean | null;
};

type DiscordChannelRow = {
  id: string;
  organization_id: string;
  channel_type: string;
  channel_id: string;
  name: string | null;
  active: boolean;
};

type AccessibleOrganization = {
  id: string;
  name: string;
  slug: string;
  role?: string | null;
  role_name?: string | null;
  organization_role?: string | null;
  membership_role?: string | null;
  member_role?: string | null;
  access_role?: string | null;
  org_admin?: boolean | null;
  master_admin?: boolean | null;
  can_manage_organization?: boolean | null;
};

function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function isProfileMasterAdmin(profile: any) {
  const email = String(profile?.email ?? "").toLowerCase();

  const roleName =
    profile?.role?.name ??
    profile?.roles?.name ??
    profile?.roles?.[0]?.name ??
    profile?.role_name ??
    "";

  const roleRank =
    profile?.role?.rank ??
    profile?.roles?.rank ??
    profile?.roles?.[0]?.rank ??
    profile?.role_rank ??
    0;

  return Boolean(
    profile?.master_admin === true ||
      profile?.current_organization?.is_master_admin === true ||
      roleName === "master_admin" ||
      Number(roleRank) >= 4 ||
      email === "csthilaire@xilairetechnologies.com"
  );
}

function getOrganizationAccessRole(org: AccessibleOrganization) {
  return String(
    org.role ??
      org.role_name ??
      org.organization_role ??
      org.membership_role ??
      org.member_role ??
      org.access_role ??
      ""
  ).toLowerCase();
}

function canManageOrganization({
  profile,
  organization,
}: {
  profile: any;
  organization: AccessibleOrganization;
}) {
  if (isProfileMasterAdmin(profile)) {
    return true;
  }

  const orgRole = getOrganizationAccessRole(organization);

  return Boolean(
    organization.org_admin === true ||
      organization.master_admin === true ||
      organization.can_manage_organization === true ||
      orgRole === "master_admin" ||
      orgRole === "org_admin" ||
      orgRole === "organization_admin" ||
      orgRole === "admin" ||
      orgRole === "owner"
  );
}

function normalizeDiscordInviteUrl(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return null;
  }

  if (
    !rawValue.startsWith("https://discord.gg/") &&
    !rawValue.startsWith("https://discord.com/invite/")
  ) {
    return "INVALID";
  }

  return rawValue;
}

function normalizeText(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();
  return rawValue || null;
}

function normalizeBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true";
}

async function requireManageAccess(organizationId: string) {
  let profile;

  try {
    profile = await getProfile();
  } catch {
    redirect("/auth/signin");
  }

  const accessibleOrganizations =
    (await getAccessibleOrganizations(profile.id)) as AccessibleOrganization[];

  const selectedAccess = accessibleOrganizations.find(
    (organization) => organization.id === organizationId
  );

  if (!selectedAccess) {
    redirect("/dashboard/organizations?error=organization_denied");
  }

  const canManage = canManageOrganization({
    profile,
    organization: selectedAccess,
  });

  if (!canManage) {
    redirect("/dashboard/organizations?error=not_authorized");
  }

  return {
    profile,
    selectedAccess,
  };
}

async function updateOrganizationDiscordAction(formData: FormData) {
  "use server";

  const organizationId = String(formData.get("organization_id") ?? "");
  const discordInviteUrl = normalizeDiscordInviteUrl(
    formData.get("discord_invite_url")
  );
  const discordGuildId = normalizeText(formData.get("discord_guild_id"));

  if (!organizationId) {
    redirect("/dashboard/organizations?error=missing_organization");
  }

  if (discordInviteUrl === "INVALID") {
    redirect("/dashboard/organizations?error=invalid_discord_invite");
  }

  await requireManageAccess(organizationId);

  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      discord_invite_url: discordInviteUrl,
      discord_guild_id: discordGuildId,
    })
    .eq("id", organizationId);

  if (error) {
    console.error("Failed to update organization Discord settings", error);
    redirect("/dashboard/organizations?error=save_failed");
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard");

  redirect("/dashboard/organizations?saved=discord");
}

async function upsertOrganizationProductAction(formData: FormData) {
  "use server";

  const organizationId = String(formData.get("organization_id") ?? "");
  const productKey = String(formData.get("product_key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = normalizeText(formData.get("description"));
  const featureKey = String(formData.get("feature_key") ?? "").trim();
  const priceLabel = normalizeText(formData.get("price_label"));
  const billingInterval = normalizeText(formData.get("billing_interval"));
  const stripeProductId = normalizeText(formData.get("stripe_product_id"));
  const stripePriceId = normalizeText(formData.get("stripe_price_id"));
  const discordRoleId = normalizeText(formData.get("discord_role_id"));
  const active = normalizeBoolean(formData.get("active"));
  const sortOrderRaw = Number(formData.get("sort_order"));
  const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 100;

  if (!organizationId) {
    redirect("/dashboard/organizations?error=missing_organization");
  }

  if (!productKey || !name || !featureKey) {
    redirect("/dashboard/organizations?error=missing_product");
  }

  await requireManageAccess(organizationId);

  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("organization_products").upsert(
    {
      organization_id: organizationId,
      product_key: productKey,
      name,
      description,
      feature_key: featureKey,
      price_label: priceLabel,
      billing_interval: billingInterval,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
      discord_role_id: discordRoleId,
      active,
      sort_order: sortOrder,
    },
    {
      onConflict: "organization_id,product_key",
    }
  );

  if (error) {
    console.error("Failed to save organization product", error);
    redirect("/dashboard/organizations?error=product_save_failed");
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/billing");

  redirect("/dashboard/organizations?saved=product");
}

async function upsertDiscordChannelAction(formData: FormData) {
  "use server";

  const organizationId = String(formData.get("organization_id") ?? "");
  const channelType = String(formData.get("channel_type") ?? "").trim();
  const channelId = String(formData.get("channel_id") ?? "").trim();
  const name = normalizeText(formData.get("name"));

  if (!organizationId) {
    redirect("/dashboard/organizations?error=missing_organization");
  }

  if (!channelType || !channelId) {
    redirect("/dashboard/organizations?error=missing_channel");
  }

  await requireManageAccess(organizationId);

  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("discord_channels").upsert(
    {
      organization_id: organizationId,
      channel_type: channelType,
      channel_id: channelId,
      name,
      active: true,
    },
    {
      onConflict: "organization_id,channel_type,channel_id",
    }
  );

  if (error) {
    console.error("Failed to save Discord channel", error);
    redirect("/dashboard/organizations?error=channel_save_failed");
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard");

  redirect("/dashboard/organizations?saved=channel");
}

async function upsertDiscordRoleAction(formData: FormData) {
  "use server";

  const organizationId = String(formData.get("organization_id") ?? "");
  const productKey = String(formData.get("product_key") ?? "").trim();
  const planKey = String(formData.get("plan_key") ?? "").trim();
  const discordGuildId = String(formData.get("discord_guild_id") ?? "").trim();
  const discordRoleId = String(formData.get("discord_role_id") ?? "").trim();

  if (!organizationId) {
    redirect("/dashboard/organizations?error=missing_organization");
  }

  if (!productKey || !planKey || !discordGuildId || !discordRoleId) {
    redirect("/dashboard/organizations?error=missing_role_mapping");
  }

  await requireManageAccess(organizationId);

  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("organization_discord_roles").upsert(
    {
      organization_id: organizationId,
      product_key: productKey,
      plan_key: planKey,
      discord_guild_id: discordGuildId,
      discord_role_id: discordRoleId,
      active: true,
    },
    {
      onConflict: "organization_id,plan_key",
    }
  );

  if (error) {
    console.error("Failed to save Discord role mapping", error);
    redirect("/dashboard/organizations?error=role_save_failed");
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard");

  redirect("/dashboard/organizations?saved=role");
}

export default async function OrganizationsPage({
  searchParams,
}: OrganizationsPageProps) {
  let profile;

  try {
    profile = await getProfile();
  } catch {
    redirect("/auth/signin");
  }

  const accessibleOrganizations =
    (await getAccessibleOrganizations(profile.id)) as AccessibleOrganization[];

  if (accessibleOrganizations.length === 0) {
    redirect("/dashboard/billing?reason=subscribe");
  }

  const manageableOrganizations = accessibleOrganizations.filter(
    (organization) =>
      canManageOrganization({
        profile,
        organization,
      })
  );

  if (manageableOrganizations.length === 0) {
    redirect("/dashboard?error=not_authorized");
  }

  const supabase = createServiceSupabaseClient();

  const manageableOrganizationIds = manageableOrganizations.map(
    (organization) => organization.id
  );

  const { data: organizationsData, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name, slug, discord_invite_url, discord_guild_id")
    .in("id", manageableOrganizationIds)
    .eq("active", true)
    .order("name", { ascending: true });

  if (organizationsError) {
    console.error("Failed to load organizations", organizationsError);
    throw new Error("Failed to load organizations");
  }

  const { data: plansData } = await supabase
    .from("plans")
    .select("id, organization_id, key, name, stripe_price_id, active")
    .in("organization_id", manageableOrganizationIds)
    .order("key", { ascending: true });

  const { data: productsData } = await supabase
    .from("organization_products")
    .select(
      `
      id,
      organization_id,
      product_key,
      name,
      description,
      feature_key,
      price_label,
      billing_interval,
      stripe_product_id,
      stripe_price_id,
      discord_role_id,
      active,
      sort_order
    `
    )
    .in("organization_id", manageableOrganizationIds)
    .order("sort_order", { ascending: true });

  const { data: discordRolesData } = await supabase
    .from("organization_discord_roles")
    .select(
      "id, organization_id, product_key, plan_key, discord_guild_id, discord_role_id, active"
    )
    .in("organization_id", manageableOrganizationIds)
    .order("plan_key", { ascending: true });

  const { data: discordChannelsData } = await supabase
    .from("discord_channels")
    .select("id, organization_id, channel_type, channel_id, name, active")
    .in("organization_id", manageableOrganizationIds)
    .order("channel_type", { ascending: true });

  const organizations = (organizationsData ?? []) as OrganizationRow[];
  const plans = (plansData ?? []) as PlanRow[];
  const products = (productsData ?? []) as OrganizationProductRow[];
  const discordRoles = (discordRolesData ?? []) as DiscordRoleRow[];
  const discordChannels = (discordChannelsData ?? []) as DiscordChannelRow[];

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-emerald-400">
          <Building2 className="h-4 w-4" />
          <span>Organization Settings</span>
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">
          Organizations
        </h1>

        <p className="text-sm text-slate-400">
          Manage organization-level settings, products offered, Discord invite
          links, Discord guild IDs, Discord channels, and product role mappings.
        </p>
      </div>

      {searchParams?.saved === "discord" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Discord settings saved"
          body="The organization Discord invite and guild settings were updated successfully."
          tone="emerald"
        />
      )}

      {searchParams?.saved === "product" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Product saved"
          body="The organization product offering was saved successfully."
          tone="emerald"
        />
      )}

      {searchParams?.saved === "channel" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Discord channel saved"
          body="The Discord channel mapping was saved successfully."
          tone="emerald"
        />
      )}

      {searchParams?.saved === "role" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Discord role saved"
          body="The Discord role mapping was saved successfully."
          tone="emerald"
        />
      )}

      {searchParams?.error && (
        <Notice
          icon={<ShieldCheck />}
          title="Organization update failed"
          body={getErrorMessage(searchParams.error)}
          tone="red"
        />
      )}

      {organizations.length === 0 && (
        <Notice
          icon={<ShieldCheck />}
          title="No manageable organizations found"
          body="Your account has organization access, but no active organization records were returned. Confirm the organization is active and that your account has admin access."
          tone="red"
        />
      )}

      <div className="grid gap-5">
        {organizations.map((organization) => {
          const accessRecord = manageableOrganizations.find(
            (item) => item.id === organization.id
          );

          const organizationPlans = plans.filter(
            (plan) => plan.organization_id === organization.id
          );

          const organizationProducts = products.filter(
            (product) => product.organization_id === organization.id
          );

          const organizationRoles = discordRoles.filter(
            (role) => role.organization_id === organization.id
          );

          const organizationChannels = discordChannels.filter(
            (channel) => channel.organization_id === organization.id
          );

          const discordConnected = Boolean(
            organization.discord_guild_id ||
              organization.discord_invite_url ||
              organizationRoles.length > 0 ||
              organizationChannels.length > 0
          );

          return (
            <section
              key={organization.id}
              className="rounded-2xl border border-white/10 bg-slate-900/80 p-6"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-100">
                      {organization.name}
                    </h2>

                    <span
                      className={
                        discordConnected
                          ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                          : "rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300"
                      }
                    >
                      {discordConnected
                        ? "Discord Connected"
                        : "Discord Not Connected"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-400">
                    Slug:{" "}
                    <span className="font-mono text-slate-300">
                      {organization.slug}
                    </span>
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Role:{" "}
                    {accessRecord
                      ? getOrganizationAccessRole(accessRecord) || "member"
                      : "member"}
                  </p>

                  {organization.discord_guild_id && (
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      Guild ID: {organization.discord_guild_id}
                    </p>
                  )}
                </div>

                {organization.discord_invite_url && (
                  <a
                    href={organization.discord_invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/10"
                  >
                    Open Discord Invite
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              <form
                action={updateOrganizationDiscordAction}
                className="mt-6 space-y-4"
              >
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`discord_invite_url_${organization.id}`}
                      className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                    >
                      <LinkIcon className="h-4 w-4 text-emerald-400" />
                      Discord Invite URL
                    </label>

                    <input
                      id={`discord_invite_url_${organization.id}`}
                      name="discord_invite_url"
                      type="url"
                      defaultValue={organization.discord_invite_url ?? ""}
                      placeholder="https://discord.gg/your-invite-code"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`discord_guild_id_${organization.id}`}
                      className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                    >
                      <Hash className="h-4 w-4 text-emerald-400" />
                      Discord Guild ID
                    </label>

                    <input
                      id={`discord_guild_id_${organization.id}`}
                      name="discord_guild_id"
                      defaultValue={organization.discord_guild_id ?? ""}
                      placeholder="1512345678901234567"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  The sidebar should use the Discord Guild ID as the strongest
                  connected signal. The invite URL is only the join link shown to
                  subscribers.
                </p>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    <Save className="h-4 w-4" />
                    Save Discord Settings
                  </button>
                </div>
              </form>

              <div className="mt-8 rounded-xl border border-white/10 bg-slate-950/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold text-slate-100">
                    Products Offered
                  </h3>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-2">
                  {organizationProducts.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No organization products configured.
                    </p>
                  ) : (
                    organizationProducts.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-200">
                            {product.name}
                          </span>
                          <span
                            className={
                              product.active
                                ? "text-xs text-emerald-300"
                                : "text-xs text-red-300"
                            }
                          >
                            {product.active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {product.product_key}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Feature: {product.feature_key}
                        </p>

                        {product.price_label && (
                          <p className="mt-1 text-xs text-emerald-300">
                            {product.price_label}
                            {product.billing_interval
                              ? ` / ${product.billing_interval}`
                              : ""}
                          </p>
                        )}

                        {product.description && (
                          <p className="mt-2 text-xs text-slate-400">
                            {product.description}
                          </p>
                        )}

                        {product.stripe_product_id && (
                          <p className="mt-2 break-all font-mono text-[11px] text-slate-500">
                            Stripe Product: {product.stripe_product_id}
                          </p>
                        )}

                        {product.stripe_price_id && (
                          <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                            Stripe Price: {product.stripe_price_id}
                          </p>
                        )}

                        {product.discord_role_id && (
                          <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                            Discord Role: {product.discord_role_id}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form
                  action={upsertOrganizationProductAction}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="organization_id"
                    value={organization.id}
                  />

                  <Input
                    name="product_key"
                    label="Product Key"
                    placeholder="case_signals_monthly"
                  />

                  <Input
                    name="name"
                    label="Product Name"
                    placeholder="CASE Signals Monthly"
                  />

                  <Select
                    name="feature_key"
                    label="Feature"
                    options={[
                      ["signals", "Signals"],
                      ["journal", "Journal"],
                      ["journal_pro", "Journal Pro"],
                      ["journal_elite", "Journal Elite"],
                      ["signals_and_journal", "Signals + Journal"],
                    ]}
                  />

                  <Input
                    name="price_label"
                    label="Price Label"
                    placeholder="$99.99"
                  />

                  <Select
                    name="billing_interval"
                    label="Billing Interval"
                    options={[
                      ["week", "Weekly"],
                      ["month", "Monthly"],
                      ["year", "Yearly"],
                      ["one_time", "One Time"],
                    ]}
                  />

                  <Input
                    name="sort_order"
                    label="Sort Order"
                    placeholder="100"
                  />

                  <Input
                    name="stripe_product_id"
                    label="Stripe Product ID"
                    placeholder="prod_..."
                  />

                  <Input
                    name="stripe_price_id"
                    label="Stripe Price ID"
                    placeholder="price_..."
                  />

                  <Input
                    name="discord_role_id"
                    label="Discord Role ID"
                    placeholder="1517291223000416306"
                  />

                  <Select
                    name="active"
                    label="Status"
                    options={[
                      ["true", "Active"],
                      ["false", "Inactive"],
                    ]}
                  />

                  <div className="md:col-span-2">
                    <TextArea
                      name="description"
                      label="Description"
                      placeholder="Premium signals, alerts, and trade ideas."
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 md:col-span-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Product
                  </button>
                </form>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold text-slate-100">
                      Discord Channels
                    </h3>
                  </div>

                  <div className="mb-5 space-y-2">
                    {organizationChannels.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No Discord channels configured.
                      </p>
                    ) : (
                      organizationChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-200">
                              {channel.channel_type}
                            </span>
                            <span
                              className={
                                channel.active
                                  ? "text-xs text-emerald-300"
                                  : "text-xs text-red-300"
                              }
                            >
                              {channel.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            {channel.channel_id}
                          </p>
                          {channel.name && (
                            <p className="mt-1 text-xs text-slate-400">
                              {channel.name}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <form action={upsertDiscordChannelAction} className="space-y-3">
                    <input
                      type="hidden"
                      name="organization_id"
                      value={organization.id}
                    />

                    <Select
                      name="channel_type"
                      label="Channel Type"
                      options={[
                        ["signals", "Signals"],
                        ["options", "Options"],
                        ["stocks", "Stocks"],
                        ["small_caps", "Small Caps"],
                      ]}
                    />

                    <Input
                      name="channel_id"
                      label="Channel ID"
                      placeholder="1512345678901234567"
                    />

                    <Input
                      name="name"
                      label="Display Name"
                      placeholder="CASE Signals"
                    />

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      <Save className="h-4 w-4" />
                      Save Channel
                    </button>
                  </form>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold text-slate-100">
                      Discord Role Mappings
                    </h3>
                  </div>

                  <div className="mb-5 space-y-2">
                    {organizationRoles.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No Discord role mappings configured.
                      </p>
                    ) : (
                      organizationRoles.map((role) => (
                        <div
                          key={role.id}
                          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-200">
                              {role.plan_key ?? "Unknown Plan"}
                            </span>
                            <span
                              className={
                                role.active
                                  ? "text-xs text-emerald-300"
                                  : "text-xs text-red-300"
                              }
                            >
                              {role.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            Guild: {role.discord_guild_id ?? "—"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            Role: {role.discord_role_id ?? "—"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <form action={upsertDiscordRoleAction} className="space-y-3">
                    <input
                      type="hidden"
                      name="organization_id"
                      value={organization.id}
                    />

                    <Select
                      name="plan_key"
                      label="Plan"
                      options={organizationPlans.map((plan) => [
                        plan.key,
                        plan.name ?? plan.key,
                      ])}
                    />

                    <Input
                      name="product_key"
                      label="Product Key"
                      placeholder="case_signals_monthly"
                    />

                    <Input
                      name="discord_guild_id"
                      label="Discord Guild ID"
                      placeholder={
                        organization.discord_guild_id ??
                        "1512345678901234567"
                      }
                    />

                    <Input
                      name="discord_role_id"
                      label="Discord Role ID"
                      placeholder="1517291223000416306"
                    />

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      <Save className="h-4 w-4" />
                      Save Role Mapping
                    </button>
                  </form>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Input({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        name={name}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500/50"
      />
    </div>
  );
}

function TextArea({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500/50"
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[][];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <select
        name={name}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
      >
        {options.length === 0 ? (
          <option value="">No options available</option>
        ) : (
          options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function Notice({
  icon,
  title,
  body,
  tone,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone: "emerald" | "red";
}) {
  const classes =
    tone === "red"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

  return (
    <div className={`rounded-xl border p-5 ${classes}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>

        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-300">{body}</p>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: string) {
  switch (error) {
    case "missing_organization":
      return "The organization was missing from the request.";

    case "invalid_discord_invite":
      return "The Discord invite must start with https://discord.gg/ or https://discord.com/invite/.";

    case "organization_denied":
      return "You do not have access to this organization.";

    case "not_authorized":
      return "You do not have permission to manage this organization.";

    case "save_failed":
      return "The Discord settings could not be saved. Please try again.";

    case "missing_product":
      return "Product key, product name, and feature key are required.";

    case "product_save_failed":
      return "The organization product could not be saved.";

    case "missing_channel":
      return "The channel type and channel ID are required.";

    case "channel_save_failed":
      return "The Discord channel mapping could not be saved.";

    case "missing_role_mapping":
      return "The product key, plan key, guild ID, and role ID are required.";

    case "role_save_failed":
      return "The Discord role mapping could not be saved.";

    default:
      return "An unknown error occurred.";
  }
}