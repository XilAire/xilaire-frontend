import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

export type HouseholdMemberManagementAction =
  | "remove"
  | "block"
  | "unblock";

export type ManageHouseholdMemberInput = {
  membershipId:
    string;

  action:
    HouseholdMemberManagementAction;

  reason?:
    string;
};

export type ManageHouseholdMemberSuccess = {
  success:
    true;

  data: {
    membershipId:
      string;

    workspaceId:
      string;

    userId:
      string;

    role:
      WorkspaceRoleDatabaseEnum;

    previousStatus:
      WorkspaceMembershipStatusDatabaseEnum;

    status:
      WorkspaceMembershipStatusDatabaseEnum;

    action:
      HouseholdMemberManagementAction;

    changedAt:
      string;
  };
};

export type ManageHouseholdMemberErrorCode =
  | "invalid-membership"
  | "invalid-action"
  | "workspace-not-found"
  | "membership-not-found"
  | "permission-denied"
  | "cannot-manage-self"
  | "cannot-manage-owner"
  | "admin-protected"
  | "invalid-member-state"
  | "membership-update-failed"
  | "unexpected-error";

export type ManageHouseholdMemberFailure = {
  success:
    false;

  error: {
    code:
      ManageHouseholdMemberErrorCode;

    message:
      string;
  };
};

export type ManageHouseholdMemberResult =
  | ManageHouseholdMemberSuccess
  | ManageHouseholdMemberFailure;

export type HouseholdMemberManagementActionState = {
  status:
    | "idle"
    | "success"
    | "error";

  message:
    string;

  result:
    ManageHouseholdMemberSuccess["data"] | null;
};

export const initialHouseholdMemberManagementActionState:
  HouseholdMemberManagementActionState = {
    status:
      "idle",

    message:
      "",

    result:
      null,
  };

export function isHouseholdMemberManagementAction(
  value:
    unknown,
): value is HouseholdMemberManagementAction {
  return (
    value ===
      "remove" ||
    value ===
      "block" ||
    value ===
      "unblock"
  );
}