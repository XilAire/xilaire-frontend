"use client";

import ThemeLogo from "@/components/ui/ThemeLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, LayoutDashboard, FileBarChart, FileText, FolderKanban, Shield, Receipt, Cpu, Building2, Users, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabasePlatformClient";
import { buildPortalNav } from "@/components/layout/buildPortalNav";
import type { AccessContext } from "@/lib/portalAccess";
import { convertPortalNavToGroups, itemIsActive, staticOperationalGroups } from "./sidebar-navigation";
import type { HelpdeskCounts, MonitoringCounts, NavBadges, NavGroup, SidebarProfile, ResolvedProfile, VendorAccessState } from "./sidebar-navigation";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function toResolvedProfile(profile: SidebarProfile): ResolvedProfile {
  return {
    full_name: profile?.full_name ?? "Unknown User",
    email: profile?.email ?? "",
    role: profile?.role ?? "user",
    account_type: profile?.account_type ?? null,
    status: profile?.status ?? null,
    org_id: profile?.org_id ?? null,
  };
}

function profileNeedsHydration(profile: ResolvedProfile) {
  return (
    !profile.account_type ||
    !profile.role ||
    !profile.status ||
    !profile.org_id
  );
}

/* -------------------------------------------------
   SIDEBAR
------------------------------------------------- */

export default function AppSidebar({
  profile,
  counts,
  monitoringCounts,
}: {
  profile: SidebarProfile;
  counts: HelpdeskCounts;
  monitoringCounts: MonitoringCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [resolvedProfile, setResolvedProfile] = useState<ResolvedProfile>(() =>
    toResolvedProfile(profile),
  );

  const [vendorAccessState, setVendorAccessState] = useState<VendorAccessState>(
    {
      vendorRecordExists: false,
      vendorIsActive: false,
      vendorLegacyActive: false,
      vendorOnboardingStatus: null,
      vendorOnboardingCompletedAt: null,
    },
  );

  const [navBadges, setNavBadges] = useState<NavBadges>({
    alerts: 0,
    notificationsFailed: 0,
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setResolvedProfile(toResolvedProfile(profile));
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateProfile() {
      const current = toResolvedProfile(profile);

      if (!profileNeedsHydration(current)) {
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user?.id) {
          return;
        }

        const { data: freshProfile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, role, account_type, status, org_id")
          .eq("id", user.id)
          .single();

        if (profileError || !freshProfile) {
          return;
        }

        if (!cancelled) {
          setResolvedProfile({
            full_name: freshProfile.full_name ?? current.full_name,
            email: freshProfile.email ?? current.email,
            role: freshProfile.role ?? current.role,
            account_type: freshProfile.account_type ?? null,
            status: freshProfile.status ?? null,
            org_id: freshProfile.org_id ?? null,
          });
        }
      } catch {
        // intentional no-op
      }
    }

    hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateVendorAccess() {
      const accountType = normalize(resolvedProfile.account_type);
      const orgId = resolvedProfile.org_id;

      if (accountType !== "vendor" || !orgId) {
        if (!cancelled) {
          setVendorAccessState({
            vendorRecordExists: false,
            vendorIsActive: false,
            vendorLegacyActive: false,
            vendorOnboardingStatus: null,
            vendorOnboardingCompletedAt: null,
          });
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("infrastructure_vendors")
          .select(
            "id, active, is_active, onboarding_status, onboarding_completed_at",
          )
          .eq("org_id", orgId)
          .limit(1)
          .maybeSingle();

        if (error) {
          return;
        }

        if (!cancelled) {
          setVendorAccessState({
            vendorRecordExists: Boolean(data?.id),
            vendorIsActive: Boolean(data?.is_active),
            vendorLegacyActive: Boolean(data?.active),
            vendorOnboardingStatus: data?.onboarding_status ?? null,
            vendorOnboardingCompletedAt: data?.onboarding_completed_at ?? null,
          });
        }
      } catch {
        // intentional no-op
      }
    }

    hydrateVendorAccess();

    return () => {
      cancelled = true;
    };
  }, [resolvedProfile.account_type, resolvedProfile.org_id]);

  const accessContext: AccessContext = useMemo(
    () => ({
      role: resolvedProfile.role,
      accountType: resolvedProfile.account_type,
      profileStatus: resolvedProfile.status,
      orgId: resolvedProfile.org_id,
      vendorRecordExists: vendorAccessState.vendorRecordExists,
      vendorIsActive: vendorAccessState.vendorIsActive,
      vendorLegacyActive: vendorAccessState.vendorLegacyActive,
      vendorOnboardingStatus: vendorAccessState.vendorOnboardingStatus,
      vendorOnboardingCompletedAt:
        vendorAccessState.vendorOnboardingCompletedAt,
    }),
    [resolvedProfile, vendorAccessState],
  );

  const portalDrivenGroups = useMemo(() => {
    return convertPortalNavToGroups(buildPortalNav(accessContext));
  }, [accessContext]);

  const normalizedAccountType = normalize(resolvedProfile.account_type);
  const normalizedRole = normalize(resolvedProfile.role);

  const isVendor = normalizedAccountType === "vendor";

  const isInternalLike =
    !isVendor &&
    (normalizedAccountType === "internal" ||
      normalizedAccountType === "business" ||
      normalizedAccountType === "individual" ||
      normalizedAccountType === "" ||
      normalizedRole === "finance" ||
      normalizedRole === "admin" ||
      normalizedRole === "super_admin" ||
      normalizedRole === "master_admin" ||
      normalizedRole === "project_manager");

  const canViewOperationalPlatform =
    !isVendor ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "master_admin" ||
    normalizedRole === "project_manager" ||
    normalizedRole === "finance";

  const canViewHelpDesk = isInternalLike;

  const canViewMonitoring =
    normalizedRole === "project_manager" ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "master_admin";

  const canViewVault =
    !isVendor ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "master_admin" ||
    normalizedRole === "project_manager" ||
    normalizedRole === "finance";

  const visibleNavGroups = useMemo(() => {
    const groups: NavGroup[] = [];

    if (canViewOperationalPlatform) {
      const platformGroup = staticOperationalGroups.find(
        (g) => g.label === "Platform",
      );
      if (platformGroup) groups.push(platformGroup);
    }

    if (canViewHelpDesk) {
      const helpDeskGroup = staticOperationalGroups.find(
        (g) => g.label === "Help Desk",
      );
      if (helpDeskGroup) groups.push(helpDeskGroup);
    }

    if (canViewMonitoring) {
      const monitoringGroup = staticOperationalGroups.find(
        (g) => g.label === "Monitoring",
      );
      if (monitoringGroup) groups.push(monitoringGroup);
    }

    if (canViewVault) {
      groups.push({
        label: "Vault",
        icon: FileText,
        items: [
          {
            href: "/vault",
            label: "Overview",
            icon: LayoutDashboard,
          },
          {
            href: "/vault/search",
            label: "Search",
            icon: FileBarChart,
          },
          {
            href: "/vault/messages",
            label: "Messages",
            icon: FileText,
          },
          {
            href: "/vault/cases",
            label: "Cases",
            icon: FolderKanban,
          },
          {
            href: "/vault/holds",
            label: "Holds",
            icon: Shield,
          },
          {
            href: "/vault/exports",
            label: "Exports",
            icon: Receipt,
          },
          {
            href: "/vault/ingest",
            label: "Ingestion",
            icon: Cpu,
          },
          {
            href: "/vault/sources",
            label: "Sources",
            icon: Building2,
          },
          {
            href: "/vault/custodians",
            label: "Custodians",
            icon: Users,
          },
          {
            href: "/vault/retention",
            label: "Retention",
            icon: ClipboardList,
          },
          {
            href: "/vault/audit",
            label: "Audit",
            icon: FileBarChart,
          },
        ].filter(
          (entry, index, arr) =>
            arr.findIndex((x) => x.href === entry.href) === index,
        ),
      });
    }

    const organizedPortalGroups = portalDrivenGroups.map((group) => {
      if (group.label === "Finance") {
        return {
          ...group,
          items: [
            ...group.items,
            {
              href: "/finance/invoices",
              label: "Finance Invoices",
              icon: Receipt,
            },
            {
              href: "/finance/overages",
              label: "Overage Usage",
              icon: FileBarChart,
            },
          ].filter(
            (entry, index, arr) =>
              arr.findIndex((x) => x.href === entry.href) === index,
          ),
        };
      }

      return group;
    });

    groups.push(
      ...organizedPortalGroups.filter(
        (group) => group.label !== "Platform" && group.items.length > 0,
      ),
    );

    return groups;
  }, [
    canViewOperationalPlatform,
    canViewHelpDesk,
    canViewMonitoring,
    canViewVault,
    portalDrivenGroups,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadBadges() {
      try {
        const res = await fetch("/api/navigation/badges", {
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled) {
          setNavBadges(data);
        }
      } catch {
        // intentional no-op
      }
    }

    loadBadges();

    const interval = setInterval(loadBadges, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const nextState = Object.fromEntries(
      visibleNavGroups.map((group) => [
        group.label,
        group.items.some((item) => itemIsActive(pathname, item.href)),
      ]),
    ) as Record<string, boolean>;

    setOpenSections((prev) => ({
      ...nextState,
      ...prev,
    }));
  }, [pathname, visibleNavGroups]);

  function toggleSection(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth/signin");
  }

  return (
    <aside aria-label="Primary navigation" className="hidden h-full min-h-0 w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] px-3 py-4 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2">
        <ThemeLogo size={32} priority />
        <div>
          <p className="text-sm font-semibold text-[var(--sidebar-foreground)]">
            XilAire Platform
          </p>
          <p className="text-xs text-[var(--sidebar-muted-foreground)]">Operations & Automation</p>
        </div>
      </Link>

      <nav aria-label="Main sections" className="min-h-0 flex-1 space-y-4 overflow-y-auto text-sm">
        {visibleNavGroups.map((group) => {
          const GroupIcon = group.icon;
          const open = openSections[group.label] ?? false;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleSection(group.label)}
                aria-expanded={open}
                aria-label={`${group.label} navigation`}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs uppercase tracking-wide text-[var(--sidebar-section-foreground)] hover:text-[var(--sidebar-foreground)]"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="h-4 w-4" />
                  {group.label}
                </span>
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {open && (
                <div className="mt-1 space-y-1 pl-1">
                  {group.items.map((link) => {
                    const active = itemIsActive(pathname, link.href);
                    const ItemIcon = link.icon;

                    const count =
                      typeof link.badge === "string"
                        ? navBadges[link.badge]
                        : typeof link.key === "string"
                          ? counts?.[link.key] ?? 0
                          : typeof link.countKey === "string"
                            ? monitoringCounts?.[link.countKey] ?? 0
                            : null;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={
                          "flex items-center justify-between rounded-lg px-2 py-2 transition " +
                          (active
                            ? "bg-[var(--sidebar-active-background)] text-[var(--sidebar-active-foreground)]"
                            : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover-background)]")
                        }
                      >
                        <span className="flex items-center gap-2">
                          {ItemIcon && <ItemIcon className="h-4 w-4" />}
                          {link.label}
                        </span>

                        {typeof count === "number" && count > 0 && (
                          <span className="rounded-full bg-[var(--sidebar-surface)] px-2 py-0.5 text-xs text-[var(--sidebar-foreground)]">
                            {count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-3 shrink-0 border-t border-[var(--sidebar-border)] pt-3 text-xs text-slate-500">
        <p className="font-medium text-slate-700 dark:text-slate-300">{resolvedProfile.full_name}</p>
        <p className="mb-3 text-[11px]">{resolvedProfile.email}</p>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full rounded-lg bg-[var(--sidebar-surface)] px-3 py-2 text-left text-[var(--sidebar-foreground)] transition hover:bg-[var(--sidebar-hover-background)] disabled:opacity-50"
        >
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}