"use server";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";

import {
  buildPostRegistrationRedirect,
  buildSignInUrl,
  normalizePaidPlanKey,
  normalizeSourceProduct,
} from "@/lib/auth/registration-intent";

export type RegisterUniversityState = {
  status:
    | "idle"
    | "error"
    | "success"
    | "check_email";

  message: string | null;

  redirectTo: string | null;

  signInUrl: string | null;
};

export const initialRegisterUniversityState: RegisterUniversityState = {
  status: "idle",
  message: null,
  redirectTo: null,
  signInUrl: null,
};

function normalizeEmail(
  value: FormDataEntryValue | null,
): string {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

function normalizeText(
  value: FormDataEntryValue | null,
): string {
  return String(
    value ?? "",
  )
    .trim();
}

function resolveApplicationBaseUrl(): string {
  const configured =
    process.env
      .NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL?.trim();

  if (configured) {
    return configured.replace(
      /\/+$/,
      "",
    );
  }

  if (
    process.env.VERCEL_URL
  ) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

async function provisionUniversityAccount({
  userId,
  email,
  fullName,
  sourceProduct,
}: {
  userId: string;
  email: string;
  fullName: string;
  sourceProduct: string;
}): Promise<void> {
  const service =
    createSupabaseServerServiceClient();

  const {
    data: userRole,
    error: roleError,
  } =
    await service
      .from(
        "roles",
      )
      .select(
        "id,name,rank",
      )
      .eq(
        "rank",
        1,
      )
      .order(
        "id",
        {
          ascending: true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    roleError ||
    !userRole?.id
  ) {
    throw new Error(
      roleError?.message ??
        "The default user role is not configured.",
    );
  }

  const {
    error: profileError,
  } =
    await service
      .from(
        "profiles",
      )
      .upsert(
        {
          id: userId,
          email,
          full_name:
            fullName,
          role_id:
            userRole.id,
        },
        {
          onConflict:
            "id",
        },
      );

  if (profileError) {
    throw new Error(
      `Unable to provision the University profile: ${profileError.message}`,
    );
  }

  const {
    error: membershipError,
  } =
    await service
      .from(
        "case_product_memberships",
      )
      .upsert(
        {
          user_id:
            userId,

          product_key:
            "case_university",

          source_product_key:
            sourceProduct,

          membership_status:
            "active",

          last_seen_at:
            new Date().toISOString(),

          metadata: {
            registration_method:
              "email",
          },
        },
        {
          onConflict:
            "user_id,product_key",
        },
      );

  if (membershipError) {
    throw new Error(
      `Unable to record the CASE product membership: ${membershipError.message}`,
    );
  }
}

export async function registerUniversityUserAction(
  _previousState: RegisterUniversityState,
  formData: FormData,
): Promise<RegisterUniversityState> {
  const firstName =
    normalizeText(
      formData.get(
        "first_name",
      ),
    );

  const lastName =
    normalizeText(
      formData.get(
        "last_name",
      ),
    );

  const email =
    normalizeEmail(
      formData.get(
        "email",
      ),
    );

  const password =
    normalizeText(
      formData.get(
        "password",
      ),
    );

  const confirmPassword =
    normalizeText(
      formData.get(
        "confirm_password",
      ),
    );

  const acceptedTerms =
    formData.get(
      "accept_terms",
    ) === "on";

  const selectedPlan =
    normalizePaidPlanKey(
      normalizeText(
        formData.get(
          "plan",
        ),
      ),
    );

  const sourceProduct =
    normalizeSourceProduct(
      normalizeText(
        formData.get(
          "source",
        ),
      ),
    );

  const fullName =
    [
      firstName,
      lastName,
    ]
      .filter(
        Boolean,
      )
      .join(
        " ",
      )
      .trim();

  const redirectTo =
    buildPostRegistrationRedirect(
      selectedPlan,
    );

  const signInUrl =
    buildSignInUrl(
      redirectTo,
    );

  if (
    firstName.length < 1 ||
    lastName.length < 1
  ) {
    return {
      status:
        "error",

      message:
        "Enter your first and last name.",

      redirectTo:
        null,

      signInUrl:
        null,
    };
  }

  if (
    !email ||
    !email.includes(
      "@",
    )
  ) {
    return {
      status:
        "error",

      message:
        "Enter a valid email address.",

      redirectTo:
        null,

      signInUrl:
        null,
    };
  }

  if (
    password.length < 8
  ) {
    return {
      status:
        "error",

      message:
        "Your password must be at least 8 characters.",

      redirectTo:
        null,

      signInUrl:
        null,
    };
  }

  if (
    password !==
    confirmPassword
  ) {
    return {
      status:
        "error",

      message:
        "The passwords do not match.",

      redirectTo:
        null,

      signInUrl:
        null,
    };
  }

  if (
    !acceptedTerms
  ) {
    return {
      status:
        "error",

      message:
        "You must agree to the Terms of Service and Privacy Policy to create an account.",

      redirectTo:
        null,

      signInUrl:
        null,
    };
  }

  const supabase =
    await createSupabaseServerClient();

  const callbackUrl =
    new URL(
      "/auth/callback",
      resolveApplicationBaseUrl(),
    );

  callbackUrl.searchParams.set(
    "redirect",
    redirectTo,
  );

  const {
    data,
    error,
  } =
    await supabase.auth.signUp(
      {
        email,
        password,

        options: {
          emailRedirectTo:
            callbackUrl.toString(),

          data: {
            first_name:
              firstName,

            last_name:
              lastName,

            full_name:
              fullName,

            source_product:
              sourceProduct,

            case_product:
              "case_university",

            selected_plan:
              selectedPlan,

            terms_accepted:
              true,

            terms_accepted_at:
              new Date().toISOString(),
          },
        },
      },
    );

  if (error) {
    const normalizedMessage =
      error.message.toLowerCase();

    const accountExists =
      normalizedMessage.includes(
        "already registered",
      ) ||
      normalizedMessage.includes(
        "already exists",
      ) ||
      normalizedMessage.includes(
        "user already",
      );

    return {
      status:
        "error",

      message:
        accountExists
          ? "An account already exists for this email. Sign in to continue with your selected plan."
          : error.message,

      redirectTo:
        null,

      signInUrl:
        accountExists
          ? signInUrl
          : null,
    };
  }

  if (
    !data.user?.id
  ) {
    return {
      status:
        "error",

      message:
        "Your account could not be created. Please try again.",

      redirectTo:
        null,

      signInUrl:
        null,
    };
  }

  try {
    await provisionUniversityAccount(
      {
        userId:
          data.user.id,

        email,

        fullName,

        sourceProduct,
      },
    );
  }
  catch (provisionError) {
    console.error(
      "[CASE University Registration] Account provisioning failed:",
      provisionError,
    );

    return {
      status:
        "error",

      message:
        "Your login account was created, but CASE University could not finish setting up your profile. Please sign in and contact support if the issue continues.",

      redirectTo:
        null,

      signInUrl,
    };
  }

  if (
    data.session
  ) {
    return {
      status:
        "success",

      message:
        "Your CASE University account is ready.",

      redirectTo,

      signInUrl:
        null,
    };
  }

  return {
    status:
      "check_email",

    message:
      selectedPlan
        ? "Your account was created. Check your email to confirm your address. After confirmation, we will return you to your selected plan."
        : "Your account was created. Check your email to confirm your address, then continue to CASE University.",

    redirectTo:
      null,

    signInUrl:
      null,
  };
}
