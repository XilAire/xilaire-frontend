"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useInvestments,
  type CreateInvestmentAccountData,
  type InvestmentAccountData,
  type InvestmentAccountType,
  type InvestmentConnectionStatus,
  type UpdateInvestmentAccountData,
} from "@/components/providers/InvestmentsProvider";

export type AddInvestmentAccountModalProps = {
  isOpen: boolean;

  account?: InvestmentAccountData | null;

  onClose: () => void;

  onSaved?: (
    account:
      InvestmentAccountData,
  ) => void;
};

type InvestmentAccountFormState = {
  name: string;
  institution: string;
  type: InvestmentAccountType;
  linkedAccountId: string;
  currency: string;
  cashBalance: string;
  isIncludedInNetWorth: boolean;
  connectionStatus: InvestmentConnectionStatus;
  lastSyncedAt: string;
  notes: string;
};

type InvestmentAccountFormErrors = Partial<
  Record<
    keyof InvestmentAccountFormState,
    string
  >
>;

const DEFAULT_FORM_STATE:
  InvestmentAccountFormState = {
    name: "",
    institution: "",
    type: "brokerage",
    linkedAccountId: "",
    currency: "USD",
    cashBalance: "",
    isIncludedInNetWorth: true,
    connectionStatus: "manual",
    lastSyncedAt: "",
    notes: "",
  };

export default function AddInvestmentAccountModal({
  isOpen,
  account = null,
  onClose,
  onSaved,
}: AddInvestmentAccountModalProps) {
  const {
    accounts,
  } = useAccounts();

  const {
    addInvestmentAccount,
    updateInvestmentAccount,
    getInvestmentAccountById,
  } = useInvestments();

  const [
    formState,
    setFormState,
  ] = useState<InvestmentAccountFormState>(
    DEFAULT_FORM_STATE,
  );

  const [
    errors,
    setErrors,
  ] = useState<InvestmentAccountFormErrors>(
    {},
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );

  const isEditMode =
    Boolean(
      account,
    );

  const title =
    isEditMode
      ? "Edit Investment Account"
      : "Add Investment Account";

  const submitLabel =
    isEditMode
      ? "Save Changes"
      : "Add Account";

  const linkedAccountOptions =
    useMemo(
      () =>
        accounts
          .filter(
            (
              currentAccount,
            ) =>
              currentAccount.classification ===
              "asset",
          )
          .sort(
            (
              firstAccount,
              secondAccount,
            ) =>
              firstAccount.name.localeCompare(
                secondAccount.name,
              ),
          ),
      [
        accounts,
      ],
    );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      if (
        account
      ) {
        setFormState(
          createFormStateFromAccount(
            account,
          ),
        );
      } else {
        setFormState(
          DEFAULT_FORM_STATE,
        );
      }

      setErrors(
        {},
      );

      setIsSubmitting(
        false,
      );
    },
    [
      account,
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleEscape(
        event:
          globalThis.KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape" &&
          !isSubmitting
        ) {
          onClose();
        }
      }

      window.addEventListener(
        "keydown",
        handleEscape,
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleEscape,
        );
      };
    },
    [
      isOpen,
      isSubmitting,
      onClose,
    ],
  );

  if (
    !isOpen
  ) {
    return null;
  }

  function updateField<
    FieldName extends keyof InvestmentAccountFormState,
  >(
    fieldName:
      FieldName,
    value:
      InvestmentAccountFormState[FieldName],
  ) {
    setFormState(
      (
        currentState,
      ) => ({
        ...currentState,
        [fieldName]:
          value,
      }),
    );

    setErrors(
      (
        currentErrors,
      ) => {
        if (
          !currentErrors[
            fieldName
          ]
        ) {
          return currentErrors;
        }

        const nextErrors = {
          ...currentErrors,
        };

        delete nextErrors[
          fieldName
        ];

        return nextErrors;
      },
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors =
      validateFormState(
        formState,
      );

    if (
      Object.keys(
        nextErrors,
      ).length >
      0
    ) {
      setErrors(
        nextErrors,
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      if (
        account
      ) {
        const updates:
          UpdateInvestmentAccountData = {
            name:
              formState.name.trim(),

            institution:
              normalizeOptionalText(
                formState.institution,
              ),

            type:
              formState.type,

            linkedAccountId:
              normalizeOptionalText(
                formState.linkedAccountId,
              ),

            currency:
              formState.currency
                .trim()
                .toUpperCase(),

            cashBalance:
              parseCurrencyInput(
                formState.cashBalance,
              ),

            isIncludedInNetWorth:
              formState.isIncludedInNetWorth,

            connectionStatus:
              formState.connectionStatus,

            lastSyncedAt:
              normalizeOptionalDateTime(
                formState.lastSyncedAt,
              ),

            notes:
              normalizeOptionalText(
                formState.notes,
              ),
          };

        await updateInvestmentAccount(
          account.id,
          updates,
        );

        const savedAccount =
          getInvestmentAccountById(
            account.id,
          ) ?? {
            ...account,
            ...updates,
            updatedAt:
              new Date().toISOString(),
          };

        onSaved?.(
          savedAccount,
        );
      } else {
        const input:
          CreateInvestmentAccountData = {
            name:
              formState.name.trim(),

            institution:
              normalizeOptionalText(
                formState.institution,
              ),

            type:
              formState.type,

            linkedAccountId:
              normalizeOptionalText(
                formState.linkedAccountId,
              ),

            currency:
              formState.currency
                .trim()
                .toUpperCase(),

            cashBalance:
              parseCurrencyInput(
                formState.cashBalance,
              ),

            isIncludedInNetWorth:
              formState.isIncludedInNetWorth,

            connectionStatus:
              formState.connectionStatus,

            lastSyncedAt:
              normalizeOptionalDateTime(
                formState.lastSyncedAt,
              ),

            notes:
              normalizeOptionalText(
                formState.notes,
              ),
          };

        const newAccount =
          await addInvestmentAccount(
            input,
          );

        onSaved?.(
          newAccount,
        );
      }

      onClose();
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  function handleDialogKeyDown(
    event:
      KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      event.key !==
      "Tab"
    ) {
      return;
    }

    const dialog =
      event.currentTarget;

    const focusableElements =
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "[tabindex]:not([tabindex='-1'])",
          ].join(
            ",",
          ),
        ),
      );

    if (
      focusableElements.length ===
      0
    ) {
      return;
    }

    const firstElement =
      focusableElements[
        0
      ];

    const lastElement =
      focusableElements[
        focusableElements.length -
          1
      ];

    if (
      event.shiftKey &&
      document.activeElement ===
        firstElement
    ) {
      event.preventDefault();

      lastElement.focus();

      return;
    }

    if (
      !event.shiftKey &&
      document.activeElement ===
        lastElement
    ) {
      event.preventDefault();

      firstElement.focus();
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="investment-account-modal-title"
        aria-describedby="investment-account-modal-description"
        onKeyDown={
          handleDialogKeyDown
        }
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">
              Investments
            </p>

            <h2
              id="investment-account-modal-title"
              className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
            >
              {title}
            </h2>

            <p
              id="investment-account-modal-description"
              className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]"
            >
              Add account details,
              current cash balance,
              linked financial account,
              and net-worth preferences.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isSubmitting
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close investment account modal"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-6">
              <FormSection
                title="Account Details"
                description="Basic information about the investment account."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Account name"
                    required
                    error={
                      errors.name
                    }
                  >
                    <input
                      autoFocus
                      type="text"
                      value={
                        formState.name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "name",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Example: Fidelity Brokerage"
                      className={getInputClassName(
                        Boolean(
                          errors.name,
                        ),
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Institution"
                    error={
                      errors.institution
                    }
                  >
                    <input
                      type="text"
                      value={
                        formState.institution
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "institution",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Example: Fidelity"
                      className={getInputClassName(
                        Boolean(
                          errors.institution,
                        ),
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Account type"
                    required
                    error={
                      errors.type
                    }
                  >
                    <select
                      value={
                        formState.type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "type",
                          event.target
                            .value as InvestmentAccountType,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.type,
                        ),
                      )}
                    >
                      {getAccountTypeOptions().map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  <FormField
                    label="Connection status"
                    required
                    error={
                      errors.connectionStatus
                    }
                  >
                    <select
                      value={
                        formState.connectionStatus
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "connectionStatus",
                          event.target
                            .value as InvestmentConnectionStatus,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.connectionStatus,
                        ),
                      )}
                    >
                      {getConnectionStatusOptions().map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                title="Balance and Linking"
                description="Set the current cash balance and optionally connect this investment account to another financial account."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Cash balance"
                    required
                    error={
                      errors.cashBalance
                    }
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[var(--text-muted)]">
                        $
                      </span>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          formState.cashBalance
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "cashBalance",
                            sanitizeCurrencyInput(
                              event.target
                                .value,
                            ),
                          )
                        }
                        placeholder="0.00"
                        className={[
                          getInputClassName(
                            Boolean(
                              errors.cashBalance,
                            ),
                          ),
                          "pl-7",
                        ].join(
                          " ",
                        )}
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Currency"
                    required
                    error={
                      errors.currency
                    }
                  >
                    <input
                      type="text"
                      maxLength={
                        3
                      }
                      value={
                        formState.currency
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "currency",
                          event.target
                            .value
                            .replace(
                              /[^a-zA-Z]/g,
                              "",
                            )
                            .toUpperCase(),
                        )
                      }
                      placeholder="USD"
                      className={getInputClassName(
                        Boolean(
                          errors.currency,
                        ),
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Linked financial account"
                    error={
                      errors.linkedAccountId
                    }
                  >
                    <select
                      value={
                        formState.linkedAccountId
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "linkedAccountId",
                          event.target
                            .value,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.linkedAccountId,
                        ),
                      )}
                    >
                      <option value="">
                        Not linked
                      </option>

                      {linkedAccountOptions.map(
                        (
                          linkedAccount,
                        ) => (
                          <option
                            key={
                              linkedAccount.id
                            }
                            value={
                              linkedAccount.id
                            }
                          >
                            {linkedAccount.name}
                            {linkedAccount.institution
                              ? ` · ${linkedAccount.institution}`
                              : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  <FormField
                    label="Last synced"
                    error={
                      errors.lastSyncedAt
                    }
                  >
                    <input
                      type="datetime-local"
                      value={
                        formState.lastSyncedAt
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "lastSyncedAt",
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        formState.connectionStatus ===
                        "manual"
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.lastSyncedAt,
                        ),
                      )}
                    />
                  </FormField>
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                  <input
                    type="checkbox"
                    checked={
                      formState.isIncludedInNetWorth
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "isIncludedInNetWorth",
                        event.target
                          .checked,
                      )
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />

                  <span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">
                      Include in net worth
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                      Include this
                      account’s cash and
                      holdings value in
                      net-worth totals.
                    </span>
                  </span>
                </label>
              </FormSection>

              <FormSection
                title="Notes"
                description="Add any optional details about the account."
              >
                <FormField
                  label="Notes"
                  error={
                    errors.notes
                  }
                >
                  <textarea
                    rows={
                      4
                    }
                    value={
                      formState.notes
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "notes",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Optional account notes"
                    className={[
                      getInputClassName(
                        Boolean(
                          errors.notes,
                        ),
                      ),
                      "min-h-28 resize-y py-3",
                    ].join(
                      " ",
                    )}
                  />
                </FormField>
              </FormSection>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />

                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon />

                  {submitLabel}
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

type FormSectionProps = {
  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
};

function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section>
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

type FormFieldProps = {
  label:
    string;

  required?:
    boolean;

  error?:
    string;

  children:
    React.ReactNode;
};

function FormField({
  label,
  required = false,
  error,
  children,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-sm font-bold text-[var(--text-primary)]">
        {label}

        {required ? (
          <span className="text-[var(--danger)]">
            *
          </span>
        ) : null}
      </span>

      <span className="mt-2 block">
        {children}
      </span>

      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-[var(--danger)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function validateFormState(
  formState:
    InvestmentAccountFormState,
) {
  const nextErrors:
    InvestmentAccountFormErrors = {};

  if (
    !formState.name.trim()
  ) {
    nextErrors.name =
      "Enter an account name.";
  }

  if (
    formState.name.trim().length >
    100
  ) {
    nextErrors.name =
      "Account name must be 100 characters or fewer.";
  }

  if (
    formState.institution.trim().length >
    100
  ) {
    nextErrors.institution =
      "Institution must be 100 characters or fewer.";
  }

  if (
    !formState.currency.trim()
  ) {
    nextErrors.currency =
      "Enter a currency code.";
  } else if (
    !/^[A-Z]{3}$/.test(
      formState.currency
        .trim()
        .toUpperCase(),
    )
  ) {
    nextErrors.currency =
      "Currency must be a three-letter code such as USD.";
  }

  const cashBalance =
    parseCurrencyInput(
      formState.cashBalance,
    );

  if (
    !Number.isFinite(
      cashBalance,
    )
  ) {
    nextErrors.cashBalance =
      "Enter a valid cash balance.";
  }

  if (
    cashBalance <
    0
  ) {
    nextErrors.cashBalance =
      "Cash balance cannot be negative.";
  }

  if (
    formState.notes.length >
    1000
  ) {
    nextErrors.notes =
      "Notes must be 1,000 characters or fewer.";
  }

  return nextErrors;
}

function createFormStateFromAccount(
  account:
    InvestmentAccountData,
): InvestmentAccountFormState {
  return {
    name:
      account.name,

    institution:
      account.institution ??
      "",

    type:
      account.type,

    linkedAccountId:
      account.linkedAccountId ??
      "",

    currency:
      account.currency,

    cashBalance:
      formatEditableCurrency(
        account.cashBalance,
      ),

    isIncludedInNetWorth:
      account.isIncludedInNetWorth,

    connectionStatus:
      account.connectionStatus,

    lastSyncedAt:
      formatDateTimeLocal(
        account.lastSyncedAt,
      ),

    notes:
      account.notes ??
      "",
  };
}

function getInputClassName(
  hasError:
    boolean,
) {
  return [
    "h-11 w-full rounded-xl border bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60",
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]"
      : "border-[var(--border-default)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]",
  ].join(
    " ",
  );
}

function parseCurrencyInput(
  value:
    string,
) {
  const normalizedValue =
    value
      .replace(
        /,/g,
        "",
      )
      .trim();

  if (
    !normalizedValue
  ) {
    return 0;
  }

  return Number(
    normalizedValue,
  );
}

function sanitizeCurrencyInput(
  value:
    string,
) {
  const sanitizedValue =
    value.replace(
      /[^0-9.]/g,
      "",
    );

  const [
    wholePart,
    ...decimalParts
  ] =
    sanitizedValue.split(
      ".",
    );

  if (
    decimalParts.length ===
    0
  ) {
    return wholePart;
  }

  return `${wholePart}.${decimalParts
    .join(
      "",
    )
    .slice(
      0,
      2,
    )}`;
}

function formatEditableCurrency(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return "0.00";
  }

  return value.toFixed(
    2,
  );
}

function normalizeOptionalText(
  value:
    string,
) {
  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeOptionalDateTime(
  value:
    string,
) {
  if (
    !value
  ) {
    return undefined;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  return date.toISOString();
}

function formatDateTimeLocal(
  value:
    string | undefined,
) {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const timezoneOffset =
    date.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    date.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(
      0,
      16,
    );
}

function getAccountTypeOptions() {
  return [
    {
      value:
        "brokerage",
      label:
        "Brokerage",
    },
    {
      value:
        "retirement",
      label:
        "Retirement",
    },
    {
      value:
        "ira",
      label:
        "Traditional IRA",
    },
    {
      value:
        "roth-ira",
      label:
        "Roth IRA",
    },
    {
      value:
        "401k",
      label:
        "401(k)",
    },
    {
      value:
        "403b",
      label:
        "403(b)",
    },
    {
      value:
        "529",
      label:
        "529 Plan",
    },
    {
      value:
        "hsa",
      label:
        "HSA",
    },
    {
      value:
        "crypto",
      label:
        "Crypto Account",
    },
    {
      value:
        "other",
      label:
        "Other",
    },
  ] satisfies {
    value:
      InvestmentAccountType;

    label:
      string;
  }[];
}

function getConnectionStatusOptions() {
  return [
    {
      value:
        "manual",
      label:
        "Manual",
    },
    {
      value:
        "connected",
      label:
        "Connected",
    },
    {
      value:
        "pending",
      label:
        "Pending",
    },
    {
      value:
        "disconnected",
      label:
        "Disconnected",
    },
    {
      value:
        "error",
      label:
        "Connection Error",
    },
  ] satisfies {
    value:
      InvestmentConnectionStatus;

    label:
      string;
  }[];
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
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
        opacity="0.25"
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
