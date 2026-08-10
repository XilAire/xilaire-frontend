"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  updateAuthMetadata,
} from "@/lib/auth/auth-service";

import type {
  UpdateProfileActionState,
} from "@/types/profile";

export async function updateProfileAction(
  _previousState:
    UpdateProfileActionState,

  formData:
    FormData,
): Promise<UpdateProfileActionState> {
  const firstName =
    getFormString(
      formData,
      "firstName",
    );

  const lastName =
    getFormString(
      formData,
      "lastName",
    );

  const displayNameInput =
    getFormString(
      formData,
      "displayName",
    );

  const fieldErrors:
    UpdateProfileActionState["fieldErrors"] =
      {};

  if (
    !firstName
  ) {
    fieldErrors.firstName =
      "First name is required.";
  } else if (
    firstName.length >
    100
  ) {
    fieldErrors.firstName =
      "First name must be 100 characters or fewer.";
  }

  if (
    !lastName
  ) {
    fieldErrors.lastName =
      "Last name is required.";
  } else if (
    lastName.length >
    100
  ) {
    fieldErrors.lastName =
      "Last name must be 100 characters or fewer.";
  }

  if (
    displayNameInput.length >
    150
  ) {
    fieldErrors.displayName =
      "Display name must be 150 characters or fewer.";
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
    };
  }

  const displayName =
    displayNameInput ||
    `${firstName} ${lastName}`.trim();

  try {
    const result =
      await updateAuthMetadata({
        firstName,
        lastName,
        displayName,
      });

    if (
      !result.success
    ) {
      return {
        success:
          false,

        message:
          result.error.message ||
          "CASE Budget could not update your profile.",

        fieldErrors: {},
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
        "Your profile was updated successfully.",

      fieldErrors: {},
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
          "CASE Budget could not update your profile.",
        ),

      fieldErrors: {},
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