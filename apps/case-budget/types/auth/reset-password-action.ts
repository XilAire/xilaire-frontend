export type ResetPasswordActionFieldErrors = {
  email?: string;
};

export type ResetPasswordActionState = {
  success: boolean;
  message: string;
  fieldErrors: ResetPasswordActionFieldErrors;
};

export const initialResetPasswordActionState:
  ResetPasswordActionState = {
    success: false,
    message: "",
    fieldErrors: {},
  };