import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

export type HouseholdInvitationRole =
  Exclude<
    WorkspaceRoleDatabaseEnum,
    "owner"
  >;

export type HouseholdInvitationStatus =
  WorkspaceMembershipStatusDatabaseEnum;

export type HouseholdInvitationMember = {
  id:
    string;

  workspaceId:
    string;

  userId:
    string;

  email:
    string;

  displayName:
    string | null;

  role:
    HouseholdInvitationRole;

  status:
    HouseholdInvitationStatus;

  invitedBy:
    string | null;

  invitedAt:
    string | null;

  invitationExpiresAt:
    string | null;

  joinedAt:
    string | null;

  memberLabel:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

export type InviteHouseholdMemberInput = {
  displayName:
    string;

  email:
    string;

  role:
    HouseholdInvitationRole;

  memberLabel?:
    string;
};

export type InviteHouseholdMemberSuccess = {
  success:
    true;

  data: {
    membershipId:
      string;

    userId:
      string;

    workspaceId:
      string;

    displayName:
      string;

    email:
      string;

    role:
      HouseholdInvitationRole;

    status:
      "invited";

    invitedAt:
      string;

    invitationExpiresAt:
      string;

    emailId:
      string | null;
  };
};

export type InviteHouseholdMemberFailure = {
  success:
    false;

  error: {
    code:
      InviteHouseholdMemberErrorCode;

    message:
      string;

    field?:
      InviteHouseholdMemberField;
  };
};

export type InviteHouseholdMemberResult =
  | InviteHouseholdMemberSuccess
  | InviteHouseholdMemberFailure;

export type InviteHouseholdMemberErrorCode =
  | "invalid-display-name"
  | "invalid-email"
  | "invalid-role"
  | "workspace-not-found"
  | "workspace-inactive"
  | "workspace-not-shareable"
  | "permission-denied"
  | "cannot-invite-self"
  | "already-member"
  | "invitation-already-pending"
  | "invite-user-missing"
  | "invite-email-failed"
  | "membership-create-failed"
  | "membership-update-failed"
  | "unexpected-error";

export type InviteHouseholdMemberField =
  | "displayName"
  | "email"
  | "role"
  | "memberLabel";

export type InviteHouseholdMemberActionState = {
  status:
    | "idle"
    | "success"
    | "error";

  message:
    string;

  fieldErrors: {
    displayName?:
      string;

    email?:
      string;

    role?:
      string;

    memberLabel?:
      string;
  };

  invitation:
    InviteHouseholdMemberSuccess["data"] | null;
};

export const initialInviteHouseholdMemberActionState:
  InviteHouseholdMemberActionState = {
    status:
      "idle",

    message:
      "",

    fieldErrors: {},

    invitation:
      null,
  };

export const HOUSEHOLD_INVITATION_ROLES:
  readonly HouseholdInvitationRole[] = [
    "admin",
    "member",
    "viewer",
  ] as const;

export const DEFAULT_HOUSEHOLD_INVITATION_ROLE:
  HouseholdInvitationRole =
  "member";

export const HOUSEHOLD_INVITATION_EXPIRATION_HOURS =
  72;

export function isHouseholdInvitationRole(
  value:
    unknown,
): value is HouseholdInvitationRole {
  return (
    value ===
      "admin" ||
    value ===
      "member" ||
    value ===
      "viewer"
  );
}

export function getHouseholdInvitationRoleLabel(
  role:
    HouseholdInvitationRole,
): string {
  switch (
    role
  ) {
    case "admin":
      return "Administrator";

    case "member":
      return "Member";

    case "viewer":
      return "Viewer";
  }
}

export function getHouseholdInvitationRoleDescription(
  role:
    HouseholdInvitationRole,
): string {
  switch (
    role
  ) {
    case "admin":
      return "Can manage most household workspace settings, members, and shared financial data.";

    case "member":
      return "Can participate in the household workspace and manage shared financial information.";

    case "viewer":
      return "Can view permitted household financial information without making changes.";
  }
}