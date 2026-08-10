export type SignUpActionFieldErrors = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  workspaceName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  termsAccepted?: string;
};

export type SignUpActionState = {
  success: boolean;
  message: string;
  fieldErrors: SignUpActionFieldErrors;
  requiresEmailConfirmation: boolean;
  userId: string | null;
  workspaceId: string | null;
};

export const initialSignUpActionState:
  SignUpActionState = {
    success: false,
    message: "",
    fieldErrors: {},
    requiresEmailConfirmation: false,
    userId: null,
    workspaceId: null,
  };