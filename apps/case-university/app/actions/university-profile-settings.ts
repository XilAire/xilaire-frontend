"use server";

import { revalidatePath } from "next/cache";

import {
  getCurrentUserProfileSettings,
  updateCurrentUserProfile,
  updateCurrentUserSettings,
} from "@/lib/university/profile-settings";

export type UniversityFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function checkboxValue(
  formData: FormData,
  name: string,
) {
  return formData.get(name) === "on";
}

export async function updateUniversityProfileAction(
  _previousState: UniversityFormState,
  formData: FormData,
): Promise<UniversityFormState> {
  try {
    const fullName = String(
      formData.get("full_name") ?? "",
    ).trim();

    if (fullName.length > 120) {
      return {
        status: "error",
        message: "Your name must be 120 characters or fewer.",
      };
    }

    await updateCurrentUserProfile(fullName);

    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/certificates");

    return {
      status: "success",
      message: "Profile updated successfully.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to update your profile.",
    };
  }
}

export async function updateUniversitySettingsAction(
  _previousState: UniversityFormState,
  formData: FormData,
): Promise<UniversityFormState> {
  try {
    const theme = String(
      formData.get("theme") ?? "",
    )
      .trim()
      .toLowerCase();

    const defaultPracticeQuestionCount = Number(
      formData.get(
        "default_practice_question_count",
      ) ?? 5,
    );

    if (!theme) {
      return {
        status: "error",
        message: "Choose a theme.",
      };
    }

    if (
      !Number.isInteger(
        defaultPracticeQuestionCount,
      ) ||
      defaultPracticeQuestionCount < 5 ||
      defaultPracticeQuestionCount > 20
    ) {
      return {
        status: "error",
        message:
          "Practice question count must be between 5 and 20.",
      };
    }

    await updateCurrentUserSettings({
      theme,
      emailLearningUpdates: checkboxValue(
        formData,
        "email_learning_updates",
      ),
      emailCourseUpdates: checkboxValue(
        formData,
        "email_course_updates",
      ),
      showLearningStreak: checkboxValue(
        formData,
        "show_learning_streak",
      ),
      showRecentActivity: checkboxValue(
        formData,
        "show_recent_activity",
      ),
      defaultPracticeQuestionCount,
    });

    revalidatePath("/settings");
    revalidatePath("/profile");
    revalidatePath("/practice");
    revalidatePath("/progress");

    return {
      status: "success",
      message: "Settings updated successfully.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to update your settings.",
    };
  }
}

export async function updateUniversityThemePreferenceAction(
  theme: "light" | "dark",
): Promise<void> {
  const current =
    await getCurrentUserProfileSettings();

  await updateCurrentUserSettings({
    theme,
    emailLearningUpdates:
      current.preferences.email_learning_updates,
    emailCourseUpdates:
      current.preferences.email_course_updates,
    showLearningStreak:
      current.preferences.show_learning_streak,
    showRecentActivity:
      current.preferences.show_recent_activity,
    defaultPracticeQuestionCount:
      current.preferences.default_practice_question_count,
  });

  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/practice");
  revalidatePath("/progress");
}
