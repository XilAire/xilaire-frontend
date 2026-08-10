"use server";

import {
  requestPasswordReset,
} from "@/lib/auth/auth-service";

import type {
  ResetPasswordActionFieldErrors,
  ResetPasswordActionState,
} from "@/types/auth/reset-password-action";

export const initialResetPasswordActionState:
  ResetPasswordActionState = {
    success:
      false,

    message:
      "",

    fieldErrors: {},
  };

export async function resetPasswordAction(
  _previousState:
    ResetPasswordActionState =
      initialResetPasswordActionState,
  formData:
    FormData,
): Promise<ResetPasswordActionState> {
  const email =
    getFormString(
      formData,
      "email",
    )
      .trim()
      .toLowerCase();

  const fieldErrors =
    validateForm({
      email,
    });

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
        "Please correct the highlighted fields.",

      fieldErrors,
    };
  }

  const result =
    await requestPasswordReset({
      email,
    });

  /*
   * Never reveal whether an email address exists.
   *
   * Authentication systems should return the same outward-facing response
   * for registered and unregistered addresses to reduce account-enumeration
   * risk.
   */
  if (
    !result.success
  ) {
    if (
      result.error.code ===
      "rate_limited"
    ) {
      return {
        success:
          false,

        message:
          result.error.message,

        fieldErrors: {},
      };
    }

    return {
      success:
        true,

      message:
        "If an account exists for that email address, a password reset email has been sent.",

      fieldErrors: {},
    };
  }

  return {
    success:
      true,

    message:
      "If an account exists for that email address, a password reset email has been sent.",

    fieldErrors: {},
  };
}

type ResetPasswordFormValues = {
  email:
    string;
};

function validateForm({
  email,
}: ResetPasswordFormValues) {
  const fieldErrors:
    ResetPasswordActionFieldErrors = {};

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
  }

  return fieldErrors;
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
  email:
    string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}