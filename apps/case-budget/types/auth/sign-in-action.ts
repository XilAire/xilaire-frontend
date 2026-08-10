export type SignInActionFieldErrors = {
  email?: string;
  password?: string;
};

export type SignInActionState = {
  success: boolean;
  message: string;
  fieldErrors: SignInActionFieldErrors;
  userId: string | null;
};

export const initialSignInActionState:
  SignInActionState = {
    success: false,
    message: "",
    fieldErrors: {},
    userId: null,
  };