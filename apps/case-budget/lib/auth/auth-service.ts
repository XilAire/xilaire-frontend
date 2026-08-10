import "server-only";

import type {
  AuthError,
  Session,
  User,
} from "@supabase/supabase-js";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createCaseBudgetSupabaseServerClient,
} from "@/lib/auth/server-auth";
import {
  sendWelcomeEmail,
} from "@/lib/email";
import {
  sendPasswordRecoveryEmail,
  sendSignUpConfirmationEmail,
} from "@/lib/auth/auth-email-service";

export type AuthServiceErrorCode =
  | "invalid_input"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_already_registered"
  | "weak_password"
  | "rate_limited"
  | "user_not_found"
  | "session_not_found"
  | "provisioning_failed"
  | "unexpected_error";

export type AuthServiceError = {
  code: AuthServiceErrorCode;
  message: string;
  status?: number;
};

export type AuthServiceResult<
  Data,
> =
  | {
      success: true;
      data: Data;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: AuthServiceError;
    };

export type SignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  workspaceName?: string;
  timezone?: string;
  locale?: string;
  emailRedirectTo?: string;
};

export type SignUpResult = {
  user: User;
  session: Session | null;
  requiresEmailConfirmation: boolean;
  provisioning: UserProvisioningResult | null;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignInResult = {
  user: User;
  session: Session;
};

export type PasswordResetInput = {
  email: string;
  redirectTo?: string;
};

export type UpdatePasswordInput = {
  password: string;
};

export type UpdatePasswordResult = {
  user: User;
};

export type UpdateAuthMetadataInput = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  timezone?: string;
  locale?: string;
};

export type UserProvisioningResult = {
  userId: string;
  profileId: string;
  workspaceId: string;
  membershipId: string;
  platformRole: string;
  profileCreated: boolean;
  platformRoleCreated: boolean;
  workspaceCreated: boolean;
  membershipCreated: boolean;
  provisionedAt: string;
};

export type FinalizeAuthenticatedUserInput = {
  user?: User;
  sendWelcomeEmail?: boolean;
};

export type FinalizeAuthenticatedUserResult = {
  user: User;
  provisioning: UserProvisioningResult;
};

type ProvisioningRpcResponse = {
  user_id?: unknown;
  profile_id?: unknown;
  workspace_id?: unknown;
  membership_id?: unknown;
  platform_role?: unknown;
  profile_created?: unknown;
  platform_role_created?: unknown;
  workspace_created?: unknown;
  membership_created?: unknown;
  provisioned_at?: unknown;
};

const DEFAULT_APP_URL =
  "http://localhost:3004";

const MINIMUM_PASSWORD_LENGTH =
  8;

export async function signUp(
  input: SignUpInput,
): Promise<
  AuthServiceResult<SignUpResult>
> {
  const validationError =
    validateSignUpInput(
      input,
    );

  if (validationError) {
    return failure(
      validationError,
    );
  }

  try {
    const email =
      normalizeEmail(
        input.email,
      );

    const firstName =
      input.firstName.trim();

    const lastName =
      input.lastName.trim();

    const displayName =
      resolveDisplayName({
        firstName,
        lastName,
        displayName:
          input.displayName,
        email,
      });

    const workspaceName =
      resolveWorkspaceName({
        workspaceName:
          input.workspaceName,
        displayName,
      });

    const emailRedirectTo =
      input.emailRedirectTo ??
      buildAppUrl(
        "/auth/callback",
      );

    const emailResult =
      await sendSignUpConfirmationEmail({
        email,
        password:
          input.password,
        firstName,
        lastName,
        workspaceName,
        redirectTo:
          emailRedirectTo,
        metadata: {
          first_name:
            firstName,
          last_name:
            lastName,
          display_name:
            displayName,
          workspace_name:
            workspaceName,
          timezone:
            input.timezone ??
            "America/New_York",
          locale:
            input.locale ??
            "en-US",
        },
      });

    if (
      !emailResult.success
    ) {
      return failure(
        mapAuthEmailServiceError(
          emailResult.error,
        ),
      );
    }

    if (
      !emailResult.data.user
    ) {
      return failure({
        code:
          "unexpected_error",
        message:
          "Supabase did not return a user after registration.",
      });
    }

    return success({
      user:
        emailResult.data.user,
      session:
        null,
      requiresEmailConfirmation:
        true,
      provisioning:
        null,
    });
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function signIn(
  input: SignInInput,
): Promise<
  AuthServiceResult<SignInResult>
> {
  const email =
    normalizeEmail(
      input.email,
    );

  if (
    !email ||
    !input.password
  ) {
    return failure({
      code:
        "invalid_input",
      message:
        "Email and password are required.",
    });
  }

  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password:
          input.password,
      });

    if (error) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    if (
      !data.user ||
      !data.session
    ) {
      return failure({
        code:
          "session_not_found",
        message:
          "A valid session was not created.",
      });
    }

    const finalizeResult =
      await finalizeAuthenticatedUser({
        user:
          data.user,
        sendWelcomeEmail:
          true,
      });

    if (
      !finalizeResult.success
    ) {
      await supabase.auth.signOut();

      return failure(
        finalizeResult.error,
      );
    }

    return success({
      user:
        finalizeResult.data.user,
      session:
        data.session,
    });
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function signOut(): Promise<
  AuthServiceResult<null>
> {
  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    return success(
      null,
    );
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function requestPasswordReset(
  input: PasswordResetInput,
): Promise<
  AuthServiceResult<null>
> {
  const email =
    normalizeEmail(
      input.email,
    );

  if (!email) {
    return failure({
      code:
        "invalid_input",
      message:
        "A valid email address is required.",
    });
  }

  try {
    const redirectTo =
      input.redirectTo ??
      buildAppUrl(
        "/auth/callback?next=/update-password",
      );

    const emailResult =
      await sendPasswordRecoveryEmail({
        email,
        redirectTo,
      });

    if (
      !emailResult.success
    ) {
      if (
        isUserNotFoundAuthEmailError(
          emailResult.error,
        )
      ) {
        return success(
          null,
        );
      }

      return failure(
        mapAuthEmailServiceError(
          emailResult.error,
        ),
      );
    }

    return success(
      null,
    );
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function updatePassword(
  input: UpdatePasswordInput,
): Promise<
  AuthServiceResult<UpdatePasswordResult>
> {
  const passwordError =
    validatePassword(
      input.password,
    );

  if (passwordError) {
    return failure(
      passwordError,
    );
  }

  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError) {
      return failure(
        mapAuthError(
          userError,
        ),
      );
    }

    if (!userData.user) {
      return failure({
        code:
          "session_not_found",
        message:
          "A valid password-recovery session is required.",
      });
    }

    const {
      data,
      error,
    } =
      await supabase.auth.updateUser({
        password:
          input.password,
      });

    if (error) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    if (!data.user) {
      return failure({
        code:
          "unexpected_error",
        message:
          "The password was updated, but the user record was not returned.",
      });
    }

    return success({
      user:
        data.user,
    });
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function updateAuthMetadata(
  input: UpdateAuthMetadataInput,
): Promise<
  AuthServiceResult<User>
> {
  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const metadata:
      Record<
        string,
        string
      > = {};

    if (
      input.firstName !==
      undefined
    ) {
      const firstName =
        input.firstName.trim();

      if (!firstName) {
        return failure({
          code:
            "invalid_input",
          message:
            "First name cannot be blank.",
        });
      }

      metadata.first_name =
        firstName;
    }

    if (
      input.lastName !==
      undefined
    ) {
      const lastName =
        input.lastName.trim();

      if (!lastName) {
        return failure({
          code:
            "invalid_input",
          message:
            "Last name cannot be blank.",
        });
      }

      metadata.last_name =
        lastName;
    }

    if (
      input.displayName !==
      undefined
    ) {
      const displayName =
        input.displayName.trim();

      if (!displayName) {
        return failure({
          code:
            "invalid_input",
          message:
            "Display name cannot be blank.",
        });
      }

      metadata.display_name =
        displayName;
    }

    if (
      input.timezone !==
      undefined
    ) {
      const timezone =
        input.timezone.trim();

      if (!timezone) {
        return failure({
          code:
            "invalid_input",
          message:
            "Timezone cannot be blank.",
        });
      }

      metadata.timezone =
        timezone;
    }

    if (
      input.locale !==
      undefined
    ) {
      const locale =
        input.locale.trim();

      if (!locale) {
        return failure({
          code:
            "invalid_input",
          message:
            "Locale cannot be blank.",
        });
      }

      metadata.locale =
        locale;
    }

    if (
      Object.keys(
        metadata,
      ).length === 0
    ) {
      return failure({
        code:
          "invalid_input",
        message:
          "At least one profile value must be supplied.",
      });
    }

    const {
      data,
      error,
    } =
      await supabase.auth.updateUser({
        data: metadata,
      });

    if (error) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    if (!data.user) {
      return failure({
        code:
          "unexpected_error",
        message:
          "Supabase did not return the updated user.",
      });
    }

    const syncResult =
      await synchronizeProfileFromAuth(
        data.user.id,
      );

    if (!syncResult.success) {
      return failure(
        syncResult.error,
      );
    }

    return success(
      data.user,
    );
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function getCurrentUser(): Promise<
  AuthServiceResult<User>
> {
  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (error) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    if (!data.user) {
      return failure({
        code:
          "user_not_found",
        message:
          "No authenticated user was found.",
      });
    }

    return success(
      data.user,
    );
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function provisionCurrentUser(): Promise<
  AuthServiceResult<UserProvisioningResult>
> {
  const currentUserResult =
    await getCurrentUser();

  if (
    !currentUserResult.success
  ) {
    return failure(
      currentUserResult.error,
    );
  }

  return provisionUser(
    currentUserResult.data.id,
  );
}

export async function finalizeAuthenticatedUser({
  user,
  sendWelcomeEmail:
    shouldSendWelcome = true,
}: FinalizeAuthenticatedUserInput = {}): Promise<
  AuthServiceResult<FinalizeAuthenticatedUserResult>
> {
  try {
    const authenticatedUserResult =
      user
        ? success(
            user,
          )
        : await getCurrentUser();

    if (
      !authenticatedUserResult.success
    ) {
      return failure(
        authenticatedUserResult.error,
      );
    }

    const authenticatedUser =
      authenticatedUserResult.data;

    const provisioningResult =
      await provisionUser(
        authenticatedUser.id,
      );

    if (
      !provisioningResult.success
    ) {
      return failure(
        provisioningResult.error,
      );
    }

    const syncResult =
      await synchronizeProfileFromAuth(
        authenticatedUser.id,
      );

    if (
      !syncResult.success
    ) {
      return failure(
        syncResult.error,
      );
    }

    if (
      shouldSendWelcome
    ) {
      await sendWelcomeEmailAfterProvisioning({
        user:
          authenticatedUser,
        provisioning:
          provisioningResult.data,
      });
    }

    return success({
      user:
        authenticatedUser,
      provisioning:
        provisioningResult.data,
    });
  } catch (error) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function provisionUser(
  userId: string,
): Promise<
  AuthServiceResult<UserProvisioningResult>
> {
  const normalizedUserId =
    userId.trim();

  if (!normalizedUserId) {
    return failure({
      code:
        "invalid_input",
      message:
        "A valid user ID is required for provisioning.",
    });
  }

  try {
    const supabaseAdmin =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "provision_case_budget_user",
        {
          target_user_id:
            normalizedUserId,
        },
      );

    if (error) {
      return failure({
        code:
          "provisioning_failed",
        message:
          error.message ||
          "CASE Budget could not provision the user.",
        status:
          getErrorStatus(
            error,
          ),
      });
    }

    const parsedResult =
      parseProvisioningResult(
        data,
      );

    if (!parsedResult) {
      return failure({
        code:
          "provisioning_failed",
        message:
          "The user provisioning response was incomplete.",
      });
    }

    return success(
      parsedResult,
    );
  } catch (error) {
    return failure({
      ...mapUnknownError(
        error,
      ),
      code:
        "provisioning_failed",
    });
  }
}

export async function synchronizeProfileFromAuth(
  userId: string,
): Promise<
  AuthServiceResult<null>
> {
  const normalizedUserId =
    userId.trim();

  if (!normalizedUserId) {
    return failure({
      code:
        "invalid_input",
      message:
        "A valid user ID is required.",
    });
  }

  try {
    const supabaseAdmin =
      createAdminClient();

    const {
      error,
    } =
      await supabaseAdmin.rpc(
        "sync_case_budget_profile_from_auth",
        {
          target_user_id:
            normalizedUserId,
        },
      );

    if (error) {
      return failure({
        code:
          "provisioning_failed",
        message:
          error.message ||
          "CASE Budget could not synchronize the user profile.",
        status:
          getErrorStatus(
            error,
          ),
      });
    }

    return success(
      null,
    );
  } catch (error) {
    return failure({
      ...mapUnknownError(
        error,
      ),
      code:
        "provisioning_failed",
    });
  }
}

async function sendWelcomeEmailAfterProvisioning({
  user,
  provisioning,
  firstName,
  workspaceName,
}: {
  user:
    User;

  provisioning:
    UserProvisioningResult;

  firstName?:
    string;

  workspaceName?:
    string;
}) {
  if (
    !shouldSendWelcomeEmail(
      provisioning,
    )
  ) {
    return;
  }

  const email =
    normalizeEmail(
      user.email ??
      "",
    );

  if (
    !email
  ) {
    logWelcomeEmailError(
      "CASE Budget could not send the welcome email because the authenticated user does not have an email address.",
      {
        userId:
          user.id,
      },
    );

    return;
  }

  const resolvedFirstName =
    normalizeOptionalMetadataText(
      firstName,
    ) ??
    normalizeOptionalMetadataText(
      user.user_metadata
        ?.first_name,
    );

  const resolvedWorkspaceName =
    normalizeOptionalMetadataText(
      workspaceName,
    ) ??
    normalizeOptionalMetadataText(
      user.user_metadata
        ?.workspace_name,
    );

  const result =
    await sendWelcomeEmail({
      to:
        email,

      firstName:
        resolvedFirstName,

      workspaceName:
        resolvedWorkspaceName,

      dashboardUrl:
        buildAppUrl(
          "/dashboard",
        ),
    });

  if (
    !result.success
  ) {
    logWelcomeEmailError(
      "CASE Budget provisioning succeeded, but the welcome email could not be sent.",
      {
        userId:
          user.id,

        workspaceId:
          provisioning.workspaceId,

        emailErrorCode:
          result.error.code,

        emailErrorMessage:
          result.error.message,

        emailStatusCode:
          result.error.statusCode,
      },
    );
  }
}

function shouldSendWelcomeEmail(
  provisioning:
    UserProvisioningResult,
) {
  return (
    provisioning.profileCreated ||
    provisioning.workspaceCreated ||
    provisioning.membershipCreated
  );
}

function normalizeOptionalMetadataText(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return undefined;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function logWelcomeEmailError(
  message:
    string,
  context:
    Record<
      string,
      unknown
    >,
) {
  if (
    process.env.NODE_ENV ===
      "production"
  ) {
    console.error(
      `[CASE Budget Auth] ${message}`,
    );

    return;
  }

  console.error(
    `[CASE Budget Auth] ${message}`,
    context,
  );
}

function validateSignUpInput(
  input: SignUpInput,
): AuthServiceError | null {
  const email =
    normalizeEmail(
      input.email,
    );

  if (!email) {
    return {
      code:
        "invalid_input",
      message:
        "A valid email address is required.",
    };
  }

  if (
    !input.firstName.trim()
  ) {
    return {
      code:
        "invalid_input",
      message:
        "First name is required.",
    };
  }

  if (
    !input.lastName.trim()
  ) {
    return {
      code:
        "invalid_input",
      message:
        "Last name is required.",
    };
  }

  return validatePassword(
    input.password,
  );
}

function validatePassword(
  password: string,
): AuthServiceError | null {
  if (!password) {
    return {
      code:
        "invalid_input",
      message:
        "Password is required.",
    };
  }

  if (
    password.length <
    MINIMUM_PASSWORD_LENGTH
  ) {
    return {
      code:
        "weak_password",
      message: `Password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
    };
  }

  if (
    !/[a-z]/.test(
      password,
    )
  ) {
    return {
      code:
        "weak_password",
      message:
        "Password must contain at least one lowercase letter.",
    };
  }

  if (
    !/[A-Z]/.test(
      password,
    )
  ) {
    return {
      code:
        "weak_password",
      message:
        "Password must contain at least one uppercase letter.",
    };
  }

  if (
    !/[0-9]/.test(
      password,
    )
  ) {
    return {
      code:
        "weak_password",
      message:
        "Password must contain at least one number.",
    };
  }

  return null;
}

function resolveDisplayName({
  firstName,
  lastName,
  displayName,
  email,
}: {
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
}) {
  const requestedDisplayName =
    displayName?.trim();

  if (
    requestedDisplayName
  ) {
    return requestedDisplayName;
  }

  const fullName =
    `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return (
    email.split("@")[0] ||
    "CASE Budget User"
  );
}

function resolveWorkspaceName({
  workspaceName,
  displayName,
}: {
  workspaceName?: string;
  displayName: string;
}) {
  const requestedWorkspaceName =
    workspaceName?.trim();

  if (
    requestedWorkspaceName
  ) {
    return requestedWorkspaceName;
  }

  return `${displayName}'s Personal Budget`;
}

function normalizeEmail(
  email: string,
) {
  return email
    .trim()
    .toLowerCase();
}

function buildAppUrl(
  path: string,
) {
  const configuredAppUrl =
    process.env
      .NEXT_PUBLIC_CASE_BUDGET_APP_URL ??
    DEFAULT_APP_URL;

  const appUrl =
    configuredAppUrl.replace(
      /\/+$/,
      "",
    );

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${appUrl}${normalizedPath}`;
}

function parseProvisioningResult(
  value: unknown,
): UserProvisioningResult | null {
  if (
    !isObjectRecord(
      value,
    )
  ) {
    return null;
  }

  const response =
    value as ProvisioningRpcResponse;

  const userId =
    getRequiredString(
      response.user_id,
    );

  const profileId =
    getRequiredString(
      response.profile_id,
    );

  const workspaceId =
    getRequiredString(
      response.workspace_id,
    );

  const membershipId =
    getRequiredString(
      response.membership_id,
    );

  const platformRole =
    getRequiredString(
      response.platform_role,
    );

  const provisionedAt =
    getRequiredString(
      response.provisioned_at,
    );

  if (
    !userId ||
    !profileId ||
    !workspaceId ||
    !membershipId ||
    !platformRole ||
    !provisionedAt
  ) {
    return null;
  }

  return {
    userId,
    profileId,
    workspaceId,
    membershipId,
    platformRole,
    profileCreated:
      Boolean(
        response.profile_created,
      ),
    platformRoleCreated:
      Boolean(
        response.platform_role_created,
      ),
    workspaceCreated:
      Boolean(
        response.workspace_created,
      ),
    membershipCreated:
      Boolean(
        response.membership_created,
      ),
    provisionedAt,
  };
}

function mapAuthError(
  error: AuthError,
): AuthServiceError {
  const normalizedMessage =
    error.message
      .trim()
      .toLowerCase();

  const status =
    error.status;

  if (
    normalizedMessage.includes(
      "invalid login credentials",
    )
  ) {
    return {
      code:
        "invalid_credentials",
      message:
        "The email or password is incorrect.",
      status,
    };
  }

  if (
    normalizedMessage.includes(
      "email not confirmed",
    )
  ) {
    return {
      code:
        "email_not_confirmed",
      message:
        "Confirm your email address before signing in.",
      status,
    };
  }

  if (
    normalizedMessage.includes(
      "user already registered",
    ) ||
    normalizedMessage.includes(
      "already been registered",
    )
  ) {
    return {
      code:
        "email_already_registered",
      message:
        "An account already exists for this email address.",
      status,
    };
  }

  if (
    normalizedMessage.includes(
      "password",
    ) &&
    (
      normalizedMessage.includes(
        "weak",
      ) ||
      normalizedMessage.includes(
        "characters",
      )
    )
  ) {
    return {
      code:
        "weak_password",
      message:
        error.message,
      status,
    };
  }

  if (
    status === 429 ||
    normalizedMessage.includes(
      "rate limit",
    ) ||
    normalizedMessage.includes(
      "too many requests",
    )
  ) {
    return {
      code:
        "rate_limited",
      message:
        "Too many attempts were made. Wait a moment and try again.",
      status,
    };
  }

  if (
    normalizedMessage.includes(
      "user not found",
    )
  ) {
    return {
      code:
        "user_not_found",
      message:
        "The requested user could not be found.",
      status,
    };
  }

  if (
    normalizedMessage.includes(
      "session",
    ) ||
    normalizedMessage.includes(
      "jwt",
    )
  ) {
    return {
      code:
        "session_not_found",
      message:
        "Your session is no longer valid. Sign in again.",
      status,
    };
  }

  return {
    code:
      "unexpected_error",
    message:
      error.message ||
      "An unexpected authentication error occurred.",
    status,
  };
}

function mapAuthEmailServiceError(
  error: {
    code:
      string;
    message:
      string;
    statusCode:
      number | null;
  },
): AuthServiceError {
  const normalizedCode =
    error.code
      .trim()
      .toLowerCase();

  const normalizedMessage =
    error.message
      .trim()
      .toLowerCase();

  const status =
    error.statusCode ??
    undefined;

  if (
    normalizedMessage.includes(
      "already registered",
    ) ||
    normalizedMessage.includes(
      "already been registered",
    ) ||
    normalizedMessage.includes(
      "already exists",
    ) ||
    normalizedCode.includes(
      "user_already_exists",
    )
  ) {
    return {
      code:
        "email_already_registered",
      message:
        "An account already exists for this email address.",
      status,
    };
  }

  if (
    normalizedCode.includes(
      "weak_password",
    ) ||
    (
      normalizedMessage.includes(
        "password",
      ) &&
      (
        normalizedMessage.includes(
          "weak",
        ) ||
        normalizedMessage.includes(
          "characters",
        )
      )
    )
  ) {
    return {
      code:
        "weak_password",
      message:
        error.message,
      status,
    };
  }

  if (
    status === 429 ||
    normalizedCode.includes(
      "rate",
    ) ||
    normalizedMessage.includes(
      "rate limit",
    ) ||
    normalizedMessage.includes(
      "too many requests",
    )
  ) {
    return {
      code:
        "rate_limited",
      message:
        "Too many attempts were made. Wait a moment and try again.",
      status,
    };
  }

  if (
    isUserNotFoundAuthEmailError(
      error,
    )
  ) {
    return {
      code:
        "user_not_found",
      message:
        "The requested user could not be found.",
      status,
    };
  }

  return {
    code:
      "unexpected_error",
    message:
      error.message ||
      "CASE Budget could not send the authentication email.",
    status,
  };
}

function isUserNotFoundAuthEmailError(
  error: {
    code:
      string;
    message:
      string;
  },
) {
  const normalizedCode =
    error.code
      .trim()
      .toLowerCase();

  const normalizedMessage =
    error.message
      .trim()
      .toLowerCase();

  return (
    normalizedCode.includes(
      "user_not_found",
    ) ||
    normalizedMessage.includes(
      "user not found",
    ) ||
    normalizedMessage.includes(
      "could not find user",
    ) ||
    normalizedMessage.includes(
      "unable to find user",
    )
  );
}

function mapUnknownError(
  error: unknown,
): AuthServiceError {
  if (
    error instanceof Error
  ) {
    return {
      code:
        "unexpected_error",
      message:
        error.message,
    };
  }

  return {
    code:
      "unexpected_error",
    message:
      "An unexpected authentication error occurred.",
  };
}

function getErrorStatus(
  error: {
    code?: string;
    status?: number;
  },
) {
  if (
    typeof error.status ===
    "number"
  ) {
    return error.status;
  }

  const parsedStatus =
    Number(
      error.code,
    );

  return Number.isFinite(
    parsedStatus,
  )
    ? parsedStatus
    : undefined;
}

function getRequiredString(
  value: unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue ||
    null;
}

function isObjectRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function success<
  Data,
>(
  data: Data,
): AuthServiceResult<Data> {
  return {
    success: true,
    data,
    error: null,
  };
}

function failure<
  Data = never,
>(
  error: AuthServiceError,
): AuthServiceResult<Data> {
  return {
    success: false,
    data: null,
    error,
  };
}