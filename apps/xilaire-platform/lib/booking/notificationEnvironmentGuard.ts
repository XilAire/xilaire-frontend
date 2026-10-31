/**
 * XilAire Technologies - AUTH-04T-24U-R8X
 *
 * Static PREVIEW-only Supabase URL guard.
 *
 * No environment variables are read here.
 * No database connection is created here.
 * No network operations are performed here.
 *
 * This is one necessary application-side safeguard,
 * NOT proof that a service-role key belongs to PREVIEW.
 */

const APPROVED_PREVIEW_HOST =
  "dmdclnxhpxganjvjjtag.supabase.co"

const PRODUCTION_HOST =
  "iejmsrwhkonshmgfdzoy.supabase.co"

export type NotificationPreviewConfiguration = {
  supabaseUrl: string
  deploymentEnvironment: string
}

export function assertNotificationPreviewEnvironment(
  config: NotificationPreviewConfiguration
): void {
  if (
    !config ||
    config.deploymentEnvironment !== "preview"
  ) {
    throw new Error("NOTIFICATION_ENVIRONMENT_NOT_PREVIEW")
  }

  if (
    typeof config.supabaseUrl !== "string" ||
    !config.supabaseUrl ||
    config.supabaseUrl !== config.supabaseUrl.trim()
  ) {
    throw new Error("NOTIFICATION_SUPABASE_URL_INVALID")
  }

  let url: URL

  try {
    url = new URL(config.supabaseUrl)
  } catch {
    throw new Error("NOTIFICATION_SUPABASE_URL_INVALID")
  }

  if (url.hostname === PRODUCTION_HOST) {
    throw new Error("NOTIFICATION_PRODUCTION_PROJECT_BLOCKED")
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== APPROVED_PREVIEW_HOST ||
    url.port !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error("NOTIFICATION_PREVIEW_PROJECT_MISMATCH")
  }
}