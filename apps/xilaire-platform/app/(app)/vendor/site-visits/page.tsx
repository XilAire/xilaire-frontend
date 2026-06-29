"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type SiteVisitRow = {
  id: string;
  vendor_id: string | null;
  project_id: string;
  status: string | null;
  visit_date: string | null;
  visit_time_start: string | null;
  visit_time_end: string | null;
  notes: string | null;
  outcome: string | null;
  created_at: string | null;
  project_name: string;
  client_name: string;
  vendor_name: string;
};

type ProfileAccessRow = {
  account_type: string | null;
  role: string | null;
  org_id: string | null;
  email: string | null;
};

type VendorAccessRow = {
  id: string;
  company_name: string | null;
  email: string | null;
};

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString();
}

function formatTime(value: string | null) {
  if (!value) return "";

  const [hours, minutes] = value.split(":");
  const h = Number(hours);
  const suffix = h >= 12 ? "PM" : "AM";
  const normalizedHour = h % 12 || 12;

  return `${normalizedHour}:${minutes} ${suffix}`;
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start && !end) return "Time not set";
  if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
  if (start) return formatTime(start);
  return formatTime(end);
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "super_admin", "admin", "project_manager"].includes(
    String(role || "").trim().toLowerCase()
  );
}

function isVendorAccount(accountType: string | null | undefined) {
  return String(accountType || "").trim().toLowerCase() === "vendor";
}

function isVendorRole(role: string | null | undefined) {
  return String(role || "").trim().toLowerCase() === "vendor";
}

function isVendorUser(profile: ProfileAccessRow | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function asSingleObject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

async function resolveVendorForUser(params: {
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null;
}) {
  const authEmail = normalizeEmail(params.authEmail);
  const profileEmail = normalizeEmail(params.profileEmail);
  const lookupEmail = authEmail || profileEmail;

  if (!lookupEmail) {
    throw new Error("Your vendor account is missing an email address.");
  }

  const { data: vendorRows, error: vendorError } = await supabase
    .from("infrastructure_vendors")
    .select("id, company_name, email")
    .eq("org_id", params.orgId)
    .ilike("email", lookupEmail)
    .limit(2);

  if (vendorError) {
    console.error("VENDOR_SITE_VISITS_VENDOR_LOOKUP_ERROR:", vendorError);
    throw new Error("Unable to load the vendor company for this account.");
  }

  const vendor = (vendorRows?.[0] || null) as VendorAccessRow | null;

  if (!vendor) {
    throw new Error(
      "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match your profile email."
    );
  }

  return vendor;
}

export default function VendorSiteVisitsPage() {
  const [loading, setLoading] = useState(true);
  const [siteVisits, setSiteVisits] = useState<SiteVisitRow[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);
  const [isVendorView, setIsVendorView] = useState(false);
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSiteVisits() {
      try {
        setLoading(true);
        setError(null);
        setSiteVisits([]);
        setVendorName("");
        setIsAdminView(false);
        setIsVendorView(false);
        setResolvedVendorId(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Unable to load user.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_type, role, org_id, email")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Unable to load profile.");
        }

        const typedProfile = profile as ProfileAccessRow;
        const vendorView = isVendorUser(typedProfile);
        const adminView = isAdminRole(typedProfile.role);

        if (!vendorView && !adminView) {
          throw new Error("You do not have access to vendor site visits.");
        }

        if (!typedProfile.org_id) {
          throw new Error("Your account is missing org context.");
        }

        setIsAdminView(adminView);
        setIsVendorView(vendorView);

        let vendorId: string | null = null;

        if (vendorView && !adminView) {
          const vendor = await resolveVendorForUser({
            orgId: typedProfile.org_id,
            authEmail: user.email || null,
            profileEmail: typedProfile.email,
          });

          vendorId = vendor.id;
          setResolvedVendorId(vendor.id);
          setVendorName(vendor.company_name || "your company");
        }

        let query = supabase
          .from("infrastructure_site_visits")
          .select(`
            id,
            vendor_id,
            project_id,
            status,
            visit_date,
            visit_time_start,
            visit_time_end,
            notes,
            outcome,
            created_at,
            project:infrastructure_projects (
              id,
              project_name,
              client_name
            ),
            vendor:infrastructure_vendors (
              id,
              company_name
            )
          `);

        if (vendorId) {
          query = query.eq("vendor_id", vendorId);
        } else {
          query = query.eq("org_id", typedProfile.org_id);
        }

        const { data, error: siteVisitError } = await query;

        if (siteVisitError) {
          console.error("VENDOR_SITE_VISITS_QUERY_ERROR:", siteVisitError);
          throw new Error("Failed to load site visits.");
        }

        const mapped: SiteVisitRow[] =
          data?.flatMap((row: any) => {
            const project = asSingleObject<any>(row.project);
            const vendor = asSingleObject<any>(row.vendor);

            if (!row?.id || !row?.project_id) return [];

            return [
              {
                id: row.id,
                vendor_id: row.vendor_id || null,
                project_id: row.project_id,
                status: row.status || "requested",
                visit_date: row.visit_date || null,
                visit_time_start: row.visit_time_start || null,
                visit_time_end: row.visit_time_end || null,
                notes: row.notes || null,
                outcome: row.outcome || null,
                created_at: row.created_at || null,
                project_name:
                  project?.project_name || row.project_name || "Untitled Project",
                client_name:
                  project?.client_name || row.client_name || "Unknown Client",
                vendor_name:
                  vendor?.company_name || row.vendor_name || "Unknown Vendor",
              },
            ];
          }) || [];

        mapped.sort((a, b) => {
          const aTime = a.visit_date ? new Date(a.visit_date).getTime() : 0;
          const bTime = b.visit_date ? new Date(b.visit_date).getTime() : 0;
          return bTime - aTime;
        });

        if (!cancelled) {
          setSiteVisits(mapped);
        }
      } catch (err: any) {
        console.error("VENDOR_SITE_VISITS_ERROR:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load site visits.");
          setSiteVisits([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSiteVisits();

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    return siteVisits.reduce(
      (acc, visit) => {
        const status = visit.status || "requested";

        if (status === "requested") acc.requested += 1;
        if (status === "scheduled") acc.scheduled += 1;
        if (status === "confirmed") acc.confirmed += 1;
        if (status === "completed") acc.completed += 1;
        if (status === "cancelled") acc.cancelled += 1;

        return acc;
      },
      {
        requested: 0,
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      }
    );
  }, [siteVisits]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-200">
          Vendor Site Visits
        </h1>

        <p className="text-slate-400">
          {isAdminView
            ? "Admin view of all vendor site visits."
            : `Site visits assigned to ${vendorName || "your company"}.`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Requested" value={counts.requested} />
        <SummaryCard label="Scheduled" value={counts.scheduled} />
        <SummaryCard label="Confirmed" value={counts.confirmed} />
        <SummaryCard label="Completed" value={counts.completed} />
        <SummaryCard label="Cancelled" value={counts.cancelled} />
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading site visits...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && siteVisits.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No site visits found.
        </div>
      )}

      {!loading && !error && siteVisits.length > 0 && (
        <div className="grid gap-4">
          {siteVisits.map((visit) => (
            <div
              key={visit.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      {visit.project_name}
                    </h2>
                    <p className="text-sm text-slate-400">
                      Client: {visit.client_name}
                    </p>
                    {isAdminView && (
                      <p className="text-xs text-slate-500 mt-1">
                        Vendor: {visit.vendor_name}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {formatStatus(visit.status)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {formatDate(visit.visit_date)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {formatTimeRange(
                        visit.visit_time_start,
                        visit.visit_time_end
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-slate-500 md:text-right">
                  <p>Created</p>
                  <p className="text-slate-300">
                    {formatDate(visit.created_at)}
                  </p>
                </div>
              </div>

              {(visit.notes || visit.outcome) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {visit.notes || "No notes provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Outcome
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {visit.outcome || "No outcome recorded."}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Link
                  href={`/vendor/projects/${visit.project_id}`}
                  className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Open Project
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}