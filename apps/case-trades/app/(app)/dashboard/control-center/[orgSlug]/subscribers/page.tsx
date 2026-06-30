import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Mail,
  Users,
  UserCheck,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageOrganization,
  getUserOrganizationRole,
} from "@/lib/orgs/getUserOrganizationRole";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    orgSlug: string;
  };
};

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
  user_id: string;
  profile:
    | {
        email: string | null;
        full_name: string | null;
        status: string | null;
      }
    | {
        email: string | null;
        full_name: string | null;
        status: string | null;
      }[]
    | null;
  plan:
    | {
        key: string | null;
        name: string | null;
        price_display: string | null;
      }
    | {
        key: string | null;
        name: string | null;
        price_display: string | null;
      }[]
    | null;
};

export default async function ControlCenterSubscribersPage({
  params,
}: PageProps) {
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

  if (!access || !canManageOrganization(access.role)) {
    redirect("/dashboard/control-center");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      current_period_start,
      current_period_end,
      created_at,
      user_id,
      profile:profiles (
        email,
        full_name,
        status
      ),
      plan:plans (
        key,
        name,
        price_display
      )
    `
    )
    .eq("organization_id", access.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load subscribers", error);
    throw new Error("Failed to load subscribers.");
  }

  const subscriptions = (data ?? []) as SubscriptionRow[];

  const activeCount = subscriptions.filter((sub) =>
    ["active", "trialing"].includes(sub.status)
  ).length;

  const expiredCount = subscriptions.filter((sub) =>
    ["canceled", "past_due", "unpaid", "incomplete_expired"].includes(
      sub.status
    )
  ).length;

  const uniqueUsers = new Set(subscriptions.map((sub) => sub.user_id)).size;

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
            Subscribers
          </h1>
          <p className="text-sm text-slate-400">
            Review subscribers and subscription statuses for{" "}
            {access.organization_name}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SubscriberStat
          title="Unique Users"
          value={String(uniqueUsers)}
          icon={<Users />}
        />
        <SubscriberStat
          title="Active"
          value={String(activeCount)}
          icon={<UserCheck />}
        />
        <SubscriberStat
          title="Expired / Past Due"
          value={String(expiredCount)}
          icon={<CreditCard />}
        />
        <SubscriberStat
          title="Total Records"
          value={String(subscriptions.length)}
          icon={<Mail />}
        />
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Subscriber Directory
          </h2>
          <p className="text-sm text-slate-400">
            Stripe webhook sync will keep this table updated automatically.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Renews / Ends</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {subscriptions.map((subscription) => {
                const profile = normalizeSingle(subscription.profile);
                const plan = normalizeSingle(subscription.plan);

                return (
                  <tr key={subscription.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">
                        {profile?.full_name ?? "Unknown User"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {profile?.email ?? "No email"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p>{plan?.name ?? "Unknown Plan"}</p>
                      <p className="text-xs text-slate-500">
                        {plan?.key ?? "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {plan?.price_display ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill status={subscription.status} />
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(subscription.current_period_end)}
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(subscription.created_at)}
                    </td>
                  </tr>
                );
              })}

              {subscriptions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No subscribers found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SubscriberStat({
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

function StatusPill({ status }: { status: string }) {
  const active = status === "active" || status === "trialing";

  return (
    <span
      className={
        "rounded-full px-2 py-1 text-xs " +
        (active
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-slate-800 text-slate-400")
      }
    >
      {status}
    </span>
  );
}

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}