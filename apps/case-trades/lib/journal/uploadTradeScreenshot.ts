"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

const SCREENSHOT_BUCKET = "journal-screenshots";

type ScreenshotType = "BEFORE" | "DURING" | "AFTER" | "BROKER_CONFIRMATION";

type UploadTradeScreenshotResult =
  | {
      success: true;
      screenshot: {
        id: string;
        execution_id: string;
        signal_id: string;
        screenshot_type: string;
        file_url: string;
        file_path: string;
        caption: string | null;
        created_at: string | null;
      };
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

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  const normalized = String(value ?? "").trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeScreenshotType(value: FormDataEntryValue | string | null) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (
    normalized === "BEFORE" ||
    normalized === "DURING" ||
    normalized === "AFTER" ||
    normalized === "BROKER_CONFIRMATION"
  ) {
    return normalized as ScreenshotType;
  }

  return null;
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop() : null;

  return extension ? extension.toLowerCase() : "png";
}

function isAllowedImageType(file: File) {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
    file.type
  );
}

function safeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

function getFileFromFormData(formData: FormData) {
  const value = formData.get("file");

  if (!value || !(value instanceof File)) {
    return null;
  }

  if (!value.name || value.size <= 0) {
    return null;
  }

  return value;
}

export async function uploadTradeScreenshot(
  formData: FormData
): Promise<UploadTradeScreenshotResult> {
  const tradeId = normalizeText(formData.get("tradeId"));
  const signalId = normalizeText(formData.get("signalId"));
  const screenshotType = normalizeScreenshotType(formData.get("screenshotType"));
  const caption = normalizeText(formData.get("caption"));
  const file = getFileFromFormData(formData);

  if (!tradeId) {
    return {
      success: false,
      error: "Missing trade ID.",
    };
  }

  if (!signalId) {
    return {
      success: false,
      error: "Missing signal ID.",
    };
  }

  if (!screenshotType) {
    return {
      success: false,
      error: "Invalid screenshot type.",
    };
  }

  if (!file) {
    return {
      success: false,
      error: "Missing screenshot file.",
    };
  }

  if (!isAllowedImageType(file)) {
    return {
      success: false,
      error: "Only PNG, JPG, JPEG, and WEBP screenshots are allowed.",
    };
  }

  const maxFileSizeBytes = 10 * 1024 * 1024;

  if (file.size > maxFileSizeBytes) {
    return {
      success: false,
      error: "Screenshot must be 10 MB or smaller.",
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

  const { data: execution, error: executionError } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      created_by,
      signals!inner (
        id,
        organization_id,
        created_by
      )
    `
    )
    .eq("id", tradeId)
    .eq("signal_id", signalId)
    .maybeSingle();

  if (executionError || !execution) {
    console.error(
      "uploadTradeScreenshot: execution lookup failed",
      executionError
    );

    return {
      success: false,
      error: "Trade execution not found.",
    };
  }

  const admin = isMasterAdmin(role);

  const signalCreatedBy =
    Array.isArray(execution.signals) && execution.signals.length > 0
      ? execution.signals[0]?.created_by
      : (execution.signals as any)?.created_by;

  const canEdit =
    admin ||
    execution.created_by === role.user_id ||
    signalCreatedBy === role.user_id;

  if (!canEdit) {
    return {
      success: false,
      error: "You do not have permission to upload screenshots for this trade.",
    };
  }

  const now = new Date().toISOString();
  const extension = getFileExtension(file.name);
  const cleanedFileName = safeFileName(file.name);
  const filePath = `${signalId}/${tradeId}/${screenshotType}/${Date.now()}-${
    cleanedFileName || `screenshot.${extension}`
  }`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("uploadTradeScreenshot: storage upload failed", uploadError);

    return {
      success: false,
      error: `Failed to upload screenshot: ${uploadError.message}`,
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(filePath);

  const { data: screenshot, error: insertError } = await supabase
    .from("journal_execution_screenshots")
    .insert({
      execution_id: tradeId,
      signal_id: signalId,
      screenshot_type: screenshotType,
      file_url: publicUrl,
      file_path: filePath,
      caption,
      created_at: now,
      created_by: role.user_id,
    })
    .select(
      `
      id,
      execution_id,
      signal_id,
      screenshot_type,
      file_url,
      file_path,
      caption,
      created_at
      `
    )
    .single();

  if (insertError || !screenshot) {
    console.error("uploadTradeScreenshot: database insert failed", insertError);

    await supabase.storage.from(SCREENSHOT_BUCKET).remove([filePath]);

    return {
      success: false,
      error: `Screenshot uploaded but failed to save record: ${
        insertError?.message ?? "No screenshot record returned"
      }`,
    };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath(`/dashboard/journal/${tradeId}`);
  revalidatePath(`/dashboard/signals/${signalId}`);

  return {
    success: true,
    screenshot,
  };
}