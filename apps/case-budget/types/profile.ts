export type UpdateProfileFieldErrors = {
  firstName?:
    string;

  lastName?:
    string;

  displayName?:
    string;
};

export type UpdateProfileActionState = {
  success:
    boolean;

  message:
    string;

  fieldErrors:
    UpdateProfileFieldErrors;
};

export const initialUpdateProfileActionState:
  UpdateProfileActionState = {
    success:
      false,

    message:
      "",

    fieldErrors: {},
  };

export type UpdateEmailFieldErrors = {
  email?:
    string;

  confirmEmail?:
    string;
};

export type UpdateEmailActionState = {
  success:
    boolean;

  message:
    string;

  fieldErrors:
    UpdateEmailFieldErrors;

  confirmationRequired:
    boolean;
};

export const initialUpdateEmailActionState:
  UpdateEmailActionState = {
    success:
      false,

    message:
      "",

    fieldErrors: {},

    confirmationRequired:
      false,
  };