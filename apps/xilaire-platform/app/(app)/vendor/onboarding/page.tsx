"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

function normalizeString(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : "";
}

export default function VendorOnboardingPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [insuranceExpiration, setInsuranceExpiration] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user?.email) {
        setMessage("Unable to load your vendor account. Please sign in again.");
        setLoadingUser(false);
        return;
      }

      setEmail(data.user.email);
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const normalizedLicenseNumber = normalizeString(licenseNumber);
    const normalizedLicenseType = normalizeString(licenseType);
    const normalizedInsuranceExpiration = normalizeString(insuranceExpiration);
    const normalizedNotes = normalizeString(notes);

    if (!email) {
      setMessage("Vendor email is missing.");
      return;
    }

    if (!normalizedLicenseNumber) {
      setMessage("License number is required.");
      return;
    }

    if (!normalizedLicenseType) {
      setMessage("License type is required.");
      return;
    }

    if (!normalizedInsuranceExpiration) {
      setMessage("Insurance expiration is required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setSaving(false);
        setMessage("Unable to verify your session. Please sign in again.");
        return;
      }

      const res = await fetch("/api/vendor/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          license_number: normalizedLicenseNumber,
          license_type: normalizedLicenseType,
          insurance_expiration: normalizedInsuranceExpiration,
          notes: normalizedNotes || null,
        }),
      });

      const data = await res.json();

      setSaving(false);

      if (!res.ok) {
        setMessage(data.error || "Failed to save vendor onboarding.");
        return;
      }

      setMessage("✓ Vendor profile completed successfully.");

      setTimeout(() => {
        router.push("/vendor/dashboard");
      }, 800);
    } catch (error) {
      console.error("VENDOR_ONBOARDING_SAVE_ERROR:", error);
      setSaving(false);
      setMessage("Failed to save vendor onboarding.");
    }
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-xl text-slate-300">
          Loading vendor onboarding...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-lg shadow-xl">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">
            Complete Your Vendor Profile
          </h1>
          <p className="text-sm text-slate-400">
            Add your licensing and insurance details to finish onboarding.
          </p>
          <p className="text-xs text-slate-500">
            Signed in as: {email || "Unknown vendor"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="License Number"
            className="w-full auth-input"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            disabled={saving}
          />

          <input
            type="text"
            placeholder="License Type"
            className="w-full auth-input"
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            disabled={saving}
          />

          <input
            type="date"
            className="w-full auth-input"
            value={insuranceExpiration}
            onChange={(e) => setInsuranceExpiration(e.target.value)}
            disabled={saving}
          />

          <textarea
            placeholder="Notes (optional)"
            className="w-full auth-input min-h-[120px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
          />

          <button className="auth-btn w-full" disabled={saving} type="submit">
            {saving ? "Saving..." : "Complete Vendor Profile"}
          </button>

          {message && (
            <p className="text-center text-sm text-slate-300 mt-2">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}