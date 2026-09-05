export type UniversityCourseStatus =
  | "draft"
  | "published"
  | "archived";

export type UniversityDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type UniversityLessonType =
  | "lesson"
  | "quiz"
  | "worksheet"
  | "assessment";

export type UniversityEnrollmentStatus =
  | "active"
  | "completed"
  | "paused";

export type UniversityLessonProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type UniversityLessonContentBlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "list"
  | "image"
  | "video"
  | "example"
  | "definition"
  | "warning"
  | "summary";

export interface UniversityLessonContentBlock {
  id?: string;
  type: UniversityLessonContentBlockType;
  title?: string;
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  metadata?: Record<string, unknown>;
}

export interface UniversityLessonContent {
  blocks?: UniversityLessonContentBlock[];
  summary?: string;
  objectives?: string[];
  keyTerms?: string[];
  metadata?: Record<string, unknown>;
}

export interface UniversityCourse {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  status: UniversityCourseStatus;
  difficulty: UniversityDifficulty;
  estimated_minutes: number | null;
  sort_order: number;
  thumbnail_url: string | null;
  is_featured: boolean;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityModule {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: UniversityCourseStatus;
  sort_order: number;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityLesson {
  id: string;
  course_id: string;
  module_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  content: UniversityLessonContent;
  status: UniversityCourseStatus;
  lesson_type: UniversityLessonType;
  sort_order: number;
  estimated_minutes: number | null;
  video_url: string | null;
  is_preview: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: UniversityEnrollmentStatus;
  progress_percent: number;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityLessonProgress {
  id: string;
  user_id: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  status: UniversityLessonProgressStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityModuleWithLessons
  extends UniversityModule {
  lessons: UniversityLesson[];
}

export interface UniversityCourseWithModules
  extends UniversityCourse {
  modules: UniversityModuleWithLessons[];
}

export interface UniversityCourseSummary
  extends UniversityCourse {
  module_count: number;
  lesson_count: number;
}

export interface UniversityCourseProgress {
  course_id: string;
  enrollment: UniversityEnrollment | null;
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
}

export interface UniversityDashboardCourse {
  course: UniversityCourse;
  enrollment: UniversityEnrollment | null;
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
  next_lesson: UniversityLesson | null;
}