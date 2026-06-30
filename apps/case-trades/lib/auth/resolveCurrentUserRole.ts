import { createSupabaseServerClient } from "@/lib/supabase/server";

/* -------------------------------------------------
   Canonical role shape (1-to-1)
------------------------------------------------- */
type RoleRow = {
  name: string;
  rank: number;
};

export async function resolveCurrentUserRole() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      role_id,
      role:roles!profiles_role_id_fkey (
        name,
        rank
      )
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.role) {
    console.error("Unable to resolve CASE Trades user role", {
      user_id: user.id,
      email: user.email,
      error,
    });

    return null;
  }

  const role = Array.isArray(data.role)
    ? (data.role[0] as RoleRow | undefined)
    : (data.role as RoleRow | null);

  if (!role) {
    return null;
  }

  return {
    user_id: user.id,
    email: data.email,
    role_id: data.role_id,
    role_name: role.name,
    role_rank: role.rank,
  };
}
