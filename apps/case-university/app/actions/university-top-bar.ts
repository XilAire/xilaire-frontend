"use server";

import {
  getCurrentUniversityNotifications,
  markAllCurrentUniversityNotificationsRead,
  markCurrentUniversityNotificationRead,
  searchCurrentUniversityTopBar,
} from "@/lib/university/top-bar";
import { getCurrentUserProfileSettings } from "@/lib/university/profile-settings";

import type {
  UniversityTopBarBootstrap,
  UniversityTopBarSearchResult,
} from "@/lib/university/top-bar-types";

export async function getUniversityTopBarBootstrapAction(): Promise<UniversityTopBarBootstrap> {
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
  return searchCurrentUniversityTopBar(
    query,
    12,
  );
}

export async function markUniversityNotificationReadAction(
  notificationId: string,
): Promise<boolean> {
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
  return markAllCurrentUniversityNotificationsRead();
}
