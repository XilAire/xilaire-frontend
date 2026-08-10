"use server";

import {
  signIn,
} from "@/lib/auth/auth-service";

import type {
  SignInActionFieldErrors,
  SignInActionState,
} from "@/types/auth/sign-in-action";

export async function signInAction(
  _previousState:
    SignInActionState,
  formData:
    FormData,
): Promise<SignInActionState> {
  const email =
    getFormString(
      formData,
      "email",
    )
      .trim()
      .toLowerCase();

  const password =
    getFormString(
      formData,
      "password",
      false,
    );

  const fieldErrors =
    validateSignInForm({
      email,
      password,
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
        "Review the highlighted fields and try again.",

      fieldErrors,

      userId:
        null,
    };
  }

  const result =
    await signIn({
      email,
      password,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      fieldErrors:
        mapServiceErrorToFields(
          result.error.code,
          result.error.message,
        ),

      userId:
        null,
    };
  }

  return {
    success:
      true,

    message:
      "You have signed in successfully.",

    fieldErrors: {},

    userId:
      result.data.user.id,
  };
}

type SignInFormValues = {
  email:
    string;

  password:
    string;
};

function validateSignInForm({
  email,
  password,
}: SignInFormValues) {
  const fieldErrors:
    SignInActionFieldErrors = {};

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

  if (
    !password
  ) {
    fieldErrors.password =
      "Password is required.";
  }

  return fieldErrors;
}

function mapServiceErrorToFields(
  code:
    string,
  message:
    string,
): SignInActionFieldErrors {
  if (
    code ===
    "invalid_credentials"
  ) {
    return {
      email:
        message,

      password:
        message,
    };
  }

  if (
    code ===
    "email_not_confirmed"
  ) {
    return {
      email:
        message,
    };
  }

  return {};
}

function getFormString(
  formData:
    FormData,
  key:
    string,
  trimValue =
    true,
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

  return trimValue
    ? value.trim()
    : value;
}

function isValidEmail(
  email:
    string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}