import Link from "next/link";
import { redirect } from "next/navigation";

import ProfileEditor from "@/components/university/ProfileEditor";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUniversityAccess } from "@/lib/university/entitlements";
import { getCurrentUserProfileSettings } from "@/lib/university/profile-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function UserIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function formatDate(value: string | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function formatTier(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Free";
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin?redirect=/profile");

  const [role, universityAccess, profileSettings] = await Promise.all([
    resolveCurrentUserRole(),
    getCurrentUniversityAccess(),
    getCurrentUserProfileSettings(),
  ]);

  const displayName =
    profileSettings.profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "CASE University learner";

  const roleLabel = role?.role_name
    ? role.role_name.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "Learner";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <UserIcon />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">Profile</p>
            <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-[var(--text-primary)]">{displayName}</h1>
            <p className="mt-2 break-all text-sm text-[var(--text-secondary)]">{user.email ?? "No email address available"}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Edit profile</p>
          <div className="mt-5">
            <ProfileEditor fullName={profileSettings.profile.full_name ?? ""} />
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Account</p>
          <dl className="mt-5 divide-y divide-[var(--border-subtle)]">
            <Row label="Email" value={user.email ?? "Not available"} />
            <Row label="Platform role" value={roleLabel} />
            <Row label="Member since" value={formatDate(user.created_at)} />
            <Row label="University tier" value={formatTier(universityAccess.tier)} />
          </dl>
          <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
            Email, platform role, subscription tier, and entitlements are authoritative account data and cannot be changed from this profile form.
          </p>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">CASE University</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/settings" className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)]">Settings</Link>
          <Link href="/progress" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">Progress</Link>
          <Link href="/certificates" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">Certificates</Link>
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm font-semibold text-[var(--text-secondary)]">{label}</dt>
      <dd className="break-all text-sm font-bold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
