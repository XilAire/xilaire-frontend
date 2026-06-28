import { redirect } from "next/navigation";
import {
  CreditCard,
  Database,
  KeyRound,
  Settings,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

export default async function MasterAdminSettingsPage() {
  let profile;

  try {
    profile = await getProfile();
  } catch {
    redirect("/auth/signin");
  }

  const role = Array.isArray((profile as any)?.roles)
    ? (profile as any)?.roles?.[0]
    : (profile as any)?.roles;

  const isMasterAdmin =
    role?.name === "master_admin" ||
    role?.rank === 4 ||
    profile.email?.toLowerCase() === "csthilaire@xilairetechnologies.com";

  if (!isMasterAdmin) {
    redirect("/dashboard");
  }

  const supabase = createSupabaseServerClient();

  const { count: organizationCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });

  const { count: planCount } = await supabase
    .from("plans")
    .select("id", { count: "exact", head: true });

  const { count: subscriptionCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true });

  const stripeConfigured =
    Boolean(process.env.STRIPE_SECRET_KEY_CASE_TRADES) ||
    Boolean(process.env.STRIPE_SECRET_KEY);

  const webhookConfigured =
    Boolean(process.env.STRIPE_WEBHOOK_SECRET_CASE_TRADES) ||
    Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-400">
          Master admin controls for CASE Trades platform configuration.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SettingsStat
          title="Organizations"
          value={String(organizationCount ?? 0)}
          icon={<Database />}
        />
        <SettingsStat
          title="Plans"
          value={String(planCount ?? 0)}
          icon={<CreditCard />}
        />
        <SettingsStat
          title="Subscriptions"
          value={String(subscriptionCount ?? 0)}
          icon={<ShieldCheck />}
        />
        <SettingsStat
          title="Stripe"
          value={stripeConfigured ? "Configured" : "Missing"}
          icon={<KeyRound />}
          warning={!stripeConfigured}
        />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <ConfigCard
          title="Stripe API"
          description="Used to create Checkout sessions and manage paid subscriptions."
          icon={<CreditCard />}
          status={stripeConfigured ? "Configured" : "Missing"}
          good={stripeConfigured}
        />

        <ConfigCard
          title="Stripe Webhook"
          description="Used to sync subscription status, renewals, cancellations, and past-due states."
          icon={<Webhook />}
          status={webhookConfigured ? "Configured" : "Missing"}
          good={webhookConfigured}
        />

        <ConfigCard
          title="Supabase"
          description="Stores users, profiles, organizations, plans, entitlements, and signal data."
          icon={<Database />}
          status="Configured"
          good
        />

        <ConfigCard
          title="Master Admin"
          description="Master admin bypass is enabled through role rank, role name, or owner email."
          icon={<Settings />}
          status="Enabled"
          good
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">
          Next Required Setup
        </h2>

        <div className="mt-5 space-y-3 text-sm text-slate-300">
          <ChecklistItem text="Create Stripe products and prices" done />
          <ChecklistItem text="Save Stripe Price IDs into plans table" />
          <ChecklistItem text="Create checkout API route" />
          <ChecklistItem text="Create Stripe webhook route" />
          <ChecklistItem text="Sync subscriptions to Supabase" />
          <ChecklistItem text="Connect Discord role assignment" />
        </div>
      </section>
    </div>
  );
}

function SettingsStat({
  title,
  value,
  icon,
  warning = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div
        className={
          "mb-3 [&>svg]:h-5 [&>svg]:w-5 " +
          (warning ? "text-amber-400" : "text-emerald-400")
        }
      >
        {icon}
      </div>
      <p className="text-sm text-slate-400">{title}</p>
      <p
        className={
          "mt-1 text-xl font-semibold " +
          (warning ? "text-amber-300" : "text-slate-100")
        }
      >
        {value}
      </p>
    </div>
  );
}

function ConfigCard({
  title,
  description,
  icon,
  status,
  good,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: string;
  good: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>

        <span
          className={
            "rounded-full px-2 py-1 text-xs " +
            (good
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-300")
          }
        >
          {status}
        </span>
      </div>

      <h2 className="font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function ChecklistItem({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          "h-2 w-2 rounded-full " +
          (done ? "bg-emerald-400" : "bg-slate-600")
        }
      />
      <span>{text}</span>
    </div>
  );
}