import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageOrganizationBilling,
  getUserOrganizationRole,
} from "@/lib/orgs/getUserOrganizationRole";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    orgSlug: string;
  };
};

type PlanRow = {
  id: string;
  key: string;
  name: string;
  price_display: string | null;
  interval: string | null;
  active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  plan_entitlements:
    | {
        product_key: string;
        access_level: string;
        limits: Record<string, unknown> | null;
      }[]
    | null;
};

export default async function ControlCenterProductsPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const access = await getUserOrganizationRole({
    userId: user.id,
    organizationSlug: params.orgSlug,
  });

  if (!access || !canManageOrganizationBilling(access.role)) {
    redirect(`/dashboard/control-center/${params.orgSlug}`);
  }

  const { data, error } = await supabase
    .from("plans")
    .select(
      `
      id,
      key,
      name,
      price_display,
      interval,
      active,
      stripe_product_id,
      stripe_price_id,
      plan_entitlements (
        product_key,
        access_level,
        limits
      )
    `
    )
    .eq("organization_id", access.organization_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load organization products", error);
    throw new Error("Failed to load organization products.");
  }

  const plans = (data ?? []) as PlanRow[];

  const activePlans = plans.filter((plan) => plan.active);
  const mappedPlans = plans.filter((plan) => plan.stripe_price_id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/control-center/${access.organization_slug}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {access.organization_name}
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold text-slate-100">
            Products & Plans
          </h1>
          <p className="text-sm text-slate-400">
            Manage plans, Stripe mappings, and entitlements for{" "}
            {access.organization_name}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ProductStat title="Plans" value={String(plans.length)} icon={<Package />} />
        <ProductStat
          title="Active Plans"
          value={String(activePlans.length)}
          icon={<CheckCircle2 />}
        />
        <ProductStat
          title="Stripe Mapped"
          value={String(mappedPlans.length)}
          icon={<CreditCard />}
        />
        <ProductStat title="Access Model" value="Entitlements" icon={<ShieldCheck />} />
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Plan Directory
          </h2>
          <p className="text-sm text-slate-400">
            Stripe Price IDs must be mapped before checkout can work.
          </p>
        </div>

        <div className="grid gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-white/10 bg-slate-950 p-5"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-100">
                      {plan.name}
                    </h3>

                    <span
                      className={
                        "rounded-full px-2 py-1 text-xs " +
                        (plan.active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-400")
                      }
                    >
                      {plan.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">{plan.key}</p>

                  <p className="mt-3 text-2xl font-bold text-emerald-400">
                    {plan.price_display ?? "No price"}
                    {plan.interval ? (
                      <span className="text-sm font-normal text-slate-400">
                        {" "}
                        / {plan.interval}
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="min-w-72 rounded-lg border border-white/10 bg-slate-900 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stripe Mapping
                  </p>

                  <div className="mt-3 space-y-2">
                    <StripeRow label="Product ID" value={plan.stripe_product_id} />
                    <StripeRow label="Price ID" value={plan.stripe_price_id} />
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entitlements
                </p>

                <div className="flex flex-wrap gap-2">
                  {(plan.plan_entitlements ?? []).map((entitlement) => (
                    <span
                      key={`${plan.id}-${entitlement.product_key}`}
                      className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
                    >
                      {entitlement.product_key} • {entitlement.access_level}
                    </span>
                  ))}

                  {(plan.plan_entitlements ?? []).length === 0 && (
                    <span className="text-sm text-slate-500">
                      No entitlements assigned.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-slate-950 p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-emerald-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-100">
                No plans found
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Add plans from Master Admin or seed them in Supabase.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function StripeRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={
          "mt-1 break-all font-mono text-xs " +
          (value ? "text-slate-300" : "text-red-300")
        }
      >
        {value ?? "Missing"}
      </p>
    </div>
  );
}