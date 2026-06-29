// apps/xilaire-security/app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

// Brand colors (match your logo)
const brand = {
  navy: "#0A233F",
  gold: "#C8962E",
};

// Env guards
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;
if (!URL || !ANON) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL_SECURITY or NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY"
  );
}

const supabase = createClient(URL, ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  email: string | null;
};

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Load current user + profile
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        setLoadError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      const currentSession = sessionData.session ?? null;
      setSession(currentSession);

      if (!currentSession) {
        setLoadError("You must be signed in to view your profile.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, email")
        .eq("id", currentSession.user.id)
        .maybeSingle<ProfileRow>();

      if (error) {
        console.error("Error loading profile:", error);
        setLoadError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (!data) {
        setLoadError("Profile not found.");
        setLoading(false);
        return;
      }

      setProfile(data);
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setLoading(false);
    };

    void load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !profile) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)
      .select("id, full_name, phone, role, email")
      .maybeSingle<ProfileRow>();

    if (error) {
      console.error("Error updating profile:", error);
      setSaveError("Could not save your changes. Please try again.");
      setSaving(false);
      return;
    }

    if (data) {
      setProfile(data);
      setSaveSuccess("Profile updated successfully.");
    }
    setSaving(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header (no extra nav) */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: brand.navy }}>
            Profile &amp; Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your contact information and view your account status.
          </p>
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <p className="text-sm text-gray-500">Loading your profile…</p>
      )}

      {!loading && loadError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!loading && !loadError && profile && (
        <div className="space-y-6">
          {/* Account Summary Card */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: brand.navy }}
                >
                  Account overview
                </h2>
                <p className="text-xs text-gray-500">
                  Signed in as{" "}
                  <span className="font-medium">
                    {profile.email ?? "Unknown"}
                  </span>
                </p>
              </div>

              {profile.role && (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: "#FFF7E6",
                    color: brand.navy,
                    border: `1px solid ${brand.gold}`,
                  }}
                >
                  {profile.role === "admin" ? "Admin" : "Student"}
                </span>
              )}
            </div>
          </section>

          {/* Editable Fields Card */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2
              className="mb-4 text-base font-semibold"
              style={{ color: brand.navy }}
            >
              Contact details
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name as it should appear on certificates"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Email (used for login)
                </label>
                <input
                  type="email"
                  value={profile.email ?? ""}
                  disabled
                  className="rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  For email changes, please contact XilAire Security support.
                </p>
              </div>

              {/* Save / Status */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs">
                  {saveError && (
                    <span className="text-red-600">{saveError}</span>
                  )}
                  {saveSuccess && (
                    <span className="text-emerald-600">{saveSuccess}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm"
                  style={{
                    background: `linear-gradient(90deg, ${brand.gold}, ${brand.navy})`,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
