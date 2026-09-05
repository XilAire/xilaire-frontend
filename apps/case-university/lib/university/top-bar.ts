import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

import type {
  UniversityNotificationFeed,
  UniversityTopBarSearchResult,
} from "@/lib/university/top-bar-types";

async function requireAuthenticatedUser() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    throw new Error(
      "You must be signed in to use the CASE University top bar.",
    );
  }

  return user;
}

function normalizeNotificationFeed(
  value: unknown,
): UniversityNotificationFeed {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {
      unread_count: 0,
      items: [],
    };
  }

  const raw =
    value as {
      unread_count?: unknown;
      items?: unknown;
    };

  const unreadCount =
    Number(
      raw.unread_count ??
        0,
    );

  return {
    unread_count:
      Number.isFinite(
        unreadCount,
      )
        ? Math.max(
            0,
            unreadCount,
          )
        : 0,

    items:
      Array.isArray(
        raw.items,
      )
        ? (
            raw.items as UniversityNotificationFeed["items"]
          )
        : [],
  };
}

export async function getCurrentUniversityNotifications(
  limit = 20,
): Promise<UniversityNotificationFeed> {
  const user =
    await requireAuthenticatedUser();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "get_university_user_notifications",
      {
        p_user_id:
          user.id,

        p_limit:
          limit,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load CASE University notifications: ${error.message}`,
    );
  }

  return normalizeNotificationFeed(
    data,
  );
}

export async function searchCurrentUniversityTopBar(
  query: string,
  limit = 12,
): Promise<UniversityTopBarSearchResult[]> {
  const normalizedQuery =
    query.trim();

  if (
    normalizedQuery.length <
    2
  ) {
    return [];
  }

  const user =
    await requireAuthenticatedUser();

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "search_university_user_top_bar",
      {
        p_user_id:
          user.id,

        p_stripe_mode:
          stripeMode,

        p_query:
          normalizedQuery,

        p_limit:
          limit,
      },
    );

  if (error) {
    throw new Error(
      `Unable to search CASE University: ${error.message}`,
    );
  }

  return Array.isArray(
    data,
  )
    ? (
        data as UniversityTopBarSearchResult[]
      )
    : [];
}

export async function markCurrentUniversityNotificationRead(
  notificationId: string,
): Promise<boolean> {
  const user =
    await requireAuthenticatedUser();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "mark_university_user_notification_read",
      {
        p_user_id:
          user.id,

        p_notification_id:
          notificationId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to mark CASE University notification read: ${error.message}`,
    );
  }

  return data === true;
}

export async function markAllCurrentUniversityNotificationsRead(): Promise<number> {
  const user =
    await requireAuthenticatedUser();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "mark_all_university_user_notifications_read",
      {
        p_user_id:
          user.id,
      },
    );

  if (error) {
    throw new Error(
      `Unable to mark CASE University notifications read: ${error.message}`,
    );
  }

  const count =
    Number(
      data ??
        0,
    );

  return Number.isFinite(
    count,
  )
    ? Math.max(
        0,
        count,
      )
    : 0;
}
