export type TaskStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "completed";

export interface ChangeRequestTask {
  id: string;
  title: string;
  status: TaskStatus;
  assigned_to_name?: string | null;
  due_date?: string | null;
}
