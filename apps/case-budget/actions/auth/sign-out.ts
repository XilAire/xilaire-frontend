"use server";

import {
  redirect,
} from "next/navigation";

import {
  signOut,
} from "@/lib/auth/auth-service";

export type SignOutActionResult = {
  success: boolean;
  message: string;
};

export async function signOutAction(): Promise<
  SignOutActionResult
> {
  const result =
    await signOut();

  if (!result.success) {
    return {
      success: false,
      message:
        result.error.message,
    };
  }

  redirect(
    "/sign-in",
  );
}