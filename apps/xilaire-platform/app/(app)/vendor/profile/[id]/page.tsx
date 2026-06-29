"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type VendorProfile = {
  id: string;
  company_name: string | null;
  license_number: string | null;
  license_type: string | null;
  insurance_expiration: string | null;
  active: boolean | null;
  created_at: string | null;
  vendor_category: string | null;
  service_types: string[] | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_active: boolean | null;
  notes: string | null;
  trade_services?: string | null;
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

function formatValue(value: string | null | undefined) {
  if (!value || !value.trim()) return "Not provided";
  return value;
}

function formatYesNo(value: boolean | null | undefined) {
  if (value == null) return "Not set";
  return value ? "Yes" : "No";
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function VendorProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVendorProfile() {
      try {
        setLoading(true);
        setError(null);
        setVendor(null);
        setIsAdminView(false);

        if (!vendorId || typeof vendorId !== "string") {
          throw new Error("Invalid vendor id.");
        }

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
          throw new Error("You do not have access to vendor profile details.");
        }

        if (!currentProfile.org_id) {
          throw new Error("Vendor profile is missing org context.");
        }

        if (adminAccess) {
          setIsAdminView(true);

          const { data: vendorRecord, error: vendorError } = await supabase
            .from("infrastructure_vendors")
            .select(`
              id,
              company_name,
              license_number,
              license_type,
              insurance_expiration,
              active,
              created_at,
              vendor_category,
              service_types,
              contact_name,
              phone,
              email,
              website,
              is_active,
              notes,
              trade_services
            `)
            .eq("id", vendorId)
            .eq("org_id", currentProfile.org_id)
            .maybeSingle();

          if (vendorError) {
            console.error("VENDOR_PROFILE_DETAIL_LOOKUP_ERROR:", vendorError);
            throw new Error("Unable to load the vendor profile.");
          }

          if (!vendorRecord) {
            throw new Error("Vendor profile was not found.");
          }

          if (!cancelled) {
            setVendor(vendorRecord as VendorProfile);
          }

          return;
        }

        const normalizedEmail = String(
          currentProfile.email || user.email || ""
        )
          .trim()
          .toLowerCase();

        if (!normalizedEmail) {
          throw new Error("Vendor email is missing from your account.");
        }

        const { data: vendorRecord, error: vendorError } = await supabase
          .from("infrastructure_vendors")
          .select(`
            id,
            company_name,
            license_number,
            license_type,
            insurance_expiration,
            active,
            created_at,
            vendor_category,
            service_types,
            contact_name,
            phone,
            email,
            website,
            is_active,
            notes,
            trade_services
          `)
          .eq("id", vendorId)
          .eq("org_id", currentProfile.org_id)
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (vendorError) {
          console.error("VENDOR_PROFILE_DETAIL_SELF_LOOKUP_ERROR:", vendorError);
          throw new Error("Unable to load your vendor profile.");
        }

        if (!vendorRecord) {
          throw new Error("You do not have access to this vendor profile.");
        }

        if (!cancelled) {
          setVendor(vendorRecord as VendorProfile);
        }
      } catch (err: any) {
        console.error("VENDOR_PROFILE_DETAIL_ERROR:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load vendor profile.");
          setVendor(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVendorProfile();

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const serviceTypes = useMemo(() => {
    if (!vendor?.service_types || !Array.isArray(vendor.service_types)) {
      return [];
    }

    return vendor.service_types;
  }, [vendor]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Link
          href="/vendor/profile"
          className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to Vendor Profiles
        </Link>

        <h1 className="text-2xl font-semibold text-slate-200">
          Vendor Profile
        </h1>

        <p className="text-slate-400">
          {isAdminView
            ? "Admin view of the selected vendor company profile."
            : "Vendor company profile details."}
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading vendor profile...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && vendor && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  {vendor.company_name || "Unnamed Vendor"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Category: {formatLabel(vendor.vendor_category)}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Trade / Services: {formatValue(vendor.trade_services)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  Active: {formatYesNo(vendor.active)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  Enabled: {formatYesNo(vendor.is_active)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Contact Name" value={formatValue(vendor.contact_name)} />
            <InfoCard label="Phone" value={formatValue(vendor.phone)} />
            <InfoCard label="Email" value={formatValue(vendor.email)} />
            <InfoCard label="Website" value={formatValue(vendor.website)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="License Number" value={formatValue(vendor.license_number)} />
            <InfoCard label="License Type" value={formatLabel(vendor.license_type)} />
            <InfoCard
              label="Insurance Expiration"
              value={formatDate(vendor.insurance_expiration)}
            />
            <InfoCard label="Created" value={formatDate(vendor.created_at)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
              <h3 className="text-lg font-semibold text-slate-100">
                Service Types
              </h3>

              {serviceTypes.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  No service types are listed for this vendor yet.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {serviceTypes.map((service) => (
                    <span
                      key={`${vendor.id}-${service}`}
                      className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300"
                    >
                      {formatLabel(service)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-slate-100">
                Profile Status
              </h3>

              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <p>Company: {formatValue(vendor.company_name)}</p>
                <p>Category: {formatLabel(vendor.vendor_category)}</p>
                <p>License On File: {formatYesNo(!!vendor.license_number)}</p>
                <p>
                  Insurance Date Set: {formatYesNo(!!vendor.insurance_expiration)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-slate-100">Notes</h3>
            <p className="mt-3 text-sm text-slate-400">
              {vendor.notes?.trim()
                ? vendor.notes
                : "No vendor notes have been added yet."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-slate-200">{value}</p>
    </div>
  );
}