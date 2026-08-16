import type {
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

export type HouseholdApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type HouseholdApprovalType =
  | "transaction"
  | "budget"
  | "bill"
  | "goal"
  | "account"
  | "member"
  | "security"
  | "other";

export type HouseholdApprovalDecision =
  | "approve"
  | "reject"
  | "cancel";

export type HouseholdApprovalActorRole =
  Extract<
    WorkspaceRoleDatabaseEnum,
    | "owner"
    | "admin"
    | "member"
    | "viewer"
  >;

export type HouseholdApprovalTargetReference = {
  entityType:
    string;

  entityId:
    string;
};

export type HouseholdApprovalRequest = {
  id:
    string;

  workspaceId:
    string;

  type:
    HouseholdApprovalType;

  status:
    HouseholdApprovalStatus;

  title:
    string;

  description:
    string;

  amount:
    number | null;

  requestedByUserId:
    string;

  requestedByName:
    string | null;

  requestedByRole:
    HouseholdApprovalActorRole | null;

  requestedAt:
    string;

  target:
    HouseholdApprovalTargetReference | null;

  payload:
    Record<
      string,
      unknown
    > | null;

  decisionByUserId:
    string | null;

  decisionByName:
    string | null;

  decisionByRole:
    HouseholdApprovalActorRole | null;

  decision:
    Exclude<
      HouseholdApprovalDecision,
      "cancel"
    > | null;

  decisionReason:
    string | null;

  decidedAt:
    string | null;

  cancelledByUserId:
    string | null;

  cancelledAt:
    string | null;

  cancellationReason:
    string | null;

  expiresAt:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

export type HouseholdApprovalSummary = {
  pendingCount:
    number;

  approvedCount:
    number;

  rejectedCount:
    number;

  cancelledCount:
    number;

  totalCount:
    number;
};

export type HouseholdApprovalFilter =
  | "pending"
  | "all"
  | "approved"
  | "rejected"
  | "cancelled";

export type HouseholdApprovalListResult =
  | {
      success:
        true;

      approvals:
        HouseholdApprovalRequest[];

      summary:
        HouseholdApprovalSummary;

      error:
        null;
    }
  | {
      success:
        false;

      approvals:
        [];

      summary:
        HouseholdApprovalSummary;

      error:
        string;
    };

export type CreateHouseholdApprovalInput = {
  type:
    HouseholdApprovalType;

  title:
    string;

  description:
    string;

  amount?:
    number | null;

  target?:
    HouseholdApprovalTargetReference | null;

  payload?:
    Record<
      string,
      unknown
    > | null;

  expiresAt?:
    string | null;
};

export type CreateHouseholdApprovalSuccess = {
  success:
    true;

  approval:
    HouseholdApprovalRequest;

  error:
    null;
};

export type CreateHouseholdApprovalFailure = {
  success:
    false;

  approval:
    null;

  error: {
    code:
      CreateHouseholdApprovalErrorCode;

    message:
      string;

    field?:
      CreateHouseholdApprovalField;
  };
};

export type CreateHouseholdApprovalResult =
  | CreateHouseholdApprovalSuccess
  | CreateHouseholdApprovalFailure;

export type CreateHouseholdApprovalErrorCode =
  | "invalid-type"
  | "invalid-title"
  | "invalid-description"
  | "invalid-amount"
  | "invalid-target"
  | "invalid-expiration"
  | "workspace-not-found"
  | "workspace-inactive"
  | "permission-denied"
  | "request-create-failed"
  | "unexpected-error";

export type CreateHouseholdApprovalField =
  | "type"
  | "title"
  | "description"
  | "amount"
  | "target"
  | "expiresAt";

export type DecideHouseholdApprovalInput = {
  approvalId:
    string;

  decision:
    Extract<
      HouseholdApprovalDecision,
      | "approve"
      | "reject"
    >;

  reason?:
    string;
};

export type DecideHouseholdApprovalSuccess = {
  success:
    true;

  approval:
    HouseholdApprovalRequest;

  error:
    null;
};

export type DecideHouseholdApprovalFailure = {
  success:
    false;

  approval:
    null;

  error: {
    code:
      DecideHouseholdApprovalErrorCode;

    message:
      string;
  };
};

export type DecideHouseholdApprovalResult =
  | DecideHouseholdApprovalSuccess
  | DecideHouseholdApprovalFailure;

export type DecideHouseholdApprovalErrorCode =
  | "invalid-approval"
  | "invalid-decision"
  | "approval-not-found"
  | "approval-not-pending"
  | "approval-expired"
  | "workspace-not-found"
  | "permission-denied"
  | "cannot-approve-own-request"
  | "decision-update-failed"
  | "protected-action-failed"
  | "unexpected-error";

export type CancelHouseholdApprovalInput = {
  approvalId:
    string;

  reason?:
    string;
};

export type CancelHouseholdApprovalSuccess = {
  success:
    true;

  approval:
    HouseholdApprovalRequest;

  error:
    null;
};

export type CancelHouseholdApprovalFailure = {
  success:
    false;

  approval:
    null;

  error: {
    code:
      CancelHouseholdApprovalErrorCode;

    message:
      string;
  };
};

export type CancelHouseholdApprovalResult =
  | CancelHouseholdApprovalSuccess
  | CancelHouseholdApprovalFailure;

export type CancelHouseholdApprovalErrorCode =
  | "invalid-approval"
  | "approval-not-found"
  | "approval-not-pending"
  | "permission-denied"
  | "cancel-update-failed"
  | "unexpected-error";

export type HouseholdApprovalActionState = {
  status:
    | "idle"
    | "success"
    | "error";

  message:
    string;

  approval:
    HouseholdApprovalRequest | null;
};

export const initialHouseholdApprovalActionState:
  HouseholdApprovalActionState = {
    status:
      "idle",

    message:
      "",

    approval:
      null,
  };

export type HouseholdApprovalPolicyType =
  | "transaction-threshold"
  | "budget-change"
  | "bill-change"
  | "goal-change"
  | "account-change"
  | "member-change"
  | "security-change";

export type HouseholdApprovalPolicy = {
  id:
    string;

  workspaceId:
    string;

  type:
    HouseholdApprovalPolicyType;

  enabled:
    boolean;

  thresholdAmount:
    number | null;

  approverRoles:
    HouseholdApprovalActorRole[];

  createdAt:
    string;

  updatedAt:
    string;
};

export type HouseholdApprovalPolicyInput = {
  type:
    HouseholdApprovalPolicyType;

  enabled:
    boolean;

  thresholdAmount?:
    number | null;

  approverRoles:
    HouseholdApprovalActorRole[];
};

export const HOUSEHOLD_APPROVAL_TYPES:
  readonly HouseholdApprovalType[] = [
    "transaction",
    "budget",
    "bill",
    "goal",
    "account",
    "member",
    "security",
    "other",
  ] as const;

export const HOUSEHOLD_APPROVAL_STATUSES:
  readonly HouseholdApprovalStatus[] = [
    "pending",
    "approved",
    "rejected",
    "cancelled",
  ] as const;

export const HOUSEHOLD_APPROVAL_FILTERS:
  readonly HouseholdApprovalFilter[] = [
    "pending",
    "all",
    "approved",
    "rejected",
    "cancelled",
  ] as const;

export const HOUSEHOLD_APPROVAL_POLICY_TYPES:
  readonly HouseholdApprovalPolicyType[] = [
    "transaction-threshold",
    "budget-change",
    "bill-change",
    "goal-change",
    "account-change",
    "member-change",
    "security-change",
  ] as const;

export function isHouseholdApprovalType(
  value:
    unknown,
): value is HouseholdApprovalType {
  return (
    value ===
      "transaction" ||
    value ===
      "budget" ||
    value ===
      "bill" ||
    value ===
      "goal" ||
    value ===
      "account" ||
    value ===
      "member" ||
    value ===
      "security" ||
    value ===
      "other"
  );
}

export function isHouseholdApprovalStatus(
  value:
    unknown,
): value is HouseholdApprovalStatus {
  return (
    value ===
      "pending" ||
    value ===
      "approved" ||
    value ===
      "rejected" ||
    value ===
      "cancelled"
  );
}

export function isHouseholdApprovalDecision(
  value:
    unknown,
): value is HouseholdApprovalDecision {
  return (
    value ===
      "approve" ||
    value ===
      "reject" ||
    value ===
      "cancel"
  );
}

export function isHouseholdApprovalFilter(
  value:
    unknown,
): value is HouseholdApprovalFilter {
  return (
    value ===
      "pending" ||
    value ===
      "all" ||
    value ===
      "approved" ||
    value ===
      "rejected" ||
    value ===
      "cancelled"
  );
}

export function isHouseholdApprovalPolicyType(
  value:
    unknown,
): value is HouseholdApprovalPolicyType {
  return (
    value ===
      "transaction-threshold" ||
    value ===
      "budget-change" ||
    value ===
      "bill-change" ||
    value ===
      "goal-change" ||
    value ===
      "account-change" ||
    value ===
      "member-change" ||
    value ===
      "security-change"
  );
}

export function getHouseholdApprovalTypeLabel(
  type:
    HouseholdApprovalType,
): string {
  switch (
    type
  ) {
    case "transaction":
      return "Transaction";

    case "budget":
      return "Budget";

    case "bill":
      return "Bill";

    case "goal":
      return "Goal";

    case "account":
      return "Account";

    case "member":
      return "Member";

    case "security":
      return "Security";

    case "other":
      return "Other";
  }
}

export function getHouseholdApprovalStatusLabel(
  status:
    HouseholdApprovalStatus,
): string {
  switch (
    status
  ) {
    case "pending":
      return "Pending";

    case "approved":
      return "Approved";

    case "rejected":
      return "Rejected";

    case "cancelled":
      return "Cancelled";
  }
}

export function getHouseholdApprovalPolicyLabel(
  type:
    HouseholdApprovalPolicyType,
): string {
  switch (
    type
  ) {
    case "transaction-threshold":
      return "Large transactions";

    case "budget-change":
      return "Budget changes";

    case "bill-change":
      return "Bill changes";

    case "goal-change":
      return "Goal changes";

    case "account-change":
      return "Account changes";

    case "member-change":
      return "Member changes";

    case "security-change":
      return "Sensitive actions";
  }
}