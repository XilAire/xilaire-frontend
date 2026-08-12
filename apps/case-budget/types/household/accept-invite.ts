export type AcceptHouseholdInviteActionState = {
  success:
    boolean;

  message:
    string | null;

  error:
    string | null;

  workspaceId:
    string | null;

  workspaceName:
    string | null;

  redirectTo:
    string | null;
};

export type AcceptHouseholdInviteInput = {
  password:
    string;

  confirmPassword:
    string;
};

export const initialAcceptHouseholdInviteActionState:
  AcceptHouseholdInviteActionState = {
    success:
      false,

    message:
      null,

    error:
      null,

    workspaceId:
      null,

    workspaceName:
      null,

    redirectTo:
      null,
  };