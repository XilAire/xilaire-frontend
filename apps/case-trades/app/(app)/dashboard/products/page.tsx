import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Products | CASE Trades",
  description:
    "Browse and manage the products, subscriptions, tools, and services available within the CASE Trades platform.",
};


import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  LineChart,
  Package,
  Sparkles,
  Target,
} from "lucide-react";

import { getProfile } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams?: {
    org?: string;
  };
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
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
  sort_order: number | null;
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

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

function getProductIcon(featureKey: string) {
  switch (featureKey) {
    case "signals":
    case "signals_and_journal":
      return Activity;

    case "journal":
    case "journal_pro":
    case "journal_elite":
      return BookOpen;

    default:
      return Package;
  }
}

function getProductHref(product: OrganizationProductRow) {
  if (product.feature_key === "signals") {
    return "/dashboard/products/signals";
  }

  if (
    product.feature_key === "journal" ||
    product.feature_key === "journal_pro" ||
    product.feature_key === "journal_elite"
  ) {
    return "/dashboard/products/journal";
  }

  return "/dashboard/billing";
}

function getProductPlans(product: OrganizationProductRow) {
  const plans: string[] = [];

  if (product.price_label) {
    plans.push(
      product.billing_interval
        ? `${product.price_label} / ${product.billing_interval}`
        : product.price_label
    );
  }

  if (product.feature_key.includes("signals")) {
    plans.push("Trade signal access");
    plans.push("Discord signal role");
  }

  if (product.feature_key.includes("journal")) {
    plans.push("Trade journal access");
    plans.push("Performance tracking");
  }

  if (product.stripe_price_id) {
    plans.push("Stripe checkout enabled");
  }

  return plans.length > 0 ? plans : ["Organization-managed product"];
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const profile = await getProfile({
    organizationSlug: searchParams?.org,
  });

  const supabase = createServiceSupabaseClient();

  let organization: OrganizationRow | null = null;

  if (searchParams?.org) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", searchParams.org)
      .maybeSingle();

    if (error) {
      console.error("Failed to resolve organization by slug", {
        org: searchParams.org,
        error,
      });
    }

    organization = data as OrganizationRow | null;
  }

  if (!organization && profile.current_organization?.organization_id) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", profile.current_organization.organization_id)
      .maybeSingle();

    if (error) {
      console.error("Failed to resolve current organization", {
        organization_id: profile.current_organization.organization_id,
        error,
      });
    }

    organization = data as OrganizationRow | null;
  }

  if (!organization) {
    redirect("/dashboard/billing?reason=no_organization");
  }

  const { data: productsData, error: productsError } = await supabase
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
    .eq("organization_id", organization.id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (productsError) {
    console.error("Products load failed", {
      organization_id: organization.id,
      organization_slug: organization.slug,
      error: productsError,
    });

    throw new Error("Failed to load products.");
  }

  const allProducts = (productsData ?? []) as OrganizationProductRow[];
  const products = allProducts.filter((product) => product.active !== false);

  return (
    <main className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-8">
        <div className="max-w-4xl">
          <p className="text-sm font-medium text-emerald-300">
            {organization.name} Products
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-100">
            Choose the tools that fit your trading workflow.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            Products are customized by organization. Switch organizations from
            the sidebar to view the products offered by each trading community.
          </p>
        </div>
      </section>

      {products.length === 0 ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8">
          <h2 className="text-xl font-semibold text-amber-200">
            No active products configured
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            I found {allProducts.length} product record
            {allProducts.length === 1 ? "" : "s"} for this organization, but no
            active products are currently available. Confirm the product is
            marked active under Organization Settings.
          </p>

          <p className="mt-3 font-mono text-xs text-slate-500">
            Organization ID: {organization.id}
          </p>

          <Link
            href={withOrgQuery("/dashboard/organizations", organization.slug)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
          >
            Open Organization Settings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          {products.map((product, index) => {
            const Icon = getProductIcon(product.feature_key);
            const highlighted = index === 0 || product.feature_key === "signals";

            return (
              <Link
                key={product.id}
                href={withOrgQuery(getProductHref(product), organization.slug)}
                className={
                  "group rounded-2xl border p-6 transition hover:-translate-y-0.5 hover:shadow-2xl " +
                  (highlighted
                    ? "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-400/50"
                    : "border-white/10 bg-slate-900/80 hover:border-white/20")
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-emerald-400">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300">
                    {product.feature_key}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-bold text-slate-100">
                  {product.name}
                </h2>

                <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-400">
                  {product.description ??
                    "Organization-managed product offering."}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {getProductPlans(product).map((item) => (
                    <div
                      key={item}
                      className="flex gap-2 text-sm text-slate-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-500">
                  View Product
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <ValueCard
          icon={<Target />}
          title="Signals"
          description="Trade ideas with clear context."
        />

        <ValueCard
          icon={<BookOpen />}
          title="Journal"
          description="Track and review your trades."
        />

        <ValueCard
          icon={<BarChart3 />}
          title="Analytics"
          description="Understand performance over time."
        />

        <ValueCard
          icon={<Sparkles />}
          title="Growth"
          description="Improve discipline and process."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
        <LineChart className="mx-auto h-10 w-10 text-emerald-400" />

        <h2 className="mt-4 text-2xl font-bold text-slate-100">
          Not sure where to start?
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Signals are best if you want trade alerts and Discord access. Journal
          is best if you want to track trades, review execution, and build
          discipline.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={withOrgQuery("/dashboard/products/signals", organization.slug)}
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Explore Signals
          </Link>

          <Link
            href={withOrgQuery("/dashboard/products/journal", organization.slug)}
            className="rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            Explore Journal
          </Link>
        </div>
      </section>
    </main>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <h3 className="mt-4 font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}