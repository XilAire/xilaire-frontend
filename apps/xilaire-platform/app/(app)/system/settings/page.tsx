import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
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

  if (jwtError || jwtContext?.role !== "master_admin") {
    redirect("/dashboard");
  }

  /* ---------------------------------------------------------
     PROFILE — IDENTITY ONLY (NOT AUTHZ)
  --------------------------------------------------------- */
  const profile = await getProfile();

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
     SERVER ACTIONS
  --------------------------------------------------------- */
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

  const minEndTime = new Date(
    Date.now() + 60 * 1000
  ).toISOString().slice(0, 16);

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-400">
          Restricted to Master Administrators
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        <strong>Apply Window Status:</strong>{" "}
        {withinApplyWindow ? "Active" : "Inactive"}
      </div>

      {/* APPLY WINDOWS */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Apply Windows
          </h2>
        </div>

        <div className="divide-y divide-slate-800">
          {applyWindows.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between px-6 py-4 text-sm text-slate-300"
            >
              <p>
                {new Date(w.starts_at).toLocaleString()} →{" "}
                {new Date(w.ends_at).toLocaleString()}
              </p>
              <span className="text-xs text-slate-400">
                {w.active ? "Active" : "Closed"}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 px-6 py-4">
          {!activeApplyWindow ? (
            <form action={openApplyWindow} className="flex flex-wrap gap-3">
              <input
                type="datetime-local"
                name="starts_at"
                required
                className="h-10 rounded-md bg-slate-900 border border-slate-700 px-3 text-sm text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              />

              <input
                type="datetime-local"
                name="ends_at"
                required
                min={minEndTime}
                className="h-10 rounded-md bg-slate-900 border border-slate-700 px-3 text-sm text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              />

              <button
                className="h-10 rounded-md bg-sky-600 px-4 text-sm font-medium text-white
                           hover:bg-sky-500 transition
                           focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
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
              <button
                className="h-10 rounded-md bg-rose-600 px-4 text-sm font-medium text-white
                           hover:bg-rose-500 transition
                           focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              >
                Close Active Window
              </button>
            </form>
          )}
        </div>
      </div>

      <PlatformAuditTable logs={auditLogs} />
    </div>
  );
}