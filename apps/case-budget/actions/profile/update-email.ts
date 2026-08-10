"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createCaseBudgetSupabaseServerClient,
} from "@/lib/auth/server-auth";

import type {
  UpdateEmailActionState,
} from "@/types/profile";

export async function updateEmailAction(
  _previousState:
    UpdateEmailActionState,

  formData:
    FormData,
): Promise<UpdateEmailActionState> {
  const email =
    getFormString(
      formData,
      "email",
    ).toLowerCase();

  const confirmEmail =
    getFormString(
      formData,
      "confirmEmail",
    ).toLowerCase();

  const fieldErrors:
    UpdateEmailActionState["fieldErrors"] =
      {};

  if (
    !email
  ) {
    fieldErrors.email =
      "Email address is required.";
  } else if (
    !isValidEmail(
      email,
    )
  ) {
    fieldErrors.email =
      "Enter a valid email address.";
  } else if (
    email.length >
    254
  ) {
    fieldErrors.email =
      "Email address must be 254 characters or fewer.";
  }

  if (
    !confirmEmail
  ) {
    fieldErrors.confirmEmail =
      "Confirm your new email address.";
  } else if (
    email &&
    confirmEmail !==
      email
  ) {
    fieldErrors.confirmEmail =
      "Email addresses do not match.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
    0
  ) {
    return {
      success:
        false,

      message:
        "Review the highlighted fields and try again.",

      fieldErrors,

      confirmationRequired:
        false,
    };
  }

  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return {
        success:
          false,

        message:
          "Your CASE Budget session could not be verified. Please sign in again.",

        fieldErrors: {},

        confirmationRequired:
          false,
      };
    }

    const currentEmail =
      user.email
        ?.trim()
        .toLowerCase() ??
      "";

    if (
      currentEmail &&
      email ===
        currentEmail
    ) {
      return {
        success:
          false,

        message:
          "Enter an email address different from your current email.",

        fieldErrors: {
          email:
            "This is already the email address on your CASE Budget account.",
        },

        confirmationRequired:
          false,
      };
    }

    const {
      error:
        updateError,
    } =
      await supabase.auth.updateUser({
        email,
      });

    if (
      updateError
    ) {
      return {
        success:
          false,

        message:
          getSafeUpdateEmailErrorMessage(
            updateError.message,
          ),

        fieldErrors: {},

        confirmationRequired:
          false,
      };
    }

    revalidatePath(
      "/dashboard/profile",
    );

    revalidatePath(
      "/dashboard/settings",
    );

    revalidatePath(
      "/dashboard",
      "layout",
    );

    return {
      success:
        true,

      message:
        "Check your email to confirm the address change. Your CASE Budget account will continue using your current email until the change is verified.",

      fieldErrors: {},

      confirmationRequired:
        true,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      message:
        getUnknownErrorMessage(
          error,
          "CASE Budget could not start the email change.",
        ),

      fieldErrors: {},

      confirmationRequired:
        false,
    };
  }
}

function getFormString(
  formData:
    FormData,

  key:
    string,
) {
  const value =
    formData.get(
      key,
    );

  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function isValidEmail(
  value:
    string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function getSafeUpdateEmailErrorMessage(
  message:
    string,
) {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "email rate limit",
    ) ||
    normalizedMessage.includes(
      "rate limit",
    )
  ) {
    return "Too many email-change requests were made. Please wait and try again.";
  }

  if (
    normalizedMessage.includes(
      "already registered",
    ) ||
    normalizedMessage.includes(
      "already been registered",
    ) ||
    normalizedMessage.includes(
      "user already registered",
    )
  ) {
    return "That email address is already associated with another account.";
  }

  if (
    normalizedMessage.includes(
      "invalid email",
    )
  ) {
    return "Enter a valid email address.";
  }

  return "CASE Budget could not start the email change. Please try again.";
}

function getUnknownErrorMessage(
  error:
    unknown,

  fallbackMessage:
    string,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return fallbackMessage;
}