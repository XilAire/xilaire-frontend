"use server";

import {
  signUp,
} from "@/lib/auth/auth-service";

import type {
  SignUpActionFieldErrors,
  SignUpActionState,
} from "@/types/auth/sign-up-action";

export async function signUpAction(
  _previousState:
    SignUpActionState,
  formData:
    FormData,
): Promise<SignUpActionState> {
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

  const displayName =
    getFormString(
      formData,
      "displayName",
    );

  const workspaceName =
    getFormString(
      formData,
      "workspaceName",
    );

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
    );

  const confirmPassword =
    getFormString(
      formData,
      "confirmPassword",
    );

  const termsAccepted =
    getFormBoolean(
      formData,
      "termsAccepted",
    );

  const fieldErrors =
    validateSignUpForm({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      termsAccepted,
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

      requiresEmailConfirmation:
        false,

      userId:
        null,

      workspaceId:
        null,
    };
  }

  const result =
    await signUp({
      firstName,
      lastName,

      displayName:
        displayName ||
        undefined,

      workspaceName:
        workspaceName ||
        undefined,

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

      requiresEmailConfirmation:
        false,

      userId:
        null,

      workspaceId:
        null,
    };
  }

  if (
    result.data
      .requiresEmailConfirmation
  ) {
    return {
      success:
        true,

      message:
        "Your account was created. Check your email and follow the confirmation link to finish signing in.",

      fieldErrors: {},

      requiresEmailConfirmation:
        true,

      userId:
        result.data.user.id,

      /*
       * Workspace provisioning intentionally does not occur until the
       * confirmed user successfully authenticates.
       */
      workspaceId:
        null,
    };
  }

  const provisioning =
    result.data.provisioning;

  if (
    !provisioning
  ) {
    return {
      success:
        false,

      message:
        "Your account was created, but CASE Budget could not finish setting up your financial workspace. Please sign in again to complete setup.",

      fieldErrors: {},

      requiresEmailConfirmation:
        false,

      userId:
        result.data.user.id,

      workspaceId:
        null,
    };
  }

  return {
    success:
      true,

    message:
      "Your CASE Budget account was created successfully.",

    fieldErrors: {},

    requiresEmailConfirmation:
      false,

    userId:
      result.data.user.id,

    workspaceId:
      provisioning.workspaceId,
  };
}

type SignUpFormValues = {
  firstName:
    string;

  lastName:
    string;

  email:
    string;

  password:
    string;

  confirmPassword:
    string;

  termsAccepted:
    boolean;
};

function validateSignUpForm({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  termsAccepted,
}: SignUpFormValues) {
  const fieldErrors:
    SignUpActionFieldErrors = {};

  if (
    !firstName.trim()
  ) {
    fieldErrors.firstName =
      "First name is required.";
  }

  if (
    !lastName.trim()
  ) {
    fieldErrors.lastName =
      "Last name is required.";
  }

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
  } else {
    const passwordError =
      validatePassword(
        password,
      );

    if (
      passwordError
    ) {
      fieldErrors.password =
        passwordError;
    }
  }

  if (
    !confirmPassword
  ) {
    fieldErrors.confirmPassword =
      "Confirm your password.";
  } else if (
    password !==
    confirmPassword
  ) {
    fieldErrors.confirmPassword =
      "The passwords do not match.";
  }

  if (
    !termsAccepted
  ) {
    fieldErrors.termsAccepted =
      "You must accept the Terms of Service and Privacy Policy.";
  }

  return fieldErrors;
}

function validatePassword(
  password:
    string,
) {
  if (
    password.length <
    8
  ) {
    return "Password must contain at least 8 characters.";
  }

  if (
    !/[a-z]/.test(
      password,
    )
  ) {
    return "Password must contain at least one lowercase letter.";
  }

  if (
    !/[A-Z]/.test(
      password,
    )
  ) {
    return "Password must contain at least one uppercase letter.";
  }

  if (
    !/[0-9]/.test(
      password,
    )
  ) {
    return "Password must contain at least one number.";
  }

  return null;
}

function mapServiceErrorToFields(
  code:
    string,
  message:
    string,
): SignUpActionFieldErrors {
  if (
    code ===
    "email_already_registered"
  ) {
    return {
      email:
        message,
    };
  }

  if (
    code ===
    "weak_password"
  ) {
    return {
      password:
        message,
    };
  }

  if (
    code ===
    "invalid_input"
  ) {
    return {};
  }

  return {};
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

function getFormBoolean(
  formData:
    FormData,
  key:
    string,
) {
  const value =
    formData.get(
      key,
    );

  return (
    value ===
      "true" ||
    value ===
      "on" ||
    value ===
      "1"
  );
}

function isValidEmail(
  email:
    string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}