import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  Sparkles,
  Zap,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserEntitlements,
  type CaseEntitlements,
} from "@/lib/auth/getUserEntitlements";
import { getProfile } from "@/lib/getProfile";
import LoadingActionLink from "@/components/ui/LoadingActionLink";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams?: {
    org?: string;
    product?: string;
    reason?: string;
    redirect?: string;
    checkout?: string;
    plan?: string;
    discord?: string;
    sync?: string;
  };
};

type SubscriptionPlan = {
  id?: string;
  key: string;
  name: string | null;
  price_display?: string | null;
};

type SubscriptionOrganizationProduct = {
  id: string;
  product_key: string;
  name: string;
  price_label: string | null;
  billing_interval: string | null;
  feature_key: string | null;
};

type SubscriptionRow = {
  id: string;
  organization_id: string | null;
  organization_product_id: string | null;
  feature_key: string | null;
  discord_role_id: string | null;
  stripe_product_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  plan: SubscriptionPlan | SubscriptionPlan[] | null;
  organization_product:
    | SubscriptionOrganizationProduct
    | SubscriptionOrganizationProduct[]
    | null;
};

type BillingDirectSubscriptionRow = Omit<
  SubscriptionRow,
  | "organization_product_id"
  | "feature_key"
  | "discord_role_id"
  | "stripe_product_id"
  | "organization_product"
>;

type SidebarSubscriptionRow = {
  id: string;
  organization_id: string | null;
  status: string | null;
  current_period_end: string | null;
  plans?: SubscriptionPlan | SubscriptionPlan[] | null;
};

type OrganizationDiscordConfig = {
  id: string;
  name: string;
  slug: string;
  discord_invite_url: string | null;
};

type OrganizationMembershipRow = {
  organization_id: string | null;
  organization:
    | {
        id: string;
        name: string;
        slug: string;
        discord_invite_url: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        discord_invite_url: string | null;
      }[]
    | null;
};

type PlanDefinition = {
  key: string;
  name: string;
  price: string;
  interval: string;
  description: string;
  featured?: boolean;
  features: string[];
};

type DynamicProductPlan = {
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
  sort_order: number | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

const SIGNAL_PLANS: PlanDefinition[] = [
  {
    key: "signals_weekly",
    name: "CASE Signals Weekly",
    price: "$29.99",
    interval: "week",
    description: "Premium options signals with weekly access.",
    features: [
      "Premium options signals",
      "Discord signal access",
      "Entry, target, and stop guidance",
      "Signal dashboard access",
    ],
  },
  {
    key: "signals_monthly",
    name: "CASE Signals Monthly",
    price: "$99.99",
    interval: "month",
    description: "Best value for active signal members.",
    featured: true,
    features: [
      "Premium options signals",
      "Discord signal access",
      "Signal history",
      "Performance tracking",
      "Monthly access discount",
    ],
  },
];

const JOURNAL_PLANS: PlanDefinition[] = [
  {
    key: "journal_starter",
    name: "CASE Journal Starter",
    price: "$19.99",
    interval: "month",
    description: "Stock trade journaling for beginners.",
    features: [
      "Stock journaling",
      "Trade notes",
      "Basic P/L tracking",
      "Basic reports",
    ],
  },
  {
    key: "journal_pro",
    name: "CASE Journal Pro",
    price: "$49.99",
    interval: "month",
    description: "Stocks and options journaling with advanced analytics.",
    featured: true,
    features: [
      "Stock journaling",
      "Options journaling",
      "Advanced analytics",
      "Reports dashboard",
      "Expectancy tracking",
    ],
  },
  {
    key: "journal_elite",
    name: "CASE Journal Elite",
    price: "$99.99",
    interval: "month",
    description: "Elite journaling with future AI trade review features.",
    features: [
      "Everything in Pro",
      "AI trade reviews",
      "Trade grading",
      "Playbooks",
      "Exports",
    ],
  },
];

function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function createDefaultEntitlements(): CaseEntitlements {
  return {
    signals: {
      active: false,
      discord: false,
      options_signals: false,
    },
    journal: {
      active: false,
      stocks: false,
      options: false,
      ai_review: false,
      trade_grading: false,
      playbooks: false,
      exports: false,
      analytics: "none",
      tier: null,
    },
    discord: {
      connected: false,
      active: false,
      username: null,
      user_id: null,
      role_ids: [],
    },
    subscription: {
      active: false,
      status: null,
      plan_id: null,
      plan_key: null,
      plan_name: null,
      organization_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
    },
    organization: {
      id: null,
      active: false,
      member: false,
      role: null,
    },
    admin: {
      active: false,
      role_name: null,
      rank: null,
    },
  };
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const authSupabase = await createSupabaseServerClient();
  const serviceSupabase = createServiceSupabaseClient();

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select(
      `
      id,
      email,
      role_id,
      roles:roles!profiles_role_id_fkey (
        name,
        rank
      )
      `,
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Billing profile lookup failed", {
      profileError,
      userId: user.id,
    });

    throw new Error(
      `Billing profile lookup failed: ${
        profileError?.message ?? "Profile not found"
      }`,
    );
  }

  let sidebarProfile: any = {
    current_organization: null,
    subscriptions: [],
    role: null,
  };

  try {
    sidebarProfile = await getProfile({
      organizationSlug: searchParams?.org,
    });
  } catch (sidebarProfileError) {
    console.error("Failed to load billing sidebar profile context", {
      user_id: user.id,
      email: user.email,
      sidebarProfileError,
    });
  }

  const sidebarOrganization =
    (sidebarProfile as any)?.current_organization ?? null;

  const sidebarHasActiveSubscription =
    sidebarOrganization?.has_active_subscription === true;

  const sidebarHasDiscordAccess =
    sidebarOrganization?.has_discord_access === true;

  const sidebarHasSignalsAccess =
    sidebarHasActiveSubscription && sidebarHasDiscordAccess;

  const billingRole = Array.isArray((profile as any)?.roles)
    ? (profile as any).roles[0]
    : (profile as any)?.roles;

  const isAdminUser =
    ["master_admin", "admin", "owner", "super_admin", "staff"].includes(
      String(billingRole?.name ?? "").toLowerCase(),
    ) || Number(billingRole?.rank ?? 0) >= 4;

  const selectedOrganizationSlug = searchParams?.org ?? null;

  let selectedOrganization: OrganizationDiscordConfig | null = null;

  if (selectedOrganizationSlug) {
    const { data: selectedOrganizationData, error: selectedOrganizationError } =
      await serviceSupabase
        .from("organizations")
        .select("id, name, slug, discord_invite_url")
        .eq("slug", selectedOrganizationSlug)
        .eq("active", true)
        .maybeSingle();

    if (selectedOrganizationError) {
      console.error("Failed to resolve billing organization from slug", {
        organization_slug: selectedOrganizationSlug,
        error: selectedOrganizationError,
      });
    }

    selectedOrganization =
      (selectedOrganizationData as OrganizationDiscordConfig | null) ?? null;
  }

  const { data: discordAccount } = await serviceSupabase
    .from("discord_accounts")
    .select("discord_user_id, discord_username")
    .eq("user_id", profile.id)
    .maybeSingle();

  let entitlements: CaseEntitlements = createDefaultEntitlements();

  try {
    entitlements = await getUserEntitlements(user.id);
  } catch (entitlementsError) {
    console.error("Failed to load billing entitlements", {
      user_id: user.id,
      email: user.email,
      entitlementsError,
    });
  }

  const { data: subscriptionData, error: subscriptionError } =
    await serviceSupabase
      .from("subscriptions")
      .select(
        `
        id,
        organization_id,
        status,
        current_period_end,
        cancel_at_period_end,
        plan:plans (
          id,
          key,
          name,
          price_display
        )
      `,
      )
      .eq("user_id", profile.id)
      .not("status", "eq", "canceled")
      .not("status", "eq", "incomplete_expired")
      .order("updated_at", { ascending: false });

  if (subscriptionError) {
    console.error("Failed to load billing subscriptions", subscriptionError);
  }

  const directSubscriptions = (
    (subscriptionData ?? []) as BillingDirectSubscriptionRow[]
  ).map((subscription: BillingDirectSubscriptionRow) => ({
    ...subscription,
    organization_product_id: null,
    feature_key: null,
    discord_role_id: null,
    stripe_product_id: null,
    organization_product: null,
  }));

  const profileSubscriptions = (
    (sidebarProfile.subscriptions ?? []) as SidebarSubscriptionRow[]
  ).map(
    (subscription: SidebarSubscriptionRow) =>
      ({
        id: subscription.id,
        organization_id: subscription.organization_id,
        organization_product_id: null,
        feature_key: null,
        discord_role_id: null,
        stripe_product_id: null,
        status: subscription.status ?? "active",
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: false,
        plan: normalizeSingle(subscription.plans),
        organization_product: null,
      }) satisfies SubscriptionRow,
  );

  const subscriptions = mergeSubscriptions(
    directSubscriptions,
    profileSubscriptions,
  );

  const { data: membershipData, error: membershipError } = await serviceSupabase
    .from("organization_members")
    .select(
      `
      organization_id,
      organization:organizations (
        id,
        name,
        slug,
        discord_invite_url
      )
    `,
    )
    .eq("user_id", profile.id)
    .eq("active", true);

  if (membershipError) {
    console.error(
      "Failed to load billing organization memberships",
      membershipError,
    );
  }

  const membershipOrganizations = (
    (membershipData ?? []) as OrganizationMembershipRow[]
  )
    .map((membership) => normalizeSingle(membership.organization))
    .filter(
      (
        organization,
      ): organization is {
        id: string;
        name: string;
        slug: string;
        discord_invite_url: string | null;
      } => Boolean(organization?.id),
    );

  const activeOrganizationIds = Array.from(
    new Set(
      subscriptions
        .filter((subscription) => isSubscriptionActive(subscription))
        .map((subscription) => subscription.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const memberOrganizationIds = membershipOrganizations.map(
    (organization) => organization.id,
  );

  const sidebarOrganizationId =
    typeof sidebarOrganization?.id === "string" ? sidebarOrganization.id : null;

  const inferredBillingOrganizationIds = Array.from(
    new Set(
      [
        ...memberOrganizationIds,
        ...activeOrganizationIds,
        sidebarOrganizationId,
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const billingOrganizationIds = selectedOrganization?.id
    ? [selectedOrganization.id]
    : inferredBillingOrganizationIds;

  let organizationDiscordConfigs: OrganizationDiscordConfig[] = [];

  if (billingOrganizationIds.length > 0) {
    const { data: organizationsData, error: organizationsError } =
      await serviceSupabase
        .from("organizations")
        .select("id, name, slug, discord_invite_url")
        .in("id", billingOrganizationIds)
        .eq("active", true);

    if (organizationsError) {
      console.error("Failed to load Discord invite config", organizationsError);
    }

    organizationDiscordConfigs = (organizationsData ??
      []) as OrganizationDiscordConfig[];
  }

  const primaryDiscordConfig =
    selectedOrganization ??
    organizationDiscordConfigs.find((org) => Boolean(org.discord_invite_url)) ??
    organizationDiscordConfigs[0] ??
    null;

  const discordInviteUrl = primaryDiscordConfig?.discord_invite_url ?? null;
  const discordOrganizationName =
    primaryDiscordConfig?.name ?? "your subscribed Discord community";

  let dynamicProducts: DynamicProductPlan[] = [];

  if (billingOrganizationIds.length > 0) {
    const { data: dynamicProductsData, error: dynamicProductsError } =
      await serviceSupabase
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
          sort_order,
          organization:organizations (
            id,
            name,
            slug
          )
        `,
        )
        .in("organization_id", billingOrganizationIds)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (dynamicProductsError) {
      console.error(
        "Failed to load organization products",
        dynamicProductsError,
      );
    }

    dynamicProducts = ((dynamicProductsData ?? []) as any[]).map((product) => ({
      ...product,
      organization: normalizeSingle(product.organization),
    })) as DynamicProductPlan[];
  }

  const dynamicSignalProducts = dynamicProducts.filter((product) =>
    isSignalsProduct(product),
  );

  const dynamicJournalProducts = dynamicProducts.filter((product) =>
    isJournalProduct(product),
  );

  const dynamicOtherProducts = dynamicProducts.filter(
    (product) => !isSignalsProduct(product) && !isJournalProduct(product),
  );

  const productPrompt = searchParams?.product;
  const reason = searchParams?.reason;
  const checkout = searchParams?.checkout;
  const checkoutPlan = searchParams?.plan;
  const discordStatus = searchParams?.discord;
  const syncStatus = searchParams?.sync;
  const discordConnected = Boolean(discordAccount?.discord_user_id);

  const selectedPlanKey = checkoutPlan ?? "";

  const selectedStaticPlan =
    [...SIGNAL_PLANS, ...JOURNAL_PLANS].find(
      (plan) => plan.key === selectedPlanKey,
    ) ?? null;

  const selectedDynamicPlan =
    dynamicProducts.find(
      (product) =>
        product.product_key === selectedPlanKey ||
        product.id === selectedPlanKey,
    ) ?? null;

  const selectedPlanName =
    selectedDynamicPlan?.name ?? selectedStaticPlan?.name;

  const selectedProduct = selectedDynamicPlan
    ? isSignalsProduct(selectedDynamicPlan)
      ? "signals"
      : isJournalProduct(selectedDynamicPlan)
        ? "journal"
        : selectedDynamicPlan.feature_key
    : SIGNAL_PLANS.some((plan) => plan.key === selectedPlanKey)
      ? "signals"
      : JOURNAL_PLANS.some((plan) => plan.key === selectedPlanKey)
        ? "journal"
        : null;

  const selectedPlanAlreadyActive = subscriptions.some((subscription) => {
    const plan = normalizeSingle(subscription.plan);
    const organizationProduct = normalizeSingle(
      subscription.organization_product,
    );

    const subscriptionMatchesSelectedPlan =
      plan?.key === selectedPlanKey ||
      organizationProduct?.product_key === selectedPlanKey ||
      organizationProduct?.id === selectedPlanKey ||
      subscription.organization_product_id === selectedPlanKey;

    return (
      subscriptionMatchesSelectedPlan && isSubscriptionActive(subscription)
    );
  });

  const activePlanKeys = getActivePlanKeys(subscriptions);
  const activeProductIds = getActiveProductIds(subscriptions);

  const stripeHasActiveSubscription = subscriptions.some((subscription) =>
    isSubscriptionActive(subscription),
  );

  const hasActiveSubscription =
    stripeHasActiveSubscription || sidebarHasActiveSubscription;

  const hasRoleEntitlementAccess =
    isAdminUser && (entitlements.signals.active || entitlements.journal.active);

  const hasProductEntitlementAccess =
    entitlements.signals.active || entitlements.journal.active;

  const hasEntitlementAccess =
    hasProductEntitlementAccess || sidebarHasActiveSubscription;

  const hasSignalsSubscription = subscriptions.some(
    (subscription) =>
      isSubscriptionActive(subscription) &&
      subscriptionMatchesFeature(subscription, "signals"),
  );

  const hasJournalSubscription = subscriptions.some(
    (subscription) =>
      isSubscriptionActive(subscription) &&
      subscriptionMatchesFeature(subscription, "journal"),
  );

  const signalsAccessActive =
    entitlements.signals.active ||
    sidebarHasSignalsAccess ||
    hasSignalsSubscription;

  const journalAccessActive =
    entitlements.journal.active || hasJournalSubscription;

  const canSyncRoles =
    discordConnected &&
    (hasActiveSubscription || hasEntitlementAccess || sidebarHasDiscordAccess);

  const checkoutSuffix = `&email=${encodeURIComponent(profile.email ?? "")}`;

  const portalReturnTo = encodeURIComponent("/dashboard/billing");

  const portalSuffix = `?email=${encodeURIComponent(
    profile.email ?? "",
  )}&return_to=${portalReturnTo}`;

  const hasDynamicSignalProducts = dynamicSignalProducts.length > 0;
  const hasDynamicJournalProducts = dynamicJournalProducts.length > 0;
  const hasDynamicOtherProducts = dynamicOtherProducts.length > 0;
  const hasDynamicProducts = dynamicProducts.length > 0;

  const shouldAutoContinueCheckout =
    reason === "complete_subscription" &&
    Boolean(selectedPlanKey) &&
    Boolean(selectedPlanName) &&
    !selectedPlanAlreadyActive;

  const autoCheckoutHref =
    shouldAutoContinueCheckout && selectedDynamicPlan
      ? `/api/stripe/checkout?organization_product_id=${
          selectedDynamicPlan.id
        }&plan=${encodeURIComponent(
          selectedDynamicPlan.product_key,
        )}&product=${encodeURIComponent(
          String(selectedProduct ?? selectedDynamicPlan.feature_key ?? "other"),
        )}${checkoutSuffix}`
      : shouldAutoContinueCheckout && selectedProduct
        ? `/api/stripe/checkout?plan=${encodeURIComponent(
            selectedPlanKey,
          )}&product=${encodeURIComponent(selectedProduct)}${checkoutSuffix}`
        : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Billing & Subscriptions
        </h1>
        <p className="text-sm text-slate-400">
          Manage your subscriptions, Stripe billing, Discord access, and active
          product entitlements.
        </p>
      </div>

      {checkout === "success" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Checkout Successful"
          body={`Your subscription was processed${
            selectedPlanName ? ` for ${selectedPlanName}` : ""
          }.`}
          tone="emerald"
        />
      )}

      {checkout === "already_active" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Subscription Already Active"
          body="Your account already has an active subscription. Use Manage Subscription to make billing changes."
          tone="emerald"
        />
      )}

      {checkout === "cancelled" && (
        <Notice
          icon={<CreditCard />}
          title="Checkout Cancelled"
          body="Checkout was cancelled. You can choose a product below whenever you are ready."
          tone="orange"
        />
      )}

      {reason === "complete_subscription" &&
        selectedPlanName &&
        !selectedPlanAlreadyActive &&
        autoCheckoutHref && (
          <AutoContinueCheckoutNotice
            checkoutHref={autoCheckoutHref}
            planName={selectedPlanName}
          />
        )}

      {reason === "complete_subscription" &&
        selectedPlanName &&
        !selectedPlanAlreadyActive &&
        !autoCheckoutHref && (
          <Notice
            icon={<CreditCard />}
            title="Complete Your Subscription"
            body={`Finish checkout for ${selectedPlanName} to unlock your CASE Trades access.`}
            tone="emerald"
          />
        )}

      {reason === "complete_subscription" &&
        selectedPlanName &&
        selectedPlanAlreadyActive && (
          <Notice
            icon={<CheckCircle2 />}
            title="Subscription Active"
            body={`${selectedPlanName} is already active on your account.`}
            tone="emerald"
          />
        )}

      {syncStatus === "success" && (
        <Notice
          icon={<CheckCircle2 />}
          title="Subscription Synced"
          body="Your Stripe subscription status has been refreshed."
          tone="emerald"
        />
      )}

      {syncStatus === "success_discord_failed" && (
        <Notice
          icon={<Sparkles />}
          title="Subscription Synced"
          body="Your Stripe subscription was refreshed, but Discord role sync failed. Try Sync Roles after confirming you joined the correct Discord server."
          tone="orange"
        />
      )}

      {syncStatus === "no_customer" && (
        <Notice
          icon={<CreditCard />}
          title="No Stripe Customer Found"
          body="No Stripe customer was found for this account yet. Subscribe to a product to create one."
          tone="orange"
        />
      )}

      {syncStatus === "customer_deleted" && (
        <Notice
          icon={<CreditCard />}
          title="Stripe Customer Deleted"
          body="The stored Stripe customer no longer exists. Subscribe again or contact support if this was unexpected."
          tone="orange"
        />
      )}

      {discordStatus === "connected" && (
        <Notice
          icon={<Sparkles />}
          title="Discord Connected"
          body="Your Discord account has been linked successfully and your roles have been synchronized."
          tone="indigo"
        />
      )}

      {discordStatus === "connected_sync_failed" && (
        <Notice
          icon={<Sparkles />}
          title="Discord Connected"
          body="Your Discord account was linked, but role sync failed. Use Sync Roles after confirming you joined the correct Discord server."
          tone="indigo"
        />
      )}

      {discordStatus === "missing_code" && (
        <Notice
          icon={<Sparkles />}
          title="Discord Connection Not Completed"
          body="Discord did not return an authorization code. Click Connect Discord again and complete the authorization screen."
          tone="indigo"
        />
      )}

      {reason === "subscribe" && productPrompt && (
        <Notice
          icon={<Sparkles />}
          title="Subscription Required"
          body={`Subscribe to ${
            productPrompt === "signals" ? "CASE Signals" : "CASE Journal"
          } to unlock that feature.`}
          tone="emerald"
        />
      )}

      {isAdminUser && !hasDynamicProducts && (
        <Notice
          icon={<CreditCard />}
          title="No Organization Products Found"
          body="No active organization products were found for your account. The fallback demo plans are shown below, but production checkout should use organization_products."
          tone="orange"
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <CurrentAccessCard
          title="Signals Access"
          active={signalsAccessActive}
          icon={<BellRing />}
          activeText="Premium signals enabled"
          inactiveText="No active signals subscription"
        />

        <CurrentAccessCard
          title="Journal Access"
          active={journalAccessActive}
          icon={<BookOpen />}
          activeText={`Journal active: ${
            entitlements.journal.tier ??
            (hasJournalSubscription ? "subscription" : "active")
          }`}
          inactiveText="No active journal subscription"
        />
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-slate-100">
              Discord Integration
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Connect Discord and sync your subscription role. If your Discord
              account is already connected, you can sync roles after joining the
              server.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Step 1
                  </p>
                  <h3 className="mt-1 font-semibold text-slate-100">
                    Join Discord Server
                  </h3>
                </div>

                {discordConnected ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    Completed
                  </span>
                ) : discordInviteUrl ? (
                  <span className="rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
                    Ready
                  </span>
                ) : hasActiveSubscription ? (
                  <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-300">
                    Missing Invite
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                    Locked
                  </span>
                )}
              </div>

              <p className="min-h-12 text-sm text-slate-400">
                {discordConnected
                  ? `Discord is connected as ${
                      discordAccount?.discord_username ?? "Discord user"
                    }. Server membership can be verified during role sync.`
                  : discordInviteUrl
                    ? `Join ${discordOrganizationName} before connecting your Discord account.`
                    : hasActiveSubscription
                      ? "Your organization has not configured a Discord invite link yet."
                      : "Subscribe to a plan first to unlock Discord server access."}
              </p>

              {discordConnected ? (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-sm font-medium text-emerald-300">
                  Discord Connected
                </div>
              ) : discordInviteUrl ? (
                <LoadingActionLink
                  href={discordInviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  loadingLabel="Opening Discord..."
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/30 px-4 py-2 text-center text-sm font-medium text-sky-300 hover:bg-sky-500/10"
                >
                  Join Discord Server
                  <ExternalLink className="h-4 w-4" />
                </LoadingActionLink>
              ) : (
                <div className="mt-4 rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-center text-sm text-slate-500">
                  Invite unavailable
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Step 2
                  </p>
                  <h3 className="mt-1 font-semibold text-slate-100">
                    Connect Discord
                  </h3>
                </div>

                {discordConnected ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">
                    Required
                  </span>
                )}
              </div>

              <p className="min-h-12 text-sm text-slate-400">
                {discordConnected
                  ? `Connected as ${
                      discordAccount?.discord_username ?? "Discord user"
                    }.`
                  : "Authorize CASE Trades to identify your Discord account for role assignment."}
              </p>

              {!discordConnected ? (
                <LoadingActionLink
                  href="/api/auth/discord/connect"
                  loadingLabel="Connecting Discord..."
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-indigo-500/30 px-4 py-2 text-center text-sm font-medium text-indigo-300 hover:bg-indigo-500/10"
                >
                  Connect Discord
                </LoadingActionLink>
              ) : (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-sm font-medium text-emerald-300">
                  Discord Connected
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Step 3
                  </p>
                  <h3 className="mt-1 font-semibold text-slate-100">
                    Sync Roles
                  </h3>
                </div>

                {canSyncRoles ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                    Waiting
                  </span>
                )}
              </div>

              <p className="min-h-12 text-sm text-slate-400">
                {canSyncRoles
                  ? "Sync your roles to unlock the premium Discord channels connected to your active subscription."
                  : "Join the server, connect Discord, and keep an active subscription before syncing."}
              </p>

              {canSyncRoles ? (
                <LoadingActionLink
                  href={`/api/discord/sync-roles?user_id=${profile.id}`}
                  loadingLabel="Syncing roles..."
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/30 px-4 py-2 text-center text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
                >
                  Sync Roles
                </LoadingActionLink>
              ) : (
                <div className="mt-4 rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-center text-sm text-slate-500">
                  Sync unavailable
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {hasActiveSubscription && (
        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-300">
                <CreditCard className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Subscription Management
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Upgrade, downgrade, cancel, update payment methods, and view
                  invoices in the Stripe customer portal.
                </p>
              </div>
            </div>

            <LoadingActionLink
              href={`/api/stripe/customer-portal${portalSuffix}`}
              loadingLabel="Opening billing portal..."
              className="rounded-lg border border-red-500/30 px-4 py-2 text-center text-sm font-medium text-red-300 hover:bg-red-500/10"
            >
              Manage Subscription
            </LoadingActionLink>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          Active Subscriptions
        </h2>

        {subscriptions.length > 0 ? (
          <div className="space-y-3">
            {subscriptions.map((subscription) => {
              const plan = normalizeSingle(subscription.plan);
              const organizationProduct = normalizeSingle(
                subscription.organization_product,
              );
              const display = getSubscriptionDisplay(subscription);
              const organization = organizationDiscordConfigs.find(
                (org) => org.id === subscription.organization_id,
              );

              const subscriptionName =
                organizationProduct?.name ??
                plan?.name ??
                subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1);

              const priceDisplay =
                organizationProduct?.price_label ??
                plan?.price_display ??
                plan?.key ??
                organizationProduct?.product_key ??
                "";

              return (
                <div
                  key={subscription.id}
                  className="rounded-lg border border-white/10 bg-slate-950 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-medium text-slate-100">
                        {subscriptionName}
                      </p>

                      <p className="text-sm text-slate-400">
                        {priceDisplay}
                        {organizationProduct?.billing_interval
                          ? ` / ${organizationProduct.billing_interval}`
                          : ""}
                      </p>

                      {organization && (
                        <p className="mt-1 text-xs text-slate-500">
                          Organization: {organization.name}
                        </p>
                      )}

                      {(organizationProduct?.feature_key ||
                        subscription.feature_key) && (
                        <p className="mt-1 text-xs text-slate-500">
                          Feature:{" "}
                          {organizationProduct?.feature_key ??
                            subscription.feature_key}
                        </p>
                      )}

                      {subscription.discord_role_id && (
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
                          Discord Role: {subscription.discord_role_id}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        {display.dateLabel}:{" "}
                        {subscription.current_period_end
                          ? new Date(
                              subscription.current_period_end,
                            ).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs ${display.className}`}
                    >
                      {display.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasActiveSubscription ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="font-medium text-emerald-300">Subscription Active</p>

            <p className="mt-2 text-sm text-slate-300">
              Your account has an active subscription for this organization.
            </p>
          </div>
        ) : hasRoleEntitlementAccess ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="font-medium text-emerald-300">
              Administrative Access Active
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Your account has elevated CASE Trades access through your role. No
              Stripe subscription is required for this access.
            </p>

            <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
              <p>
                Signals:{" "}
                <span className="text-emerald-300">
                  {entitlements.signals.active ? "Enabled" : "Disabled"}
                </span>
              </p>

              <p>
                Journal:{" "}
                <span className="text-emerald-300">
                  {entitlements.journal.active
                    ? `Enabled (${entitlements.journal.tier ?? "admin"})`
                    : "Disabled"}
                </span>
              </p>
            </div>
          </div>
        ) : hasProductEntitlementAccess ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="font-medium text-emerald-300">
              Product Access Active
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Your account has active CASE Trades access.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No active subscriptions found.
          </p>
        )}
      </section>

      {hasDynamicSignalProducts ? (
        <DynamicProductSection
          id="signals"
          highlighted={
            productPrompt === "signals" || selectedProduct === "signals"
          }
          icon={<Zap />}
          title="Signals"
          description="Premium options signal subscriptions."
          products={dynamicSignalProducts}
          product="signals"
          checkoutSuffix={checkoutSuffix}
          selectedPlanKey={selectedPlanKey}
          activePlanKeys={activePlanKeys}
          activeProductIds={activeProductIds}
        />
      ) : (
        <PlanSection
          id="signals"
          highlighted={
            productPrompt === "signals" || selectedProduct === "signals"
          }
          icon={<Zap />}
          title="CASE Signals"
          description="Fallback demo signal subscriptions. Production products should come from organization_products."
          plans={SIGNAL_PLANS}
          product="signals"
          checkoutSuffix={checkoutSuffix}
          selectedPlanKey={selectedPlanKey}
          activePlanKeys={activePlanKeys}
        />
      )}

      {hasDynamicJournalProducts ? (
        <DynamicProductSection
          id="journal"
          highlighted={
            productPrompt === "journal" || selectedProduct === "journal"
          }
          icon={<BookOpen />}
          title="Journal"
          description="Trading journal subscriptions for stocks, options, analytics, and AI reviews."
          products={dynamicJournalProducts}
          product="journal"
          checkoutSuffix={checkoutSuffix}
          selectedPlanKey={selectedPlanKey}
          activePlanKeys={activePlanKeys}
          activeProductIds={activeProductIds}
          columns="md:grid-cols-3"
        />
      ) : (
        <PlanSection
          id="journal"
          highlighted={
            productPrompt === "journal" || selectedProduct === "journal"
          }
          icon={<BookOpen />}
          title="CASE Journal"
          description="Fallback demo journal subscriptions. Production products should come from organization_products."
          plans={JOURNAL_PLANS}
          product="journal"
          checkoutSuffix={checkoutSuffix}
          columns="md:grid-cols-3"
          selectedPlanKey={selectedPlanKey}
          activePlanKeys={activePlanKeys}
        />
      )}

      {hasDynamicOtherProducts && (
        <DynamicProductSection
          id="other-products"
          highlighted={Boolean(
            selectedProduct &&
              selectedProduct !== "signals" &&
              selectedProduct !== "journal",
          )}
          icon={<Sparkles />}
          title="Additional Products"
          description="Additional organization-managed subscriptions and product offerings."
          products={dynamicOtherProducts}
          product="other"
          checkoutSuffix={checkoutSuffix}
          selectedPlanKey={selectedPlanKey}
          activePlanKeys={activePlanKeys}
          activeProductIds={activeProductIds}
          columns="md:grid-cols-3"
        />
      )}
    </div>
  );
}

function AutoContinueCheckoutNotice({
  checkoutHref,
  planName,
}: {
  checkoutHref: string;
  planName: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-300">
      <script
        dangerouslySetInnerHTML={{
          __html: `window.setTimeout(function(){ window.location.assign(${JSON.stringify(
            checkoutHref,
          )}); }, 900);`,
        }}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
            <CreditCard className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">Preparing Secure Checkout</h2>
            <p className="mt-1 text-sm text-slate-300">
              We are opening Stripe Checkout for {planName}. Please wait a
              moment.
            </p>

            <div className="mt-3 text-sm text-emerald-200">
              <LoadingSpinner
                size="sm"
                label="Redirecting to secure checkout..."
              />
            </div>
          </div>
        </div>

        <LoadingActionLink
          href={checkoutHref}
          loadingLabel="Opening checkout..."
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Continue to Checkout
        </LoadingActionLink>
      </div>
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
  tone: "emerald" | "indigo" | "orange";
}) {
  const classes =
    tone === "indigo"
      ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
      : tone === "orange"
        ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
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

function DynamicProductSection({
  id,
  highlighted,
  icon,
  title,
  description,
  products,
  product,
  checkoutSuffix,
  columns = "md:grid-cols-2",
  selectedPlanKey,
  activePlanKeys,
  activeProductIds,
}: {
  id: string;
  highlighted: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  products: DynamicProductPlan[];
  product: string;
  checkoutSuffix: string;
  columns?: string;
  selectedPlanKey?: string;
  activePlanKeys: string[];
  activeProductIds: string[];
}) {
  return (
    <section
      id={id}
      className={
        "space-y-5 rounded-2xl border p-6 " +
        (highlighted
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-white/10 bg-slate-900/80")
      }
    >
      <SectionHeader icon={icon} title={title} description={description} />

      <div className={`grid gap-4 ${columns}`}>
        {products.map((dynamicProduct, index) => (
          <DynamicProductCard
            key={dynamicProduct.id}
            productPlan={dynamicProduct}
            product={product}
            checkoutSuffix={checkoutSuffix}
            selected={
              dynamicProduct.product_key === selectedPlanKey ||
              dynamicProduct.id === selectedPlanKey
            }
            active={
              activePlanKeys.includes(dynamicProduct.product_key) ||
              activeProductIds.includes(dynamicProduct.id)
            }
            featured={
              index === 1 || dynamicProduct.product_key.includes("monthly")
            }
          />
        ))}
      </div>
    </section>
  );
}

function DynamicProductCard({
  productPlan,
  product,
  checkoutSuffix,
  selected = false,
  active = false,
  featured = false,
}: {
  productPlan: DynamicProductPlan;
  product: string;
  checkoutSuffix: string;
  selected?: boolean;
  active?: boolean;
  featured?: boolean;
}) {
  const highlighted = active || selected || featured;

  const priceLabel = productPlan.price_label ?? "Price not configured";
  const interval = productPlan.billing_interval ?? "subscription";
  const description =
    productPlan.description ?? "Premium CASE Trades subscription access.";

  const checkoutHref = `/api/stripe/checkout?organization_product_id=${
    productPlan.id
  }&plan=${encodeURIComponent(
    productPlan.product_key,
  )}&product=${encodeURIComponent(product)}${checkoutSuffix}`;

  const productFeatures = getDynamicProductFeatures(productPlan);

  return (
    <div
      className={
        "relative rounded-xl border p-5 " +
        (highlighted
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-slate-950")
      }
    >
      {active && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Current Plan
        </div>
      )}

      {!active && selected && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-1 text-xs text-sky-300">
          <CreditCard className="h-3 w-3" />
          Selected
        </div>
      )}

      {!active && !selected && featured && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
          <Crown className="h-3 w-3" />
          Best Value
        </div>
      )}

      <h3 className="pr-24 text-lg font-semibold text-slate-100">
        {productPlan.name}
      </h3>

      {productPlan.organization?.name && (
        <p className="mt-1 text-xs text-slate-500">
          Organization: {productPlan.organization.name}
        </p>
      )}

      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>

      <div className="mt-5">
        <span className="text-3xl font-bold text-emerald-400">
          {priceLabel}
        </span>
        <span className="text-sm text-slate-400"> / {interval}</span>
      </div>

      <div className="mt-5 space-y-3">
        {productFeatures.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300">{feature}</span>
          </div>
        ))}
      </div>

      {productPlan.stripe_price_id ? (
        active ? (
          <div className="mt-6 block rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center text-sm font-medium text-emerald-300">
            Current Plan
          </div>
        ) : (
          <LoadingActionLink
            href={checkoutHref}
            loadingLabel={
              selected
                ? "Opening checkout..."
                : "Starting subscription..."
            }
            className={
              "mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium text-white " +
              (selected
                ? "bg-sky-600 hover:bg-sky-500"
                : "bg-emerald-600 hover:bg-emerald-500")
            }
          >
            {selected ? "Complete Subscription" : "Subscribe"}
          </LoadingActionLink>
        )
      ) : (
        <div className="mt-6 block rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-center text-sm font-medium text-orange-300">
          Stripe Price Missing
        </div>
      )}

      {productPlan.discord_role_id && (
        <p className="mt-3 break-all font-mono text-[11px] text-slate-600">
          discord role: {productPlan.discord_role_id}
        </p>
      )}

      {productPlan.stripe_price_id && (
        <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
          price: {productPlan.stripe_price_id}
        </p>
      )}
    </div>
  );
}

function PlanSection({
  id,
  highlighted,
  icon,
  title,
  description,
  plans,
  product,
  checkoutSuffix,
  columns = "md:grid-cols-2",
  selectedPlanKey,
  activePlanKeys,
}: {
  id: string;
  highlighted: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  plans: PlanDefinition[];
  product: "signals" | "journal";
  checkoutSuffix: string;
  columns?: string;
  selectedPlanKey?: string;
  activePlanKeys: string[];
}) {
  return (
    <section
      id={id}
      className={
        "space-y-5 rounded-2xl border p-6 " +
        (highlighted
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-white/10 bg-slate-900/80")
      }
    >
      <SectionHeader icon={icon} title={title} description={description} />

      <div className={`grid gap-4 ${columns}`}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            product={product}
            checkoutSuffix={checkoutSuffix}
            selected={plan.key === selectedPlanKey}
            active={activePlanKeys.includes(plan.key)}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function CurrentAccessCard({
  title,
  active,
  icon,
  activeText,
  inactiveText,
}: {
  title: string;
  active: boolean;
  icon: ReactNode;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
        <h2 className="font-semibold text-slate-100">{title}</h2>
      </div>

      <p
        className={
          "text-sm " + (active ? "text-emerald-300" : "text-slate-400")
        }
      >
        {active ? activeText : inactiveText}
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  product,
  checkoutSuffix,
  selected = false,
  active = false,
}: {
  plan: PlanDefinition;
  product: "signals" | "journal";
  checkoutSuffix: string;
  selected?: boolean;
  active?: boolean;
}) {
  const highlighted = active || selected || plan.featured;

  return (
    <div
      className={
        "relative rounded-xl border p-5 " +
        (highlighted
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-slate-950")
      }
    >
      {active && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Current Plan
        </div>
      )}

      {!active && selected && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-1 text-xs text-sky-300">
          <CreditCard className="h-3 w-3" />
          Selected
        </div>
      )}

      {!active && !selected && plan.featured && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
          <Crown className="h-3 w-3" />
          Best Value
        </div>
      )}

      <h3 className="pr-24 text-lg font-semibold text-slate-100">
        {plan.name}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {plan.description}
      </p>

      <div className="mt-5">
        <span className="text-3xl font-bold text-emerald-400">
          {plan.price}
        </span>
        <span className="text-sm text-slate-400"> / {plan.interval}</span>
      </div>

      <div className="mt-5 space-y-3">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300">{feature}</span>
          </div>
        ))}
      </div>

      {active ? (
        <div className="mt-6 block rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center text-sm font-medium text-emerald-300">
          Current Plan
        </div>
      ) : (
        <LoadingActionLink
          href={`/api/stripe/checkout?plan=${plan.key}&product=${product}${checkoutSuffix}`}
          loadingLabel={
            selected
              ? "Opening checkout..."
              : "Starting subscription..."
          }
          className={
            "mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium text-white " +
            (selected
              ? "bg-sky-600 hover:bg-sky-500"
              : "bg-emerald-600 hover:bg-emerald-500")
          }
        >
          {selected ? "Complete Subscription" : "Subscribe"}
        </LoadingActionLink>
      )}
    </div>
  );
}

function getDynamicProductFeatures(productPlan: DynamicProductPlan) {
  const featureKey = String(productPlan.feature_key ?? "").toLowerCase();

  if (featureKey.includes("signals")) {
    return [
      "Premium options signals",
      "Discord signal access",
      "Entry, target, and stop guidance",
      "Signal dashboard access",
    ];
  }

  if (featureKey.includes("journal_elite")) {
    return [
      "Everything in Pro",
      "AI trade reviews",
      "Trade grading",
      "Playbooks",
      "Exports",
    ];
  }

  if (featureKey.includes("journal_pro")) {
    return [
      "Stock journaling",
      "Options journaling",
      "Advanced analytics",
      "Reports dashboard",
      "Expectancy tracking",
    ];
  }

  if (featureKey.includes("journal")) {
    return [
      "Stock journaling",
      "Trade notes",
      "Basic P/L tracking",
      "Basic reports",
    ];
  }

  if (featureKey.includes("discord")) {
    return [
      "Discord community access",
      "Subscription role assignment",
      "Premium member channels",
      "Role sync support",
    ];
  }

  return [
    "CASE Trades access",
    "Subscription-based feature unlock",
    "Stripe billing support",
    "Account entitlement tracking",
  ];
}

function isSignalsProduct(product: DynamicProductPlan) {
  const featureKey = String(product.feature_key ?? "").toLowerCase();
  const productKey = String(product.product_key ?? "").toLowerCase();
  const name = String(product.name ?? "").toLowerCase();

  return (
    featureKey.includes("signals") ||
    productKey.includes("signals") ||
    name.includes("signals")
  );
}

function isJournalProduct(product: DynamicProductPlan) {
  const featureKey = String(product.feature_key ?? "").toLowerCase();
  const productKey = String(product.product_key ?? "").toLowerCase();
  const name = String(product.name ?? "").toLowerCase();

  return (
    featureKey.includes("journal") ||
    productKey.includes("journal") ||
    name.includes("journal")
  );
}

function subscriptionMatchesFeature(
  subscription: SubscriptionRow,
  feature: "signals" | "journal",
) {
  const plan = normalizeSingle(subscription.plan);
  const organizationProduct = normalizeSingle(
    subscription.organization_product,
  );

  const values = [
    subscription.feature_key,
    plan?.key,
    plan?.name,
    organizationProduct?.product_key,
    organizationProduct?.name,
    organizationProduct?.feature_key,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return values.some((value) => value.includes(feature));
}

function getActivePlanKeys(subscriptions: SubscriptionRow[]) {
  return subscriptions
    .filter((subscription) => isSubscriptionActive(subscription))
    .flatMap((subscription) => {
      const plan = normalizeSingle(subscription.plan);
      const organizationProduct = normalizeSingle(
        subscription.organization_product,
      );

      return [
        plan?.key,
        organizationProduct?.product_key,
        subscription.feature_key,
      ];
    })
    .filter((key): key is string => Boolean(key));
}

function getActiveProductIds(subscriptions: SubscriptionRow[]) {
  return subscriptions
    .filter((subscription) => isSubscriptionActive(subscription))
    .flatMap((subscription) => {
      const organizationProduct = normalizeSingle(
        subscription.organization_product,
      );

      return [subscription.organization_product_id, organizationProduct?.id];
    })
    .filter((id): id is string => Boolean(id));
}

function getSubscriptionDisplay(subscription: {
  status: string;
  cancel_at_period_end?: boolean | null;
  current_period_end: string | null;
}) {
  if (subscription.cancel_at_period_end) {
    return {
      label: "canceling",
      className: "bg-orange-500/20 text-orange-300",
      dateLabel: "Cancels on",
    };
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    return {
      label: subscription.status,
      className: "bg-emerald-600/20 text-emerald-300",
      dateLabel: "Renews on",
    };
  }

  if (subscription.status === "past_due") {
    return {
      label: "past due",
      className: "bg-red-500/20 text-red-300",
      dateLabel: "Payment due by",
    };
  }

  return {
    label: subscription.status,
    className: "bg-slate-800 text-slate-400",
    dateLabel: "Ends on",
  };
}

function isSubscriptionActive(subscription: {
  status: string | null;
  cancel_at_period_end?: boolean | null;
}) {
  return (
    ["active", "trialing", "past_due"].includes(subscription.status ?? "") ||
    Boolean(subscription.cancel_at_period_end)
  );
}

function mergeSubscriptions(
  primarySubscriptions: SubscriptionRow[],
  fallbackSubscriptions: SubscriptionRow[],
) {
  const subscriptionMap = new Map<string, SubscriptionRow>();

  for (const subscription of fallbackSubscriptions) {
    subscriptionMap.set(subscription.id, subscription);
  }

  for (const subscription of primarySubscriptions) {
    subscriptionMap.set(subscription.id, subscription);
  }

  return Array.from(subscriptionMap.values()).filter((subscription) =>
    isSubscriptionActive(subscription),
  );
}

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}