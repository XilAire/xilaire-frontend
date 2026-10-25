/** Canonical lesson types enforced by university_lessons_lesson_type_check. */
export const UNIVERSITY_LESSON_TYPES = [
  { value: "lesson", label: "Standard Lesson" },
  { value: "video", label: "Video Lesson" },
  { value: "reading", label: "Reading" },
  { value: "interactive", label: "Interactive Lesson" },
] as const;

export type UniversityLessonType = (typeof UNIVERSITY_LESSON_TYPES)[number]["value"];

export function isUniversityLessonType(value: unknown): value is UniversityLessonType {
  return typeof value === "string" &&
    UNIVERSITY_LESSON_TYPES.some((option) => option.value === value);
}
