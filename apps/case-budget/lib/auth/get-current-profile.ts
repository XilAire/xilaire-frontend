import "server-only";

import {
  cache,
} from "react";

import {
  getCurrentUser,
} from "@/lib/auth/get-current-user";
import {
  createClient,
} from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  timezone: string;
  locale: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CurrentProfileResult = {
  profile: CurrentProfile | null;
  isAuthenticated: boolean;
  isProvisioned: boolean;
  error: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  locale: string;
  is_active: boolean;
  onboarding_completed: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_SELECT = [
  "id",
  "email",
  "first_name",
  "last_name",
  "display_name",
  "avatar_url",
  "phone",
  "timezone",
  "locale",
  "is_active",
  "onboarding_completed",
  "last_sign_in_at",
  "created_at",
  "updated_at",
].join(",");

export const getCurrentProfile =
  cache(
    async (): Promise<CurrentProfileResult> => {
      const currentUserResult =
        await getCurrentUser();

      if (
        !currentUserResult
          .isAuthenticated ||
        !currentUserResult.user
      ) {
        return {
          profile: null,
          isAuthenticated: false,
          isProvisioned: false,
          error:
            currentUserResult.error,
        };
      }

      try {
        const supabase =
          await createClient();

        const {
          data,
          error,
        } =
          await supabase
            .from("profiles")
            .select(
              PROFILE_SELECT,
            )
            .eq(
              "id",
              currentUserResult
                .user.id,
            )
            .maybeSingle();

        if (error) {
          return {
            profile: null,
            isAuthenticated: true,
            isProvisioned: false,
            error:
              normalizeProfileError(
                error.message,
              ),
          };
        }

        if (!data) {
          return {
            profile: null,
            isAuthenticated: true,
            isProvisioned: false,
            error: null,
          };
        }

        const profileRow =
          parseProfileRow(
            data,
          );

        if (!profileRow) {
          return {
            profile: null,
            isAuthenticated: true,
            isProvisioned: false,
            error:
              "The CASE Budget profile response was incomplete or invalid.",
          };
        }

        return {
          profile:
            mapProfileRow(
              profileRow,
            ),
          isAuthenticated: true,
          isProvisioned: true,
          error: null,
        };
      } catch (error) {
        return {
          profile: null,
          isAuthenticated: true,
          isProvisioned: false,
          error:
            getUnknownErrorMessage(
              error,
            ),
        };
      }
    },
  );

export const getAuthenticatedProfile =
  cache(
    async (): Promise<CurrentProfile | null> => {
      const result =
        await getCurrentProfile();

      return result.profile;
    },
  );

export const getCurrentProfileId =
  cache(
    async (): Promise<string | null> => {
      const profile =
        await getAuthenticatedProfile();

      return profile?.id ?? null;
    },
  );

export const getCurrentDisplayName =
  cache(
    async (): Promise<string | null> => {
      const result =
        await getCurrentProfile();

      if (!result.profile) {
        return null;
      }

      return resolveProfileDisplayName(
        result.profile,
      );
    },
  );

export const isCurrentProfileActive =
  cache(
    async (): Promise<boolean> => {
      const profile =
        await getAuthenticatedProfile();

      return (
        profile?.isActive ===
        true
      );
    },
  );

export const hasCompletedOnboarding =
  cache(
    async (): Promise<boolean> => {
      const profile =
        await getAuthenticatedProfile();

      return (
        profile
          ?.onboardingCompleted ===
        true
      );
    },
  );

function parseProfileRow(
  value: unknown,
): ProfileRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    getRequiredString(
      value.id,
    );

  const email =
    getRequiredString(
      value.email,
    );

  const timezone =
    getRequiredString(
      value.timezone,
    );

  const locale =
    getRequiredString(
      value.locale,
    );

  const createdAt =
    getRequiredString(
      value.created_at,
    );

  const updatedAt =
    getRequiredString(
      value.updated_at,
    );

  if (
    !id ||
    !email ||
    !timezone ||
    !locale ||
    !createdAt ||
    !updatedAt ||
    typeof value.is_active !==
      "boolean" ||
    typeof value
      .onboarding_completed !==
      "boolean"
  ) {
    return null;
  }

  return {
    id,
    email,
    first_name:
      getNullableString(
        value.first_name,
      ),
    last_name:
      getNullableString(
        value.last_name,
      ),
    display_name:
      getNullableString(
        value.display_name,
      ),
    avatar_url:
      getNullableString(
        value.avatar_url,
      ),
    phone:
      getNullableString(
        value.phone,
      ),
    timezone,
    locale,
    is_active:
      value.is_active,
    onboarding_completed:
      value.onboarding_completed,
    last_sign_in_at:
      getNullableString(
        value.last_sign_in_at,
      ),
    created_at:
      createdAt,
    updated_at:
      updatedAt,
  };
}

function mapProfileRow(
  row: ProfileRow,
): CurrentProfile {
  return {
    id: row.id,
    email: row.email,
    firstName:
      row.first_name,
    lastName:
      row.last_name,
    displayName:
      row.display_name,
    avatarUrl:
      row.avatar_url,
    phone:
      row.phone,
    timezone:
      row.timezone,
    locale:
      row.locale,
    isActive:
      row.is_active,
    onboardingCompleted:
      row.onboarding_completed,
    lastSignInAt:
      row.last_sign_in_at,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  };
}

function resolveProfileDisplayName(
  profile: CurrentProfile,
) {
  const displayName =
    profile.displayName
      ?.trim();

  if (displayName) {
    return displayName;
  }

  const fullName = [
    profile.firstName,
    profile.lastName,
  ]
    .filter(
      (
        value,
      ): value is string =>
        typeof value ===
          "string" &&
        value.trim().length >
          0,
    )
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  const emailName =
    profile.email
      .split("@")[0]
      ?.trim();

  return (
    emailName ||
    "CASE Budget User"
  );
}

function normalizeProfileError(
  message: string,
) {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "row-level security",
    ) ||
    normalizedMessage.includes(
      "permission denied",
    )
  ) {
    return "Your CASE Budget profile could not be loaded because access was denied.";
  }

  if (
    normalizedMessage.includes(
      "relation",
    ) &&
    normalizedMessage.includes(
      "does not exist",
    )
  ) {
    return "The CASE Budget profiles table is not available.";
  }

  return (
    message.trim() ||
    "Unable to load the current CASE Budget profile."
  );
}

function getUnknownErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return (
      error.message.trim() ||
      "Unable to load the current CASE Budget profile."
    );
  }

  return "Unable to load the current CASE Budget profile.";
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

  return (
    normalizedValue ||
    null
  );
}

function getNullableString(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function isRecord(
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