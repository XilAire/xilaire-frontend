"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveUniversityUser } from "@/lib/university/require-active-user";
import { getCurrentUserProfileSettings } from "@/lib/university/profile-settings";
import {
  getCurrentUniversityNotifications,
  markAllCurrentUniversityNotificationsRead,
  markCurrentUniversityNotificationRead,
  searchCurrentUniversityTopBar,
} from "@/lib/university/top-bar";

import type {
  UniversityTopBarBootstrap,
  UniversityTopBarSearchResult,
} from "@/lib/university/top-bar-types";

export async function getUniversityTopBarBootstrapAction(): Promise<UniversityTopBarBootstrap> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  /*
   * Public routes such as /courses use the shared application shell.
   *
   * Profile settings and notifications are authenticated resources,
   * so neither should be loaded when there is no current user.
   */
  if (error || !user) {
    return {
      display_name:
        "CASE University learner",

      email: "",

      notifications: {
        unread_count: 0,
        items: [],
      },
    };
  }

  await requireActiveUniversityUser();

  const [
    profileSettings,
    notifications,
  ] =
    await Promise.all([
      getCurrentUserProfileSettings(),
      getCurrentUniversityNotifications(
        20,
      ),
    ]);

  const displayName =
    profileSettings.profile.full_name?.trim() ||
    profileSettings.profile.email?.split(
      "@",
    )[0] ||
    "CASE University learner";

  return {
    display_name:
      displayName,

    email:
      profileSettings.profile.email,

    notifications,
  };
}

export async function searchUniversityTopBarAction(
  query: string,
): Promise<UniversityTopBarSearchResult[]> {
  await requireActiveUniversityUser();
  return searchCurrentUniversityTopBar(
    query,
    12,
  );
}

export async function markUniversityNotificationReadAction(
  notificationId: string,
): Promise<boolean> {
  await requireActiveUniversityUser();
  const normalizedId =
    notificationId.trim();

  if (!normalizedId) {
    throw new Error(
      "Notification ID is required.",
    );
  }

  return markCurrentUniversityNotificationRead(
    normalizedId,
  );
}

export async function markAllUniversityNotificationsReadAction(): Promise<number> {
  await requireActiveUniversityUser();
  return markAllCurrentUniversityNotificationsRead();
}