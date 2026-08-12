"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  inviteHouseholdMemberAction,
} from "@/actions/household/invite-member";

import {
  DEFAULT_HOUSEHOLD_INVITATION_ROLE,
  HOUSEHOLD_INVITATION_ROLES,
  getHouseholdInvitationRoleDescription,
  getHouseholdInvitationRoleLabel,
  initialInviteHouseholdMemberActionState,
  type HouseholdInvitationRole,
} from "@/types/household/invitation";

export type InviteMemberModalProps = {
  open:
    boolean;

  workspaceName:
    string;

  onClose:
    () => void;

  onInvitationSent?:
    () => void;
};

export default function InviteMemberModal({
  open,
  workspaceName,
  onClose,
  onInvitationSent,
}: InviteMemberModalProps) {
  const formRef =
    useRef<HTMLFormElement | null>(
      null,
    );

  const emailInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    selectedRole,
    setSelectedRole,
  ] =
    useState<HouseholdInvitationRole>(
      DEFAULT_HOUSEHOLD_INVITATION_ROLE,
    );

  const [
    state,
    formAction,
    isPending,
  ] =
    useActionState(
      inviteHouseholdMemberAction,
      initialInviteHouseholdMemberActionState,
    );

  const selectedRoleDescription =
    useMemo(
      () =>
        getHouseholdInvitationRoleDescription(
          selectedRole,
        ),
      [
        selectedRole,
      ],
    );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      const timeoutId =
        window.setTimeout(
          () => {
            emailInputRef.current?.focus();
          },
          50,
        );

      return () => {
        window.clearTimeout(
          timeoutId,
        );
      };
    },
    [
      open,
    ],
  );

  useEffect(
    () => {
      if (
        state.status !==
        "success"
      ) {
        return;
      }

      formRef.current?.reset();

      setSelectedRole(
        DEFAULT_HOUSEHOLD_INVITATION_ROLE,
      );

      onInvitationSent?.();
    },
    [
      onInvitationSent,
      state.status,
    ],
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (
          isPending
        ) {
          return;
        }

        onClose();
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isPending,
      onClose,
      open,
    ],
  );

  if (
    !open
  ) {
    return null;
  }

  const emailError =
    state.fieldErrors.email;

  const roleError =
    state.fieldErrors.role;

  const memberLabelError =
    state.fieldErrors.memberLabel;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 px-0 py-0 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-6"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target !==
            event.currentTarget ||
          isPending
        ) {
          return;
        }

        onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        aria-describedby="invite-member-description"
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Household access
              </p>

              <h2
                id="invite-member-title"
                className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]"
              >
                Invite member
              </h2>

              <p
                id="invite-member-description"
                className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
              >
                Invite someone to collaborate in{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {
                    workspaceName
                  }
                </span>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isPending
              }
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close invite member dialog"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <form
          ref={
            formRef
          }
          action={
            formAction
          }
          className="space-y-6 px-5 py-6 sm:px-6"
        >
          {state.status ===
          "success" ? (
            <SuccessNotice
              message={
                state.message
              }
            />
          ) : null}

          {state.status ===
            "error" &&
          state.message ? (
            <ErrorNotice
              message={
                state.message
              }
            />
          ) : null}

          <div>
            <label
              htmlFor="invite-member-email"
              className="block text-sm font-bold text-[var(--text-primary)]"
            >
              Email address
            </label>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              We will send a secure CASE Budget invitation to this address.
            </p>

            <div className="mt-3">
              <input
                ref={
                  emailInputRef
                }
                id="invite-member-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                disabled={
                  isPending
                }
                aria-invalid={
                  Boolean(
                    emailError,
                  )
                }
                aria-describedby={
                  emailError
                    ? "invite-member-email-error"
                    : undefined
                }
                className={[
                  "min-h-12 w-full rounded-xl border bg-[var(--surface-subtle)] px-4 text-sm text-[var(--text-primary)] outline-none transition",
                  "placeholder:text-[var(--text-muted)]",
                  "focus:ring-2 focus:ring-[var(--focus-ring)]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  emailError
                    ? "border-[var(--danger)]"
                    : "border-[var(--border-subtle)]",
                ].join(
                  " ",
                )}
              />
            </div>

            {emailError ? (
              <p
                id="invite-member-email-error"
                className="mt-2 text-xs font-semibold text-[var(--danger)]"
              >
                {
                  emailError
                }
              </p>
            ) : null}
          </div>

          <div>
            <fieldset>
              <legend className="text-sm font-bold text-[var(--text-primary)]">
                Workspace role
              </legend>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                Choose how much access this person should have.
              </p>

              <input
                type="hidden"
                name="role"
                value={
                  selectedRole
                }
              />

              <div className="mt-3 grid gap-3">
                {HOUSEHOLD_INVITATION_ROLES.map(
                  (
                    role,
                  ) => {
                    const isSelected =
                      selectedRole ===
                      role;

                    return (
                      <button
                        key={
                          role
                        }
                        type="button"
                        onClick={() => {
                          setSelectedRole(
                            role,
                          );
                        }}
                        disabled={
                          isPending
                        }
                        aria-pressed={
                          isSelected
                        }
                        className={[
                          "flex w-full items-start gap-4 rounded-2xl border p-4 text-left outline-none transition",
                          "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected
                            ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-default))]"
                            : "border-[var(--border-subtle)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]",
                        ].join(
                          " ",
                        )}
                      >
                        <span
                          className={[
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                              : "border-[var(--border-strong)] bg-[var(--surface-default)]",
                          ].join(
                            " ",
                          )}
                        >
                          {isSelected ? (
                            <CheckIcon />
                          ) : null}
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[var(--text-primary)]">
                            {
                              getHouseholdInvitationRoleLabel(
                                role,
                              )
                            }
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                            {
                              getHouseholdInvitationRoleDescription(
                                role,
                              )
                            }
                          </span>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              {roleError ? (
                <p className="mt-2 text-xs font-semibold text-[var(--danger)]">
                  {
                    roleError
                  }
                </p>
              ) : null}
            </fieldset>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                <ShieldIcon />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {
                    getHouseholdInvitationRoleLabel(
                      selectedRole,
                    )
                  }{" "}
                  access
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  {
                    selectedRoleDescription
                  }
                </p>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="invite-member-label"
              className="block text-sm font-bold text-[var(--text-primary)]"
            >
              Member label
              <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                Optional
              </span>
            </label>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Add a household label such as Spouse, Parent, or Advisor.
            </p>

            <input
              id="invite-member-label"
              name="memberLabel"
              type="text"
              maxLength={
                80
              }
              placeholder="Example: Spouse"
              disabled={
                isPending
              }
              aria-invalid={
                Boolean(
                  memberLabelError,
                )
              }
              aria-describedby={
                memberLabelError
                  ? "invite-member-label-error"
                  : undefined
              }
              className={[
                "mt-3 min-h-12 w-full rounded-xl border bg-[var(--surface-subtle)] px-4 text-sm text-[var(--text-primary)] outline-none transition",
                "placeholder:text-[var(--text-muted)]",
                "focus:ring-2 focus:ring-[var(--focus-ring)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                memberLabelError
                  ? "border-[var(--danger)]"
                  : "border-[var(--border-subtle)]",
              ].join(
                " ",
              )}
            />

            {memberLabelError ? (
              <p
                id="invite-member-label-error"
                className="mt-2 text-xs font-semibold text-[var(--danger)]"
              >
                {
                  memberLabelError
                }
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface-default))] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[var(--primary)]">
                <MailIcon />
              </span>

              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Secure invitation
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  CASE Budget will email a secure invitation link. The invitation expires after 72 hours if it is not accepted.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isPending
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            {state.status ===
            "success" ? (
              <button
                type="button"
                onClick={
                  onClose
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Done
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  isPending
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <LoadingSpinner />

                    Sending invitation...
                  </>
                ) : (
                  <>
                    <SendIcon />

                    Send invitation
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function SuccessNotice({
  message,
}: {
  message:
    string;
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_35%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface-default))] p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
          <CheckIcon />
        </span>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Invitation sent
          </p>

          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {
              message
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorNotice({
  message,
}: {
  message:
    string;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface-default))] p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <AlertIcon />
        </span>

        <div>
          <p className="text-sm font-bold text-[var(--danger)]">
            Invitation could not be sent
          </p>

          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {
              message
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.3"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}