"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type ProfileRow = {
  id: string;
  email: string | null;
  org_id: string | null;
  role: string | null;
  account_type?: string | null;
  company_name?: string | null;
  status?: string | null;
};

type VendorRow = {
  id: string;
  org_id: string | null;
  email: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  website: string | null;
  vendor_category: string | null;
  trade_services: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  onboarding_status?: string | null;
  onboarding_completed_at?: string | null;
  license_number?: string | null;
  license_type?: string | null;
  insurance_expiration?: string | null;
};

type DashboardCounts = {
  invitedProjects: number;
  siteVisits: number;
  estimates: number;
  invoices: number;
};

const EMPTY_COUNTS: DashboardCounts = {
  invitedProjects: 0,
  siteVisits: 0,
  estimates: 0,
  invoices: 0,
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeLower(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function isAdminRole(role: string | null | undefined) {
  const normalized = String(role || "").trim().toLowerCase();

  return (
    normalized === "master_admin" ||
    normalized === "super_admin" ||
    normalized === "admin" ||
    normalized === "project_manager"
  );
}

function isVendorAccount(accountType: string | null | undefined) {
  return String(accountType || "").trim().toLowerCase() === "vendor";
}

function isActiveStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase() === "active";
}

function isVendorRecordActive(vendor: VendorRow | null) {
  if (!vendor) return false;
  if (vendor.is_active === true) return true;
  if (vendor.active === true) return true;
  return false;
}

function isVendorOnboardingComplete(vendor: VendorRow | null) {
  if (!vendor) return false;

  const onboardingStatus = normalizeLower(vendor.onboarding_status);

  if (onboardingStatus === "complete") {
    return true;
  }

  if (normalizeString(vendor.onboarding_completed_at)) {
    return true;
  }

  return Boolean(
    normalizeString(vendor.license_number) &&
      normalizeString(vendor.license_type) &&
      normalizeString(vendor.insurance_expiration)
  );
}

export default function VendorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [vendor, setVendor] = useState<VendorRow | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setRedirecting(false);
    setError(null);
    setInfo(null);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message || "Unable to resolve session.");
      }

      const sessionUser = sessionData.session?.user;

      if (!sessionUser?.id) {
        router.push("/auth/signin?redirect=/vendor/dashboard");
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, org_id, role, account_type, company_name, status")
        .eq("id", sessionUser.id)
        .single();

      if (profileError) {
        throw new Error(profileError.message || "Unable to load profile.");
      }

      const currentProfile = profileRow as ProfileRow;

      if (!currentProfile?.id) {
        throw new Error("No profile found for the signed-in user.");
      }

      if (!isActiveStatus(currentProfile.status)) {
        setRedirecting(true);
        router.push("/unauthorized");
        return;
      }

      if (!currentProfile.org_id) {
        throw new Error("Your profile is missing an org_id.");
      }

      const adminAccess = isAdminRole(currentProfile.role);
      const vendorAccess = isVendorAccount(currentProfile.account_type);

      if (!adminAccess && !vendorAccess) {
        setRedirecting(true);
        router.push("/unauthorized");
        return;
      }

      setProfile(currentProfile);

      if (vendorAccess && !adminAccess) {
        const profileEmail =
          normalizeLower(currentProfile.email) ||
          normalizeLower(sessionUser.email);

        if (!profileEmail) {
          setRedirecting(true);
          router.push("/vendor/onboarding");
          return;
        }

        const { data: vendorRows, error: vendorError } = await supabase
          .from("infrastructure_vendors")
          .select(
            `
              id,
              org_id,
              email,
              company_name,
              contact_name,
              phone,
              website,
              vendor_category,
              trade_services,
              active,
              is_active,
              onboarding_status,
              onboarding_completed_at,
              license_number,
              license_type,
              insurance_expiration
            `
          )
          .eq("org_id", currentProfile.org_id)
          .eq("email", profileEmail)
          .limit(2);

        if (vendorError) {
          throw new Error(
            vendorError.message || "Unable to load vendor record."
          );
        }

        if ((vendorRows?.length ?? 0) > 1) {
          throw new Error(
            "Multiple vendor records matched this login. Please contact support."
          );
        }

        const currentVendor =
          (vendorRows?.[0] as VendorRow | undefined) ?? null;

        setVendor(currentVendor);

        if (!currentVendor?.id) {
          setRedirecting(true);
          router.push("/vendor/onboarding");
          return;
        }

        if (!isVendorRecordActive(currentVendor)) {
          setRedirecting(true);
          router.push("/unauthorized");
          return;
        }

        if (!isVendorOnboardingComplete(currentVendor)) {
          setRedirecting(true);
          router.push("/vendor/onboarding");
          return;
        }

        setCounts(EMPTY_COUNTS);
        setInfo(
          "Your vendor account is active. Vendor-scoped dashboard counts will appear here once assignment-level vendor filtering is enabled."
        );
        return;
      }

      setVendor(null);

      const orgId = currentProfile.org_id;

      const invitedProjectsPromise = supabase
        .from("infrastructure_project_vendors")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      const siteVisitsPromise = supabase
        .from("infrastructure_site_visits")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      const estimatesPromise = supabase
        .from("infrastructure_estimates")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      const invoicesPromise = supabase
        .from("infrastructure_invoices")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      const [
        { count: invitedProjectsCount, error: invitedProjectsError },
        { count: siteVisitsCount, error: siteVisitsError },
        { count: estimatesCount, error: estimatesError },
        { count: invoicesCount, error: invoicesError },
      ] = await Promise.all([
        invitedProjectsPromise,
        siteVisitsPromise,
        estimatesPromise,
        invoicesPromise,
      ]);

      if (invitedProjectsError) {
        throw new Error(
          invitedProjectsError.message ||
            "Failed to load invited projects count."
        );
      }

      if (siteVisitsError) {
        throw new Error(
          siteVisitsError.message || "Failed to load site visits count."
        );
      }

      if (estimatesError) {
        throw new Error(
          estimatesError.message || "Failed to load estimates count."
        );
      }

      if (invoicesError) {
        throw new Error(
          invoicesError.message || "Failed to load invoices count."
        );
      }

      setCounts({
        invitedProjects: invitedProjectsCount || 0,
        siteVisits: siteVisitsCount || 0,
        estimates: estimatesCount || 0,
        invoices: invoicesCount || 0,
      });
    } catch (err: any) {
      console.error("VENDOR_DASHBOARD_LOAD_ERROR:", err);
      setError(err?.message || "Failed to load vendor dashboard.");
      setCounts(EMPTY_COUNTS);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const adminAccess = useMemo(() => isAdminRole(profile?.role), [profile?.role]);
  const vendorAccess = useMemo(
    () => isVendorAccount(profile?.account_type),
    [profile?.account_type]
  );

  if (redirecting) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          Redirecting to the correct vendor page...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-200">
            Vendor Dashboard
          </h1>
          <p className="mt-2 text-slate-400">
            Track invited projects, site visits, estimates, invoices, and required documents.
          </p>

          {profile ? (
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>Role: {profile.role || "unknown"}</p>
              <p>Account Type: {profile.account_type || "unknown"}</p>
              <p>Org: {profile.org_id || "missing"}</p>
              <p>
                Access Mode:{" "}
                {adminAccess
                  ? "Org-wide admin access"
                  : vendorAccess
                  ? "Vendor-scoped access"
                  : "Unknown"}
              </p>
              <p>
                Company:{" "}
                {vendor?.company_name || profile.company_name || "unknown"}
              </p>
            </div>
          ) : null}
        </div>

        <button
          onClick={loadDashboard}
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-2xl border border-sky-800 bg-sky-900/20 p-4 text-sm text-sky-200">
          {info}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Invited Projects"
          value={loading ? "..." : String(counts.invitedProjects)}
          helper={
            adminAccess
              ? "All project vendor assignments in your org"
              : "Projects open for your review"
          }
        />
        <DashboardCard
          label="Site Visits"
          value={loading ? "..." : String(counts.siteVisits)}
          helper={
            adminAccess
              ? "All site visits in your org"
              : "Requested or scheduled walkthroughs"
          }
        />
        <DashboardCard
          label="Estimates"
          value={loading ? "..." : String(counts.estimates)}
          helper={
            adminAccess
              ? "All estimates in your org"
              : "Draft, submitted, and reviewed bids"
          }
        />
        <DashboardCard
          label="Invoices"
          value={loading ? "..." : String(counts.invoices)}
          helper={
            adminAccess
              ? "All invoices in your org"
              : "Submitted and payment-tracked invoices"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-200">
            Vendor Workspace
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Use the vendor portal to review project opportunities, respond to site visit requests,
            submit estimates, upload invoices, and keep your vendor information current.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link
              href="/vendor/projects"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              View Projects
            </Link>

            <Link
              href="/vendor/site-visits"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              View Site Visits
            </Link>

            <Link
              href="/vendor/estimates"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Manage Estimates
            </Link>

            <Link
              href="/vendor/invoices"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Manage Invoices
            </Link>

            <Link
              href="/vendor/documents"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Upload Documents
            </Link>

            <Link
              href="/vendor/profile"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Update Profile
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-200">
            Getting Started
          </h2>

          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p>1. Review any invited projects assigned to your company.</p>
            <p>2. Confirm or complete requested site visits.</p>
            <p>3. Submit your estimate for open opportunities.</p>
            <p>4. Upload invoices for awarded and completed work.</p>
            <p>5. Keep your profile and documents up to date.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}