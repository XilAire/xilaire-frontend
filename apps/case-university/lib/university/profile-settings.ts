import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";

export type UniversityProfileSettingsProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  theme: string;
  created_at: string;
  updated_at: string;
};

export type UniversityUserPreferences = {
  email_learning_updates: boolean;
  email_course_updates: boolean;
  show_learning_streak: boolean;
  show_recent_activity: boolean;
  default_practice_question_count: number;
  created_at: string;
  updated_at: string;
};

export type UniversityProfileSettings = {
  profile: UniversityProfileSettingsProfile;
  preferences: UniversityUserPreferences;
};

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to manage your CASE University profile.");
  }

  return user;
}

function normalizeProfileSettings(data: unknown): UniversityProfileSettings {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid profile/settings response.");
  }

  const value = data as UniversityProfileSettings;

  if (!value.profile || !value.preferences) {
    throw new Error("Invalid profile/settings response.");
  }

  return {
    profile: {
      ...value.profile,
      full_name:
        typeof value.profile.full_name === "string"
          ? value.profile.full_name
          : null,
      email:
        typeof value.profile.email === "string"
          ? value.profile.email
          : null,
      theme:
        typeof value.profile.theme === "string" && value.profile.theme
          ? value.profile.theme
          : "light",
    },
    preferences: {
      ...value.preferences,
      email_learning_updates:
        value.preferences.email_learning_updates === true,
      email_course_updates:
        value.preferences.email_course_updates === true,
      show_learning_streak:
        value.preferences.show_learning_streak === true,
      show_recent_activity:
        value.preferences.show_recent_activity === true,
      default_practice_question_count: Number(
        value.preferences.default_practice_question_count ?? 5,
      ),
    },
  };
}

export async function getCurrentUserProfileSettings(): Promise<UniversityProfileSettings> {
  const user = await requireAuthenticatedUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_profile_settings",
    { p_user_id: user.id },
  );

  if (error) {
    throw new Error(`Unable to load profile settings: ${error.message}`);
  }

  return normalizeProfileSettings(data);
}

export async function updateCurrentUserProfile(
  fullName: string,
): Promise<UniversityProfileSettingsProfile> {
  const user = await requireAuthenticatedUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "update_university_user_profile",
    {
      p_user_id: user.id,
      p_full_name: fullName,
    },
  );

  if (error) {
    throw new Error(`Unable to update profile: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to update profile: invalid database response.");
  }

  return data as UniversityProfileSettingsProfile;
}

export async function updateCurrentUserSettings(input: {
  theme: string;
  emailLearningUpdates: boolean;
  emailCourseUpdates: boolean;
  showLearningStreak: boolean;
  showRecentActivity: boolean;
  defaultPracticeQuestionCount: number;
}): Promise<UniversityProfileSettings> {
  const user = await requireAuthenticatedUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "update_university_user_settings",
    {
      p_user_id: user.id,
      p_theme: input.theme,
      p_email_learning_updates: input.emailLearningUpdates,
      p_email_course_updates: input.emailCourseUpdates,
      p_show_learning_streak: input.showLearningStreak,
      p_show_recent_activity: input.showRecentActivity,
      p_default_practice_question_count: input.defaultPracticeQuestionCount,
    },
  );

  if (error) {
    throw new Error(`Unable to update settings: ${error.message}`);
  }

  return normalizeProfileSettings(data);
}
