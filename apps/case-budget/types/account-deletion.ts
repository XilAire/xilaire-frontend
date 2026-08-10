export type DeleteAccountFieldErrors = {
  confirmation?:
    string;
};

export type DeleteAccountActionState = {
  success:
    boolean;

  message:
    string;

  fieldErrors:
    DeleteAccountFieldErrors;

  requiresOwnershipTransfer:
    boolean;
};

export const initialDeleteAccountActionState:
  DeleteAccountActionState = {
    success:
      false,

    message:
      "",

    fieldErrors: {},

    requiresOwnershipTransfer:
      false,
  };