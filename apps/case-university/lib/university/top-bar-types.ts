export type UniversityTopBarSearchResultType =
  | "course"
  | "module"
  | "lesson";

export type UniversityTopBarSearchResult = {
  result_type: UniversityTopBarSearchResultType;
  entity_id: string;
  title: string;
  subtitle: string | null;
  href: string;
  course_slug: string | null;
  module_slug: string | null;
  lesson_slug: string | null;
};

export type UniversityNotificationType =
  | "system"
  | "course"
  | "lesson"
  | "practice"
  | "assessment"
  | "certificate";

export type UniversityNotification = {
  id: string;
  notification_type: UniversityNotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type UniversityNotificationFeed = {
  unread_count: number;
  items: UniversityNotification[];
};

export type UniversityTopBarBootstrap = {
  display_name: string;
  email: string | null;
  notifications: UniversityNotificationFeed;
};
