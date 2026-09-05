"use server";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase =
    await createSupabaseServerClient();

  const {
    error,
  } =
    await supabase.auth.signOut();

  if (
    error
  ) {
    console.error(
      "Unable to sign out of CASE University",
      error,
    );

    redirect(
      "/dashboard?error=signout_failed",
    );
  }

  redirect(
    "/auth/signin?status=signed_out",
  );
}