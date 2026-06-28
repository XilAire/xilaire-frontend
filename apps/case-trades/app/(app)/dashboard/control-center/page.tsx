import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronRight,
  Settings,
  Signal,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccessibleOrganizations } from "@/lib/orgs/getAccessibleOrganizations";

export const dynamic = "force-dynamic";

export default async function ControlCenterPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const organizations = await getAccessibleOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Control Center
        </h1>
        <p className="text-sm text-slate-400">
          Manage organizations, signals, subscribers, Discord, analytics, and
          settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ControlStat
          title="Organizations"
          value={String(organizations.length)}
          icon={<Building2 />}
        />
        <ControlStat title="Signals" value="Manage" icon={<Signal />} />
        <ControlStat title="Subscribers" value="View" icon={<Users />} />
        <ControlStat title="Analytics" value="Track" icon={<BarChart3 />} />
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Your Organizations
          </h2>
          <p className="text-sm text-slate-400">
            Select an organization to manage its signal board, subscribers,
            products, Discord setup, and settings.
          </p>
        </div>

        <div className="grid gap-4">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/dashboard/control-center/${org.slug}`}
              className="group rounded-xl border border-white/10 bg-slate-950 p-5 transition hover:border-emerald-500/40 hover:bg-slate-900"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                    <Building2 className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {org.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      /{org.slug}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      {org.description ??
                        "Manage signals, subscribers, products, and organization settings."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  Open Control Center
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickAction
          title="Manage Signals"
          description="Create, update, and review signals for your organization."
          icon={<Signal />}
        />
        <QuickAction
          title="Subscribers"
          description="Review active members and subscription access."
          icon={<Users />}
        />
        <QuickAction
          title="Settings"
          description="Configure organization branding, Discord, and products."
          icon={<Settings />}
        />
      </section>
    </div>
  );
}

function ControlStat({
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

function QuickAction({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}