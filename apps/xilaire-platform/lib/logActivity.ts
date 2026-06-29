import { supabasePlatform } from "@/lib/supabasePlatformClient";

export async function logActivity({
  request_id,
  action,
  message,
  old_value = null,
  new_value = null,
}: {
  request_id: string;
  action: string;
  message: string;
  old_value?: string | null;
  new_value?: string | null;
}) {
  const {
    data: { user },
  } = await supabasePlatform.auth.getUser();

  if (!user) return;

  await supabasePlatform.from("service_request_logs").insert({
    request_id,
    action,
    message,
    old_value,
    new_value,
    created_by: user.id,
  });
}
