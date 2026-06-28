"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

const SCREENSHOT_BUCKET = "journal-screenshots";

type DeleteTradeScreenshotInput = {
  screenshotId: string;
};

type DeleteTradeScreenshotResult =
  | {
      success: true;
      screenshot_id: string;
      execution_id: string;
      signal_id: string;
    }
  | {
      success: false;
      error: string;
    };

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function normalizeText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  return normalized.length > 0 ? normalized : null;
}

export async function deleteTradeScreenshot(
  input: DeleteTradeScreenshotInput
): Promise<DeleteTradeScreenshotResult> {
  const screenshotId = normalizeText(input.screenshotId);

  if (!screenshotId) {
    return {
      success: false,
      error: "Missing screenshot ID.",
    };
  }

  const role = await resolveCurrentUserRole();

  if (!role) {
    return {
      success: false,
      error: "Unauthorized.",
    };
  }

  const supabase = createSupabaseAdmin();

  const { data: screenshot, error: screenshotError } = await supabase
    .from("journal_execution_screenshots")
    .select(
      `
      id,
      execution_id,
      signal_id,
      file_path,
      signal_executions!inner (
        id,
        created_by
      ),
      signals!inner (
        id,
        created_by
      )
      `
    )
    .eq("id", screenshotId)
    .maybeSingle();

  if (screenshotError || !screenshot) {
    console.error(
      "deleteTradeScreenshot: screenshot lookup failed",
      screenshotError
    );

    return {
      success: false,
      error: "Screenshot not found.",
    };
  }

  const admin = isMasterAdmin(role);

  const executionCreatedBy =
    Array.isArray(screenshot.signal_executions) &&
    screenshot.signal_executions.length > 0
      ? screenshot.signal_executions[0]?.created_by
      : (screenshot.signal_executions as any)?.created_by;

  const signalCreatedBy =
    Array.isArray(screenshot.signals) && screenshot.signals.length > 0
      ? screenshot.signals[0]?.created_by
      : (screenshot.signals as any)?.created_by;

  const canDelete =
    admin ||
    executionCreatedBy === role.user_id ||
    signalCreatedBy === role.user_id;

  if (!canDelete) {
    return {
      success: false,
      error: "You do not have permission to delete this screenshot.",
    };
  }

  if (screenshot.file_path) {
    const { error: storageDeleteError } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .remove([screenshot.file_path]);

    if (storageDeleteError) {
      console.error(
        "deleteTradeScreenshot: storage delete failed",
        storageDeleteError
      );

      return {
        success: false,
        error: `Failed to delete screenshot file: ${storageDeleteError.message}`,
      };
    }
  }

  const { error: databaseDeleteError } = await supabase
    .from("journal_execution_screenshots")
    .delete()
    .eq("id", screenshotId);

  if (databaseDeleteError) {
    console.error(
      "deleteTradeScreenshot: database delete failed",
      databaseDeleteError
    );

    return {
      success: false,
      error: `Failed to delete screenshot record: ${databaseDeleteError.message}`,
    };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath(`/dashboard/journal/${screenshot.execution_id}`);
  revalidatePath(`/dashboard/signals/${screenshot.signal_id}`);

  return {
    success: true,
    screenshot_id: screenshot.id,
    execution_id: screenshot.execution_id,
    signal_id: screenshot.signal_id,
  };
}