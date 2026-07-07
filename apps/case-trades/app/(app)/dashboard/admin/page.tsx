import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  MessageCircle,
  Settings,
  ShieldCheck,
  Signal,
  Users,
} from "lucide-react";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Admin Dashboard | CASE Trades",
  description:
    "Manage CASE Trades customers, organizations, signals, Discord integrations, platform settings, subscriptions, and administrative tools.",
};

const adminCards = [
  {
    title: "Customers",
    description:
      "View and manage customer accounts, subscriptions, activity, and access.",
    href: "/dashboard/admin/customers",
    icon: Users,
  },
  {
    title: "Organizations",
    description:
      "Manage tenant organizations, members, workspaces, roles, and permissions.",
    href: "/dashboard/admin/organizations",
    icon: Building2,
  },
  {
    title: "Signals",
    description:
      "Review, manage, create, and monitor trading signals across the platform.",
    href: "/dashboard/admin/signals",
    icon: Signal,
  },
  {
    title: "Discord",
    description:
      "Configure Discord servers, bots, role mapping, invites, and community sync.",
    href: "/dashboard/admin/discord",
    icon: MessageCircle,
  },
  {
    title: "Billing",
    description:
      "Review subscription activity, plans, invoices, customer billing, and payments.",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    title: "Platform Settings",
    description:
      "Configure system-wide settings, feature flags, integrations, and admin controls.",
    href: "/dashboard/admin/settings",
    icon: Settings,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-w-0 max-w-full space-y-8">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Master Admin
            </div>

            <h1 className="break-words text-2xl font-semibold text-slate-100">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Manage the CASE Trades platform from one centralized admin hub,
              including customers, organizations, signals, Discord integrations,
              billing, and global platform settings.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 sm:w-fit"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <section className="grid w-full min-w-0 max-w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {adminCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-sm transition hover:border-emerald-500/30 hover:bg-slate-900"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-emerald-400 transition group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10">
                <Icon className="h-5 w-5" />
              </div>

              <h2 className="text-base font-semibold text-slate-100">
                {card.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {card.description}
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                Open {card.title} →
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}