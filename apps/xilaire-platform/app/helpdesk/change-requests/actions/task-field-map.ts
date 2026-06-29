/* ---------------------------------------------------------
   FIELD MAP (UI → DB)
--------------------------------------------------------- */
export const TASK_FIELD_MAP = {
  title: "title",
  description: "description",

  assignedTo: "assigned_to",

  startDate: "start_date",
  endDate: "end_date",

  implementationPlan: "implementation_plan",
  preTestPlan: "pre_test_plan",
  postTestPlan: "post_test_plan",
  backoutPlan: "backout_plan",

  outageExpected: "outage_expected",
} as const;

export type TaskEditableField = keyof typeof TASK_FIELD_MAP;

/* ---------------------------------------------------------
   INPUT TYPE (SHARED WITH CLIENT)
--------------------------------------------------------- */
export interface CreateChangeTaskInput {
  changeRequestId: string;
  summary: string;
  description?: string;
  requiresApproval: boolean;

  assignedTo?: string | null;
  startDate?: string | null;
  endDate?: string | null;

  implementationPlan?: string;
  preTestPlan?: string;
  postTestPlan?: string;
  backoutPlan?: string;

  outageExpected?: boolean;
}
