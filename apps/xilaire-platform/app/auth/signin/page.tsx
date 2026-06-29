"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabasePlatformClient";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
  status: string | null;
};

type SignInResponse = {
  error?: string;
  message?: string;
  user?: {
    id?: string;
    email?: string | null;
    aud?: string;
    role?: string;
  } | null;
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number | null;
    expires_in?: number | null;
    token_type?: string | null;
  } | null;
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role: string | null | undefined) {
  const normalized = normalize(role);

  return (
    normalized === "master_admin" ||
    normalized === "super_admin" ||
    normalized === "admin" ||
    normalized === "project_manager"
  );
}

export default function SignInPage() {
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = params.get("redirect");

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setRedirecting(false);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = (await res.json().catch(() => null)) as SignInResponse | null;

      if (!res.ok) {
        setLoading(false);
        setError(data?.error || "Failed to sign in.");
        return;
      }

      const accessToken = data?.session?.access_token;
      const refreshToken = data?.session?.refresh_token;

      if (!accessToken || !refreshToken) {
        setLoading(false);
        setError("Signed in, but no session tokens were returned.");
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (setSessionError) {
        console.error("SIGNIN_SET_SESSION_ERROR:", setSessionError);
        setLoading(false);
        setError(
          setSessionError.message || "Failed to initialize client session."
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        console.error("SIGNIN_GET_USER_ERROR:", userError);
        setLoading(false);
        setError("Signed in, but the client session was not ready.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, role, account_type, org_id, status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        setError(profileError?.message || "Unable to load your profile.");
        return;
      }

      const typedProfile = profile as ProfileRow;
      const status = normalize(typedProfile.status);
      const accountType = normalize(typedProfile.account_type);
      const role = normalize(typedProfile.role);

      setLoading(false);
      setRedirecting(true);

      if (redirectTo) {
        window.location.assign(redirectTo);
        return;
      }

      if (status && status !== "active") {
        window.location.assign("/unauthorized");
        return;
      }

      if (accountType === "vendor") {
        window.location.assign("/vendor/dashboard");
        return;
      }

      if (
        isAdminRole(role) ||
        accountType === "internal" ||
        accountType === "business" ||
        accountType === "individual" ||
        role === "user"
      ) {
        window.location.assign("/dashboard");
        return;
      }

      window.location.assign("/unauthorized");
    } catch (err) {
      console.error("SIGNIN_PAGE_ERROR:", err);
      setLoading(false);
      setRedirecting(false);
      setError("Unexpected error signing in.");
    }
  };

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800">
          <div className="flex justify-center mb-6">
            <Image
              src="/icon-light.png"
              alt="XilAire Logo"
              width={72}
              height={72}
              priority
              className="opacity-95"
            />
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-10 w-10 rounded-full border-4 border-slate-700 border-t-sky-500 animate-spin" />
            <h1 className="text-xl font-semibold text-slate-50">
              Signing you in
            </h1>
            <p className="text-sm text-slate-400">
              Checking your account and sending you to the right place...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-900 p-8 shadow-xl border border-slate-800">
        <div className="flex justify-center mb-6">
          <Image
            src="/icon-light.png"
            alt="XilAire Logo"
            width={72}
            height={72}
            priority
            className="opacity-95"
          />
        </div>

        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-50">
          Sign In
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 px-3 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 py-2 font-medium text-white transition hover:bg-sky-700 disabled:opacity-40"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-400">
          <a
            href="/auth/forgot-password"
            className="text-sky-400 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <div className="mt-2 text-center text-sm text-slate-400">
          Don’t have an account?{" "}
          <a href="/auth/signup" className="text-sky-400 hover:underline">
            Create one
          </a>
        </div>
      </div>
    </div>
  );
}