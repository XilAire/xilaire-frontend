"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type AccessProfile = {
  account_type: string | null;
  role: string | null;
  status: string | null;
  org_id: string | null;
  email: string | null;
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role: string | null | undefined) {
  const r = normalize(role);

  return (
    r === "master_admin" ||
    r === "super_admin" ||
    r === "admin" ||
    r === "project_manager"
  );
}

export default function VendorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [debugReason, setDebugReason] = useState<string | null>(null);
  const [debugProfile, setDebugProfile] = useState<AccessProfile | null>(null);
  const [debugUserId, setDebugUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function validateVendorAccess() {
      try {
        setAuthChecked(false);
        setAllowed(false);
        setDebugReason(null);
        setDebugProfile(null);
        setDebugUserId(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) {
            router.replace(
              `/auth/signin?redirect=${encodeURIComponent(
                pathname || "/vendor/dashboard"
              )}`
            );
          }
          return;
        }

        if (!cancelled) {
          setDebugUserId(user.id);
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_type, role, status, org_id, email")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error("VENDOR_LAYOUT_PROFILE_ERROR:", profileError);

          if (!cancelled) {
            setDebugReason(
              `Profile lookup failed: ${profileError?.message || "No profile returned."}`
            );
            setAuthChecked(true);
          }
          return;
        }

        const typedProfile = profile as AccessProfile;

        if (!cancelled) {
          setDebugProfile(typedProfile);
        }

        const accountType = normalize(typedProfile.account_type);
        const role = normalize(typedProfile.role);
        const status = normalize(typedProfile.status);
        const orgId = normalize(typedProfile.org_id);

        const vendorAccess = accountType === "vendor";
        const adminAccess = isAdminRole(role);

        if (status !== "active") {
          if (!cancelled) {
            setDebugReason(
              `Blocked because profile.status is "${typedProfile.status ?? "null"}", expected "active".`
            );
            setAuthChecked(true);
          }
          return;
        }

        if (!orgId) {
          if (!cancelled) {
            setDebugReason("Blocked because profile.org_id is missing.");
            setAuthChecked(true);
          }
          return;
        }

        if (!vendorAccess && !adminAccess) {
          if (!cancelled) {
            setDebugReason(
              `Blocked because account_type="${typedProfile.account_type ?? "null"}" and role="${typedProfile.role ?? "null"}" do not qualify for vendor routes.`
            );
            setAuthChecked(true);
          }
          return;
        }

        if (!cancelled) {
          setAllowed(true);
          setAuthChecked(true);
        }
      } catch (error: any) {
        console.error("VENDOR_LAYOUT_AUTH_ERROR:", error);

        if (!cancelled) {
          setDebugReason(
            error?.message || "Unexpected vendor layout auth error."
          );
          setAuthChecked(true);
        }
      }
    }

    validateVendorAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 text-sm text-slate-300">
          Loading vendor portal...
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6">
            <h1 className="text-xl font-semibold text-rose-300">
              Vendor layout blocked access
            </h1>
            <p className="mt-3 text-sm text-rose-200">
              {debugReason || "No reason was captured."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">
              Debug context
            </h2>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>User ID: {debugUserId || "unknown"}</p>
              <p>Path: {pathname || "unknown"}</p>
              <p>Profile Email: {debugProfile?.email || "null"}</p>
              <p>Profile Org ID: {debugProfile?.org_id || "null"}</p>
              <p>Profile Status: {debugProfile?.status || "null"}</p>
              <p>Profile Role: {debugProfile?.role || "null"}</p>
              <p>Profile Account Type: {debugProfile?.account_type || "null"}</p>
              <p>
                Normalized Admin Access:{" "}
                {isAdminRole(debugProfile?.role) ? "true" : "false"}
              </p>
              <p>
                Normalized Vendor Access:{" "}
                {normalize(debugProfile?.account_type) === "vendor"
                  ? "true"
                  : "false"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Go to Dashboard
            </button>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-900"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="min-h-screen">{children}</main>
    </div>
  );
}