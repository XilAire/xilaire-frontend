"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type VendorListItem = {
  id: string;
  company_name: string | null;
  vendor_category: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
};

type ProfileRow = {
  account_type: string | null;
  role: string | null;
  org_id: string | null;
  email: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString();
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: string | null | undefined) {
  if (!value || !value.trim()) return "Not provided";
  return value;
}

function formatYesNo(value: boolean | null | undefined) {
  if (value == null) return "Not set";
  return value ? "Yes" : "No";
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

export default function VendorProfileListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [vendors, setVendors] = useState<VendorListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadVendorProfiles() {
      try {
        setLoading(true);
        setError(null);
        setVendors([]);
        setIsAdminView(false);

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

        const currentProfile = profile as ProfileRow;
        const vendorAccess = currentProfile.account_type === "vendor";
        const adminAccess = isAdminRole(currentProfile.role);

        if (!vendorAccess && !adminAccess) {
          throw new Error("You do not have access to vendor profiles.");
        }

        if (!currentProfile.org_id) {
          throw new Error("Vendor profile is missing org context.");
        }

        const normalizedEmail = String(
          currentProfile.email || user.email || ""
        )
          .trim()
          .toLowerCase();

        if (adminAccess) {
          setIsAdminView(true);

          const { data: vendorRecords, error: vendorError } = await supabase
            .from("infrastructure_vendors")
            .select(`
              id,
              company_name,
              vendor_category,
              contact_name,
              email,
              phone,
              active,
              is_active,
              created_at
            `)
            .eq("org_id", currentProfile.org_id)
            .order("company_name", { ascending: true });

          if (vendorError) {
            console.error("VENDOR_PROFILE_LIST_LOOKUP_ERROR:", vendorError);
            throw new Error("Unable to load vendor profiles.");
          }

          if (!cancelled) {
            setVendors((vendorRecords || []) as VendorListItem[]);
          }

          return;
        }

        const { data: vendorRecord, error: vendorError } = await supabase
          .from("infrastructure_vendors")
          .select(`
            id,
            company_name,
            vendor_category,
            contact_name,
            email,
            phone,
            active,
            is_active,
            created_at
          `)
          .eq("org_id", currentProfile.org_id)
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (vendorError) {
          console.error("VENDOR_PROFILE_SELF_LOOKUP_ERROR:", vendorError);
          throw new Error("Unable to load your vendor profile.");
        }

        if (!cancelled) {
          setVendors(vendorRecord ? [vendorRecord as VendorListItem] : []);
        }
      } catch (err: any) {
        console.error("VENDOR_PROFILE_LIST_ERROR:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load vendor profiles.");
          setVendors([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVendorProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalProfilesLabel = useMemo(() => {
    if (loading) return "Loading vendor profiles...";
    if (vendors.length === 1) return "1 vendor profile";
    return `${vendors.length} vendor profiles`;
  }, [loading, vendors.length]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-200">
          Vendor Profiles
        </h1>

        <p className="text-slate-400">
          {isAdminView
            ? "Admin view of all vendor profiles for this organization."
            : "View your vendor company profile and current account details."}
        </p>

        <p className="mt-2 text-sm text-slate-500">{totalProfilesLabel}</p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading vendor profiles...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && vendors.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No vendor profiles found.
        </div>
      )}

      {!loading && !error && vendors.length > 0 && (
        <div className="grid gap-4">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/vendor/profile/${vendor.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-sky-600 hover:bg-slate-900/70"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {vendor.company_name || "Unnamed Vendor"}
                  </h2>

                  <p className="text-sm text-slate-400">
                    Category: {formatLabel(vendor.vendor_category)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      Contact: {formatValue(vendor.contact_name)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      Email: {formatValue(vendor.email)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      Phone: {formatValue(vendor.phone)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 md:text-right">
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      Active: {formatYesNo(vendor.active)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      Enabled: {formatYesNo(vendor.is_active)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Created {formatDate(vendor.created_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}