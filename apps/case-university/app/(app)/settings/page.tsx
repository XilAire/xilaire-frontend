import Link from "next/link";
import { redirect } from "next/navigation";

import SettingsEditor from "@/components/university/SettingsEditor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUniversityAccess } from "@/lib/university/entitlements";
import { getCurrentUserProfileSettings } from "@/lib/university/profile-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function SettingsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2.9h4V3a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.3.8.6 1 .3.3.6.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1Z" />
    </svg>
  );
}

function formatTier(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Free";
}

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin?redirect=/settings");

  const [universityAccess, profileSettings] = await Promise.all([
    getCurrentUniversityAccess(),
    getCurrentUserProfileSettings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]"><SettingsIcon /></div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">Account</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">Settings</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Manage your learner-controlled CASE University preferences. Subscription, role, and entitlement data remain authoritative and read-only.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Preferences</p>
          <div className="mt-5">
            <SettingsEditor theme={profileSettings.profile.theme} preferences={profileSettings.preferences} />
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Account details</p>
            <dl className="mt-5 divide-y divide-[var(--border-subtle)]">
              <Row label="Email" value={user.email ?? "Not available"} />
              <Row label="University tier" value={formatTier(universityAccess.tier)} />
            </dl>
            <Link href="/profile" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)]">
              View profile
            </Link>
          </article>

          <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Learning access</p>
            <div className="mt-5 space-y-3">
              <AccessRow label="Learning dashboard" enabled={universityAccess.entitlements.learning_dashboard} />
              <AccessRow label="Progress tracking" enabled={universityAccess.entitlements.basic_progress_tracking} />
              <AccessRow label="Downloadable resources" enabled={universityAccess.entitlements.downloadable_resources} />
              <AccessRow label="Course certificates" enabled={universityAccess.entitlements.course_certificates} />
            </div>
          </article>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Quick links</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            ["/courses", "Courses"],
            ["/learning", "My Learning"],
            ["/practice", "Practice"],
            ["/progress", "Progress"],
            ["/certificates", "Certificates"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-default)]">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr]">
      <dt className="text-sm font-semibold text-[var(--text-secondary)]">{label}</dt>
      <dd className="break-all text-sm font-bold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function AccessRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      <span className={[
        "rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]",
        enabled ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-[var(--surface-default)] text-[var(--text-muted)]",
      ].join(" ")}>
        {enabled ? "Available" : "Locked"}
      </span>
    </div>
  );
}
