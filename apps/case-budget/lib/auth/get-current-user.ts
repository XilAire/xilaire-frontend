import "server-only";

import {
  cache,
} from "react";

import type {
  User,
} from "@supabase/supabase-js";

import {
  createClient,
} from "@/lib/supabase/server";

export type CurrentUserResult = {
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;
};

export const getCurrentUser =
  cache(
    async (): Promise<CurrentUserResult> => {
      try {
        const supabase =
          await createClient();

        const {
          data,
          error,
        } =
          await supabase.auth.getUser();

        if (error) {
          return {
            user: null,
            isAuthenticated: false,
            error:
              normalizeAuthenticationError(
                error.message,
              ),
          };
        }

        if (!data.user) {
          return {
            user: null,
            isAuthenticated: false,
            error: null,
          };
        }

        return {
          user: data.user,
          isAuthenticated: true,
          error: null,
        };
      } catch (error) {
        return {
          user: null,
          isAuthenticated: false,
          error:
            getUnknownErrorMessage(
              error,
            ),
        };
      }
    },
  );

export const getAuthenticatedUser =
  cache(
    async (): Promise<User | null> => {
      const result =
        await getCurrentUser();

      return result.user;
    },
  );

export const getCurrentUserId =
  cache(
    async (): Promise<string | null> => {
      const user =
        await getAuthenticatedUser();

      return user?.id ?? null;
    },
  );

export const isUserAuthenticated =
  cache(
    async (): Promise<boolean> => {
      const result =
        await getCurrentUser();

      return (
        result.isAuthenticated &&
        result.user !== null
      );
    },
  );

function normalizeAuthenticationError(
  message: string,
): string | null {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "auth session missing",
    ) ||
    normalizedMessage.includes(
      "session not found",
    ) ||
    normalizedMessage.includes(
      "refresh token",
    ) ||
    normalizedMessage.includes(
      "jwt expired",
    ) ||
    normalizedMessage.includes(
      "invalid jwt",
    ) ||
    normalizedMessage.includes(
      "user from sub claim",
    )
  ) {
    return null;
  }

  return (
    message.trim() ||
    "Unable to verify the current authentication session."
  );
}

function getUnknownErrorMessage(
  error: unknown,
): string | null {
  if (
    error instanceof Error
  ) {
    return normalizeAuthenticationError(
      error.message,
    );
  }

  return "Unable to verify the current authentication session.";
}