import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import MarketingLayoutClient from "@/app/(marketing)/MarketingLayoutClient";
import { getPlatformAuditLogs } from "@/lib/getPlatformAuditLogs";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";
import { getPlatformSettings } from "@/lib/platformSettings";
import { requestPlatformSettingChange } from "@/lib/requestPlatformSettingChange";
import { getPendingPlatformSettingChanges } from "@/lib/getPendingPlatformSettingChanges";
import { reviewPlatformSettingChange } from "@/lib/reviewPlatformSettingChange";
import { applyApprovedPlatformSettingChanges } from "@/lib/applyApprovedPlatformSettingChanges";
import { isWithinPlatformApplyWindow } from "@/lib/isWithinPlatformApplyWindow";
import {
  getPlatformApplyWindows,
  getActivePlatformApplyWindow,
} from "@/lib/getPlatformApplyWindows";
import { createPlatformApplyWindow } from "@/lib/createPlatformApplyWindow";
import { closePlatformApplyWindow } from "@/lib/closePlatformApplyWindow";
import PlatformAuditTable from "@/components/admin/PlatformAuditTable";

export const metadata = {
  title: "Platform Settings | XilAire Technologies",
  description:
    "System-wide platform configuration for XilAire Technologies. Restricted to Master Administrators.",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient();

  /* ---------------------------------------------------------
     AUTH — REQUIRE SESSION
  --------------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/signin");
  }

  /* ---------------------------------------------------------
     JWT CONTEXT — OPTION B (SOURCE OF TRUTH)
  --------------------------------------------------------- */
  const { data: jwtContext, error: jwtError } =
    await supabase.rpc("get_jwt_claims");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[ADMIN_SETTINGS_AUTH]");
  console.log("user:", user.email);
  console.log("jwtContext:", jwtContext);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (jwtError || jwtContext?.role !== "master_admin") {
    console.warn("[ADMIN_SETTINGS_DENIED]");
    redirect("/dashboard");
  }

  /* ---------------------------------------------------------
     PROFILE — IDENTITY ONLY (NOT AUTHZ)
  --------------------------------------------------------- */
  const profile = await getProfile();

  // 🔒 NON-BLOCKING AUDIT
  try {
    writePlatformAuditLog({
      action: "Platform settings page accessed",
      actor: profile?.email ?? user.email ?? "system",
    });
  } catch {}

  /* ---------------------------------------------------------
     LOAD DATA
  --------------------------------------------------------- */
  const [
    auditLogs,
    platformSettings,
    pendingChangesRaw,
    withinApplyWindow,
    applyWindows,
    activeApplyWindow,
  ] = await Promise.all([
    getPlatformAuditLogs(),
    getPlatformSettings(),
    getPendingPlatformSettingChanges(),
    isWithinPlatformApplyWindow(),
    getPlatformApplyWindows(),
    getActivePlatformApplyWindow(),
  ]);

  /* ---------------------------------------------------------
     DEDUPE PENDING CHANGES (LATEST PER SETTING)
  --------------------------------------------------------- */
  const pendingChangesMap = new Map<string, any>();
  for (const change of pendingChangesRaw) {
    const existing = pendingChangesMap.get(change.setting_key);
    if (
      !existing ||
      new Date(change.requested_at) > new Date(existing.requested_at)
    ) {
      pendingChangesMap.set(change.setting_key, change);
    }
  }

  const pendingChanges = Array.from(pendingChangesMap.values());

  const approvedUnapplied = pendingChanges.filter(
    (c) => c.approved === true && !c.applied_at
  );

  /* ---------------------------------------------------------
     SERVER ACTIONS
  --------------------------------------------------------- */
  async function requestChange(key: string, value: boolean) {
    "use server";
    await requestPlatformSettingChange({
      key,
      requestedValue: !value,
      reason: "Requested via Platform Settings UI",
    });
  }

  async function reviewChange(id: string, approved: boolean) {
    "use server";
    await reviewPlatformSettingChange({ id, approved });
  }

  async function applyChanges() {
    "use server";
    await applyApprovedPlatformSettingChanges();
  }

  async function openApplyWindow(formData: FormData) {
    "use server";
    const startsAt = formData.get("starts_at") as string;
    const endsAt = formData.get("ends_at") as string;
    await createPlatformApplyWindow(startsAt, endsAt);
  }

  async function closeApplyWindowAction(formData: FormData) {
    "use server";
    const windowId = formData.get("window_id") as string;
    if (!windowId) return;
    await closePlatformApplyWindow(windowId);
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  const minEndTime = new Date(
    Date.now() + 60 * 1000
  ).toISOString().slice(0, 16);

  return (
    <MarketingLayoutClient>
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold">Platform Settings</h1>
          <p className="text-sm text-slate-500">
            Restricted to Master Administrators
          </p>
        </div>

        <div className="rounded-lg border px-4 py-3 text-sm">
          <strong>Apply Window Status:</strong>{" "}
          {withinApplyWindow ? "Active" : "Inactive"}
        </div>

        {/* APPLY WINDOWS */}
        <div className="rounded-xl border bg-white dark:bg-slate-900">
          <div className="border-b px-6 py-4">
            <h2 className="text-sm font-semibold">Apply Windows</h2>
          </div>

          <div className="divide-y">
            {applyWindows.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <p className="text-sm">
                  {new Date(w.starts_at).toLocaleString()} →{" "}
                  {new Date(w.ends_at).toLocaleString()}
                </p>
                <span className="text-xs">
                  {w.active ? "Active" : "Closed"}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t px-6 py-4">
            {!activeApplyWindow ? (
              <form action={openApplyWindow} className="flex gap-3">
                <input type="datetime-local" name="starts_at" required />
                <input
                  type="datetime-local"
                  name="ends_at"
                  required
                  min={minEndTime}
                />
                <button className="bg-indigo-600 px-4 py-1 text-white rounded">
                  Open Apply Window
                </button>
              </form>
            ) : (
              <form action={closeApplyWindowAction}>
                <input
                  type="hidden"
                  name="window_id"
                  value={activeApplyWindow.id}
                />
                <button className="bg-rose-600 px-4 py-1 text-white rounded">
                  Close Active Window
                </button>
              </form>
            )}
          </div>
        </div>

        <PlatformAuditTable logs={auditLogs} />
      </div>
    </MarketingLayoutClient>
  );
}
