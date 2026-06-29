"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  AlertTriangle,
  ClipboardList,
  RefreshCcw,
  CheckCircle2,
  Ticket as TicketIcon,
  Search,
  LogOut,
} from "lucide-react";

import useSWR from "swr";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import UserMenu from "@/components/layout/UserMenu";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HelpdeskLayoutClient({
  children,
   profile,
}: {
  children: React.ReactNode;
  profile: any;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { data: counts } = useSWR("/api/helpdesk/counts", fetcher, {
    refreshInterval: 5000,
  });

  const dashboardCount =
    (counts?.tickets ?? 0) +
    (counts?.incidents ?? 0) +
    (counts?.serviceRequests ?? 0) +
    (counts?.changeRequests ?? 0) +
    (counts?.approvals ?? 0);

  /** HELP DESK NAVIGATION */
  const helpdeskLinks = [
    { label: "Dashboard", href: "/helpdesk", icon: LayoutDashboard, count: dashboardCount },
    { label: "Tickets", href: "/helpdesk/tickets", icon: TicketIcon, count: counts?.tickets ?? 0 },
    { label: "Incidents", href: "/helpdesk/incidents", icon: AlertTriangle, count: counts?.incidents ?? 0 },
    { label: "Service Requests", href: "/helpdesk/service-requests", icon: ClipboardList, count: counts?.serviceRequests ?? 0 },
    { label: "Change Requests", href: "/helpdesk/change-requests", icon: RefreshCcw, count: counts?.changeRequests ?? 0 },
    { label: "Approvals", href: "/helpdesk/approvals", icon: CheckCircle2, count: counts?.approvals ?? 0 },
  ];

  /** PLATFORM NAVIGATION */
  const platformLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Automations", href: "/automations", icon: RefreshCcw },
    { label: "Bots", href: "/bots", icon: TicketIcon },
    { label: "Reports", href: "/reports", icon: ClipboardList },
    { label: "Billing", href: "/billing", icon: CheckCircle2 },
    { label: "Settings", href: "/settings", icon: AlertTriangle },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/signin");
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-[#0b1121] border-r border-slate-200 dark:border-slate-800 flex flex-col">

        {/* BRAND HEADER */}
        <div className="px-5 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <img src="/icon.png" className="h-8 w-auto dark:hidden" alt="Logo" />
          <img src="/icon-light.png" className="h-8 w-auto hidden dark:block" alt="Logo" />
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-sky-300">
              XilAire Platform
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
              Operations & Automation
            </p>
          </div>
        </div>

        {/* PLATFORM NAV */}
        <nav className="px-3 py-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
            Platform
          </p>

          <div className="space-y-1">
            {platformLinks.map(({ label, href, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
                    ${
                      active
                        ? "bg-sky-600/20 text-sky-700 dark:text-sky-300 border border-sky-700/30"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* DIVIDER */}
        <div className="px-3 mt-3 mb-1 border-t border-slate-200 dark:border-slate-800"></div>

        {/* HELP DESK NAV */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
            Help Desk
          </p>

          {helpdeskLinks.map(({ label, href, icon: Icon, count }) => {
            const active = pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all 
                  ${
                    active
                      ? "bg-sky-600/20 text-sky-700 dark:text-sky-300 border border-sky-700/30"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} />
                  {label}
                </div>

                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  {count ?? "…"}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER — Logged in User */}
        <div className="px-4 py-5 border-t border-slate-200 dark:border-slate-800 text-xs">

          <p className="text-slate-600 dark:text-slate-300 font-medium">
            {profile?.full_name ?? "Unknown User"}
          </p>

          <p className="text-slate-500 dark:text-slate-400 mb-3">
            {profile?.email ?? ""}
          </p>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 
              text-slate-100 py-2 text-xs hover:bg-slate-700 transition border border-slate-700"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

      </aside>

      {/* RIGHT PANEL */}
      <div className="flex flex-col flex-1">

        {/* TOPBAR */}
        <header className="flex items-center justify-between px-6 py-4 
          bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 
          backdrop-blur sticky top-0 z-20">

          {/* SEARCH */}
          <div className="relative w-80 hidden md:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets, incidents, requests..."
              className="w-full rounded-md bg-slate-100 dark:bg-slate-800 
                border border-slate-300 dark:border-slate-700 
                pl-10 py-2 text-sm"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserMenu profile={profile} />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
