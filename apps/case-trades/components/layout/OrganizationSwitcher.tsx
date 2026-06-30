"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";

import type { UserOrganizationAccess } from "@/lib/orgs/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type OrganizationSwitcherProps = {
  organizations: UserOrganizationAccess[];
  currentOrganization: UserOrganizationAccess | null;
};

export default function OrganizationSwitcher({
  organizations,
  currentOrganization,
}: OrganizationSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [switching, setSwitching] = useState(false);

  if (!organizations.length) {
    return null;
  }

  const selectedOrganization =
    organizations.find(
      (organization) =>
        organization.organization_slug === searchParams.get("org")
    ) ??
    currentOrganization ??
    organizations[0] ??
    null;

  function handleChange(organizationSlug: string) {
    if (
      switching ||
      organizationSlug === selectedOrganization?.organization_slug
    ) {
      return;
    }

    setSwitching(true);

    const params = new URLSearchParams(searchParams.toString());
    params.set("org", organizationSlug);

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Building2 className="h-4 w-4" />
        Organization
      </label>

      <div className="relative">
        <select
          value={selectedOrganization?.organization_slug ?? ""}
          onChange={(event) => handleChange(event.target.value)}
          disabled={switching}
          aria-busy={switching}
          className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200 outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {organizations.map((organization) => (
            <option
              key={organization.organization_id}
              value={organization.organization_slug}
            >
              {organization.organization_name}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {switching ? (
            <LoadingSpinner size="sm" label="" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {switching && (
        <p className="mt-2 text-xs text-emerald-300">
          Switching organization...
        </p>
      )}

      {selectedOrganization && (
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <p className="flex items-center justify-between gap-3">
            <span>Role</span>
            <span className="font-medium capitalize text-slate-300">
              {selectedOrganization.role ?? "member"}
            </span>
          </p>

          <p className="flex items-center justify-between gap-3">
            <span>Subscription</span>
            <span
              className={
                selectedOrganization.has_active_subscription
                  ? "inline-flex items-center gap-1 font-medium text-emerald-300"
                  : "font-medium text-amber-300"
              }
            >
              {selectedOrganization.has_active_subscription && (
                <Check className="h-3 w-3" />
              )}
              {selectedOrganization.has_active_subscription
                ? "Active"
                : "Inactive"}
            </span>
          </p>

          <p className="flex items-center justify-between gap-3">
            <span>Discord</span>
            <span
              className={
                selectedOrganization.has_discord_access
                  ? "inline-flex items-center gap-1 font-medium text-emerald-300"
                  : "font-medium text-amber-300"
              }
            >
              {selectedOrganization.has_discord_access && (
                <Check className="h-3 w-3" />
              )}
              {selectedOrganization.has_discord_access
                ? "Connected"
                : "Not Connected"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}