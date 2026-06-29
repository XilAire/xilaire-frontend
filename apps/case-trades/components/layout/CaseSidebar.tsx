"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

import type { Profile } from "@/lib/getProfile";
import OrganizationSwitcher from "@/components/layout/OrganizationSwitcher";
import {
  buildCaseNavigation,
  isActiveCasePath,
} from "@/components/layout/CaseNavigation";

export default function CaseSidebar({ profile }: { profile?: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const selectedOrgSlug = searchParams.get("org");

  const navigation = useMemo(
    () =>
      buildCaseNavigation({
        profile,
        orgSlug: selectedOrgSlug,
      }),
    [profile, selectedOrgSlug]
  );

  const { email, organizations, selectedOrganization, navGroups } = navigation;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navGroups.map((group) => [group.label, group.defaultOpen ?? true])
    )
  );

  useEffect(() => {
    setOpenGroups((previousOpenGroups) => {
      const nextOpenGroups = { ...previousOpenGroups };

      for (const group of navGroups) {
        if (nextOpenGroups[group.label] === undefined) {
          nextOpenGroups[group.label] = group.defaultOpen ?? true;
        }
      }

      return nextOpenGroups;
    });
  }, [navGroups]);

  function toggleGroup(label: string) {
    setOpenGroups((previousOpenGroups) => ({
      ...previousOpenGroups,
      [label]: !previousOpenGroups[label],
    }));
  }

  async function handleLogout() {
    setLoading(true);

    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    router.push("/auth/signin");
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950/90 px-4 py-4">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          CASE Trades
        </p>
        <p className="text-sm text-slate-300">Trading Intelligence Platform</p>
      </div>

      {organizations.length > 0 && (
        <div className="mb-5">
          <OrganizationSwitcher
            organizations={organizations}
            currentOrganization={selectedOrganization}
          />
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? group.defaultOpen ?? true;

          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="mb-2 flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-300"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              {isOpen && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActiveCasePath(pathname, item);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition " +
                          (active
                            ? "bg-emerald-600/20 text-emerald-300"
                            : "text-slate-300 hover:bg-slate-900")
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 pt-3 text-xs text-slate-500">
        <p>Signed in as</p>
        <p className="truncate font-medium text-slate-300">{email}</p>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="mt-3 flex w-full items-center gap-3 rounded-lg bg-slate-800 px-3 py-2 text-left text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}