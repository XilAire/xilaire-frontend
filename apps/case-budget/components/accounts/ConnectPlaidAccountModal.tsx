"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  usePlaidLink,
  type PlaidLinkError,
  type PlaidLinkOnEvent,
  type PlaidLinkOnExit,
  type PlaidLinkOnSuccess,
  type PlaidLinkOptions,
} from "react-plaid-link";

export type ConnectPlaidAccountMode =
  | "create"
  | "update";

export type ConnectedPlaidAccount = {
  id: string;
  name?: string;
  mask?: string;
  type?: string;
  subtype?: string;
};

export type ConnectedPlaidInstitution = {
  id?: string;
  name?: string;
};

export type ConnectedPlaidConnection = {
  id: string;

  provider: "plaid";
  category: "banking";

  providerConnectionId: string;
  providerInstitutionId?: string;

  institutionName: string;

  status:
    | "connected"
    | "error";

  createdAt: string;
  updatedAt: string;
};

export type ConnectPlaidAccountResult = {
  connection:
    ConnectedPlaidConnection;

  institution:
    ConnectedPlaidInstitution;

  accounts:
    ConnectedPlaidAccount[];

  item: {
    itemId: string;
    institutionId?: string;

    availableProducts: string[];
    billedProducts: string[];
    consentedProducts: string[];

    consentExpirationTime?: string;
    updateType?: string;
  };

  requestId: string;
};

export type ConnectPlaidAccountModalProps = {
  isOpen: boolean;

  mode?: ConnectPlaidAccountMode;
  connectionId?: string;

  title?: string;
  description?: string;

  onClose: () => void;

  onConnected?: (
    result:
      ConnectPlaidAccountResult,
  ) => void;

  onError?: (
    error:
      ConnectPlaidAccountModalError,
  ) => void;
};

export type ConnectPlaidAccountModalErrorCode =
  | "link-token-failed"
  | "link-load-failed"
  | "link-exited"
  | "exchange-failed"
  | "invalid-response"
  | "configuration-error"
  | "network-error"
  | "unknown";

export class ConnectPlaidAccountModalError extends Error {
  readonly code:
    ConnectPlaidAccountModalErrorCode;

  readonly requestId?:
    string;

  readonly plaidErrorCode?:
    string;

  readonly apiErrorCode?:
    string;

  constructor({
    message,
    code,
    requestId,
    plaidErrorCode,
    apiErrorCode,
    cause,
  }: {
    message:
      string;

    code:
      ConnectPlaidAccountModalErrorCode;

    requestId?:
      string;

    plaidErrorCode?:
      string;

    apiErrorCode?:
      string;

    cause?:
      unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "ConnectPlaidAccountModalError";

    this.code =
      code;

    this.requestId =
      requestId;

    this.plaidErrorCode =
      plaidErrorCode;

    this.apiErrorCode =
      apiErrorCode;
  }
}

type ModalStep =
  | "idle"
  | "loading-link-token"
  | "ready"
  | "opening-link"
  | "exchanging-token"
  | "success"
  | "error";

type LinkTokenResponse = {
  linkToken: string;
  expiration: string;
  requestId: string;
};

type ExchangeTokenResponse = {
  connection: {
    id: string;

    provider: "plaid";
    category: "banking";

    providerConnectionId: string;
    providerInstitutionId?: string;

    institutionName: string;

    status:
      | "connected"
      | "error";

    createdAt: string;
    updatedAt: string;
  };

  item: {
    itemId: string;
    institutionId?: string;

    availableProducts: string[];
    billedProducts: string[];
    consentedProducts: string[];

    consentExpirationTime?: string;
    updateType?: string;
  };

  requestId: string;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

const LINK_TOKEN_ENDPOINT =
  "/api/plaid/link-token";

const EXCHANGE_TOKEN_ENDPOINT =
  "/api/plaid/exchange-token";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(
  ",",
);

export default function ConnectPlaidAccountModal({
  isOpen,
  mode = "create",
  connectionId,
  title,
  description,
  onClose,
  onConnected,
  onError,
}: ConnectPlaidAccountModalProps) {
  const router =
    useRouter();

  const titleId =
    useId();

  const descriptionId =
    useId();

  const dialogRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const closeButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const previousActiveElementRef =
    useRef<HTMLElement | null>(
      null,
    );

  const requestAbortControllerRef =
    useRef<AbortController | null>(
      null,
    );

  const hasOpenedLinkRef =
    useRef(
      false,
    );

  const [
    linkToken,
    setLinkToken,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    step,
    setStep,
  ] = useState<ModalStep>(
    "idle",
  );

  const [
    modalError,
    setModalError,
  ] = useState<
    ConnectPlaidAccountModalError | null
  >(
    null,
  );

  const [
    connectedResult,
    setConnectedResult,
  ] = useState<
    ConnectPlaidAccountResult | null
  >(
    null,
  );

  const [
    lastPlaidEvent,
    setLastPlaidEvent,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    requiresNewConnection,
    setRequiresNewConnection,
  ] = useState(
    false,
  );

  const effectiveMode:
    ConnectPlaidAccountMode =
      requiresNewConnection
        ? "create"
        : mode;

  const resolvedTitle =
    title ??
    (
      effectiveMode ===
      "update"
        ? "Reconnect financial institution"
        : "Connect a bank account"
    );

  const resolvedDescription =
    description ??
    (
      effectiveMode ===
      "update"
        ? "Securely restore access to your connected financial institution through Plaid."
        : "Securely connect checking, savings, credit card, loan, and supported investment accounts through Plaid."
    );

  const isBusy =
    step ===
      "loading-link-token" ||
    step ===
      "opening-link" ||
    step ===
      "exchanging-token";

  const canClose =
    step !==
    "exchanging-token";

  const resetModalState =
    useCallback(
      () => {
        requestAbortControllerRef.current?.abort();

        requestAbortControllerRef.current =
          null;

        hasOpenedLinkRef.current =
          false;

        setLinkToken(
          null,
        );

        setStep(
          "idle",
        );

        setModalError(
          null,
        );

        setConnectedResult(
          null,
        );

        setLastPlaidEvent(
          null,
        );

        setRequiresNewConnection(
          false,
        );
      },
      [],
    );

  const reportError =
    useCallback(
      (
        error:
          ConnectPlaidAccountModalError,
      ) => {
        setModalError(
          error,
        );

        setStep(
          "error",
        );

        onError?.(
          error,
        );
      },
      [
        onError,
      ],
    );

  const handlePlaidSuccess:
    PlaidLinkOnSuccess =
    useCallback(
      async (
        publicToken,
        metadata,
      ) => {
        setStep(
          "exchanging-token",
        );

        setModalError(
          null,
        );

        const institution:
          ConnectedPlaidInstitution = {
            id:
              metadata.institution?.institution_id ??
              undefined,

            name:
              metadata.institution?.name ??
              undefined,
          };

        const accounts:
          ConnectedPlaidAccount[] =
          metadata.accounts.map(
            (
              account,
            ) => ({
              id:
                account.id,

              name:
                account.name ??
                undefined,

              mask:
                account.mask ??
                undefined,

              type:
                account.type ??
                undefined,

              subtype:
                account.subtype ??
                undefined,
            }),
          );

        try {
          const response =
            await fetch(
              EXCHANGE_TOKEN_ENDPOINT,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                cache:
                  "no-store",

                body:
                  JSON.stringify({
                    publicToken,

                    institution,

                    accounts,

                    linkSessionId:
                      metadata.link_session_id,
                  }),
              },
            );

          const responseBody =
            await readJsonResponse(
              response,
            );

          if (
            !response.ok
          ) {
            throw createApiResponseError({
              responseBody,
              fallbackMessage:
                "CASE Budget could not finish connecting the financial institution.",

              code:
                "exchange-failed",
            });
          }

          if (
            !isExchangeTokenResponse(
              responseBody,
            )
          ) {
            throw new ConnectPlaidAccountModalError({
              message:
                "The Plaid connection response was incomplete.",

              code:
                "invalid-response",
            });
          }

          const result:
            ConnectPlaidAccountResult = {
              connection:
                responseBody.connection,

              institution,

              accounts,

              item:
                responseBody.item,

              requestId:
                responseBody.requestId,
            };

          setConnectedResult(
            result,
          );

          setStep(
            "success",
          );

          router.refresh();

          onConnected?.(
            result,
          );
        } catch (
          error
        ) {
          reportError(
            normalizeModalError({
              error,

              fallbackMessage:
                "CASE Budget could not finish connecting the financial institution.",

              fallbackCode:
                "exchange-failed",
            }),
          );
        }
      },
      [
        onConnected,
        reportError,
        router,
      ],
    );

  const handlePlaidExit:
    PlaidLinkOnExit =
    useCallback(
      (
        error,
        metadata,
      ) => {
        hasOpenedLinkRef.current =
          false;

        setLastPlaidEvent(
          metadata.status ??
          "exited",
        );

        if (
          error
        ) {
          reportError(
            createPlaidExitError(
              error,
              metadata.request_id ??
                undefined,
            ),
          );

          return;
        }

        setStep(
          linkToken
            ? "ready"
            : "idle",
        );
      },
      [
        linkToken,
        reportError,
      ],
    );

  const handlePlaidEvent:
    PlaidLinkOnEvent =
    useCallback(
      (
        eventName,
        metadata,
      ) => {
        setLastPlaidEvent(
          [
            eventName,
            metadata.view_name,
          ]
            .filter(
              Boolean,
            )
            .join(
              ":",
            ),
        );
      },
      [],
    );

  const plaidOptions =
    useMemo<
      PlaidLinkOptions
    >(
      () => ({
        token:
          linkToken,

        onSuccess:
          handlePlaidSuccess,

        onExit:
          handlePlaidExit,

        onEvent:
          handlePlaidEvent,
      }),
      [
        handlePlaidEvent,
        handlePlaidExit,
        handlePlaidSuccess,
        linkToken,
      ],
    );

  const {
    open,
    exit,
    ready,
    error:
      plaidLoadError,
  } =
    usePlaidLink(
      plaidOptions,
    );

  const loadLinkToken =
    useCallback(
      async (
        requestedMode:
          ConnectPlaidAccountMode =
            effectiveMode,
      ) => {
        if (
          requestedMode ===
            "update" &&
          !connectionId
        ) {
          reportError(
            new ConnectPlaidAccountModalError({
              message:
                "A connection ID is required to reconnect this institution.",

              code:
                "configuration-error",
            }),
          );

          return;
        }

        requestAbortControllerRef.current?.abort();

        const abortController =
          new AbortController();

        requestAbortControllerRef.current =
          abortController;

        setLinkToken(
          null,
        );

        setModalError(
          null,
        );

        setConnectedResult(
          null,
        );

        setStep(
          "loading-link-token",
        );

        try {
          const response =
            await fetch(
              LINK_TOKEN_ENDPOINT,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                cache:
                  "no-store",

                signal:
                  abortController.signal,

                body:
                  JSON.stringify({
                    mode:
                      requestedMode,

                    connectionId:
                      requestedMode ===
                      "update"
                        ? connectionId
                        : undefined,
                  }),
              },
            );

          const responseBody =
            await readJsonResponse(
              response,
            );

          if (
            !response.ok
          ) {
            throw createApiResponseError({
              responseBody,
              fallbackMessage:
                "CASE Budget could not start Plaid Link.",

              code:
                "link-token-failed",
            });
          }

          if (
            !isLinkTokenResponse(
              responseBody,
            )
          ) {
            throw new ConnectPlaidAccountModalError({
              message:
                "The Plaid Link token response was incomplete.",

              code:
                "invalid-response",
            });
          }

          setLinkToken(
            responseBody.linkToken,
          );

          setStep(
            "ready",
          );
        } catch (
          error
        ) {
          if (
            isAbortError(
              error,
            )
          ) {
            return;
          }

          const normalizedError =
            normalizeModalError({
              error,

              fallbackMessage:
                "CASE Budget could not start Plaid Link.",

              fallbackCode:
                "link-token-failed",
            });

          if (
            requestedMode ===
              "update" &&
            isRelinkRequiredError(
              normalizedError,
            )
          ) {
            setRequiresNewConnection(
              true,
            );

            reportError(
              new ConnectPlaidAccountModalError({
                message:
                  "The previous Plaid connection is no longer available. Connect the institution again to create a new secure connection.",

                code:
                  "link-token-failed",

                requestId:
                  normalizedError.requestId,

                apiErrorCode:
                  normalizedError.apiErrorCode,

                cause:
                  normalizedError,
              }),
            );

            return;
          }

          reportError(
            normalizedError,
          );
        } finally {
          if (
            requestAbortControllerRef.current ===
            abortController
          ) {
            requestAbortControllerRef.current =
              null;
          }
        }
      },
      [
        connectionId,
        effectiveMode,
        reportError,
      ],
    );

  const handleOpenPlaid =
    useCallback(
      () => {
        if (
          !ready ||
          !linkToken ||
          isBusy
        ) {
          return;
        }

        hasOpenedLinkRef.current =
          true;

        setStep(
          "opening-link",
        );

        open();
      },
      [
        isBusy,
        linkToken,
        open,
        ready,
      ],
    );

  const handleClose =
    useCallback(
      () => {
        if (
          !canClose
        ) {
          return;
        }

        if (
          hasOpenedLinkRef.current
        ) {
          exit(
            {
              force:
                true,
            },
          );

          hasOpenedLinkRef.current =
            false;
        }

        requestAbortControllerRef.current?.abort();

        onClose();
      },
      [
        canClose,
        exit,
        onClose,
      ],
    );

  const handleRetry =
    useCallback(
      () => {
        if (
          requiresNewConnection
        ) {
          void loadLinkToken(
            "create",
          );

          return;
        }

        void loadLinkToken();
      },
      [
        loadLinkToken,
        requiresNewConnection,
      ],
    );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      previousActiveElementRef.current =
        document.activeElement instanceof
        HTMLElement
          ? document.activeElement
          : null;

      const animationFrame =
        window.requestAnimationFrame(
          () => {
            closeButtonRef.current?.focus();
          },
        );

      return () => {
        window.cancelAnimationFrame(
          animationFrame,
        );

        previousActiveElementRef.current?.focus();
      };
    },
    [
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        resetModalState();

        return;
      }

      void loadLinkToken(
        mode,
      );
    },
    [
      isOpen,
      mode,
      resetModalState,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen ||
        !plaidLoadError
      ) {
        return;
      }

      reportError(
        new ConnectPlaidAccountModalError({
          message:
            "Plaid Link could not be loaded. Check the network connection and try again.",

          code:
            "link-load-failed",

          cause:
            plaidLoadError,
        }),
      );
    },
    [
      isOpen,
      plaidLoadError,
      reportError,
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

      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
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

      function handleDocumentKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          event.preventDefault();

          handleClose();

          return;
        }

        if (
          event.key !==
          "Tab" ||
          !dialogRef.current
        ) {
          return;
        }

        const focusableElements =
          Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              FOCUSABLE_SELECTOR,
            ),
          ).filter(
            (
              element,
            ) =>
              !element.hasAttribute(
                "disabled",
              ) &&
              element.getAttribute(
                "aria-hidden",
              ) !==
                "true",
          );

        if (
          focusableElements.length ===
          0
        ) {
          event.preventDefault();

          dialogRef.current.focus();

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

        const activeElement =
          document.activeElement;

        if (
          event.shiftKey &&
          (
            activeElement ===
              firstElement ||
            !dialogRef.current.contains(
              activeElement,
            )
          )
        ) {
          event.preventDefault();

          lastElement.focus();

          return;
        }

        if (
          !event.shiftKey &&
          activeElement ===
            lastElement
        ) {
          event.preventDefault();

          firstElement.focus();
        }
      }

      document.addEventListener(
        "keydown",
        handleDocumentKeyDown,
      );

      return () => {
        document.removeEventListener(
          "keydown",
          handleDocumentKeyDown,
        );
      };
    },
    [
      handleClose,
      isOpen,
    ],
  );

  if (
    !isOpen
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={
        (
          event,
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            handleClose();
          }
        }
      }
    >
      <div
        ref={
          dialogRef
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        aria-describedby={
          descriptionId
        }
        tabIndex={
          -1
        }
        className="flex max-h-[100dvh] min-h-[82dvh] w-full flex-col overflow-hidden bg-[var(--surface-default)] shadow-2xl outline-none sm:min-h-0 sm:max-h-[90dvh] sm:max-w-xl sm:rounded-3xl sm:border sm:border-[var(--border-subtle)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <PlaidShieldIcon />

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                  Secure connection
                </p>

                <h2
                  id={
                    titleId
                  }
                  className="mt-1 text-xl font-bold text-[var(--text-primary)]"
                >
                  {resolvedTitle}
                </h2>
              </div>
            </div>

            <p
              id={
                descriptionId
              }
              className="mt-3 max-w-lg text-sm leading-6 text-[var(--text-muted)]"
            >
              {resolvedDescription}
            </p>
          </div>

          <button
            ref={
              closeButtonRef
            }
            type="button"
            onClick={
              handleClose
            }
            disabled={
              !canClose
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close connect account dialog"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {step ===
            "success" &&
          connectedResult ? (
            <SuccessState
              result={
                connectedResult
              }
            />
          ) : step ===
              "error" &&
            modalError ? (
            <ErrorState
              error={
                modalError
              }
              onRetry={
                handleRetry
              }
              retryLabel={
                requiresNewConnection
                  ? "Connect again"
                  : "Restart connection"
              }
            />
          ) : (
            <ConnectionState
              step={
                step
              }
              mode={
                effectiveMode
              }
              ready={
                ready
              }
              lastPlaidEvent={
                lastPlaidEvent
              }
            />
          )}
        </div>

        <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:px-6">
          {step ===
            "success" ? (
            <button
              type="button"
              onClick={
                handleClose
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              Done
            </button>
          ) : step ===
              "error" ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  handleClose
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleRetry
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              >
                {requiresNewConnection
                  ? "Connect again"
                  : "Try again"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={
                  !canClose
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleOpenPlaid
                }
                disabled={
                  !ready ||
                  !linkToken ||
                  isBusy
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <SpinnerIcon />
                ) : (
                  <LockIcon />
                )}

                {getPrimaryButtonLabel(
                  step,
                  effectiveMode,
                )}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function ConnectionState({
  step,
  mode,
  ready,
  lastPlaidEvent,
}: {
  step:
    ModalStep;

  mode:
    ConnectPlaidAccountMode;

  ready:
    boolean;

  lastPlaidEvent:
    string | null;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            {step ===
              "loading-link-token" ||
            step ===
              "opening-link" ||
            step ===
              "exchanging-token" ? (
              <SpinnerIcon
                size={
                  22
                }
              />
            ) : (
              <BankIcon />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {getConnectionStateTitle(
                step,
                mode,
                ready,
              )}
            </h3>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {getConnectionStateDescription(
                step,
                mode,
                ready,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SecurityFeature
          icon={
            <LockIcon />
          }
          title="Encrypted"
          description="Provider tokens are encrypted before database storage."
        />

        <SecurityFeature
          icon={
            <EyeOffIcon />
          }
          title="Private"
          description="CASE Budget never receives your bank password."
        />

        <SecurityFeature
          icon={
            <RefreshIcon />
          }
          title="Controlled"
          description="You can refresh or disconnect accounts from CASE Budget."
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          What CASE Budget can import
        </h3>

        <ul className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2">
          <DataAccessItem label="Account names and types" />
          <DataAccessItem label="Current and available balances" />
          <DataAccessItem label="Transaction history" />
          <DataAccessItem label="Supported liabilities" />
          <DataAccessItem label="Recurring activity" />
          <DataAccessItem label="Supported investment data" />
        </ul>
      </div>

      {lastPlaidEvent ? (
        <p className="mt-4 break-all text-xs text-[var(--text-muted)]">
          Plaid status:{" "}
          {lastPlaidEvent}
        </p>
      ) : null}
    </div>
  );
}

function SuccessState({
  result,
}: {
  result:
    ConnectPlaidAccountResult;
}) {
  const accountCount =
    result.accounts.length;

  return (
    <div className="flex min-h-72 flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
        <CheckIcon />
      </div>

      <h3 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        Account connected
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {result.connection.institutionName}{" "}
        was connected securely.
        {accountCount >
        0
          ? ` ${accountCount} ${
              accountCount ===
              1
                ? "account was"
                : "accounts were"
            } selected for import.`
          : ""}
      </p>

      <div className="mt-6 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-left">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Connection details
        </p>

        <dl className="mt-3 space-y-3">
          <DetailRow
            label="Institution"
            value={
              result.connection.institutionName
            }
          />

          <DetailRow
            label="Accounts selected"
            value={
              String(
                accountCount,
              )
            }
          />

          <DetailRow
            label="Status"
            value="Connected"
          />
        </dl>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  retryLabel,
}: {
  error:
    ConnectPlaidAccountModalError;

  onRetry: () => void;

  retryLabel:
    string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
        <WarningIcon />
      </div>

      <h3 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        Connection was not completed
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {error.message}
      </p>

      {error.requestId ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Request ID:{" "}
          {error.requestId}
        </p>
      ) : null}

      <button
        type="button"
        onClick={
          onRetry
        }
        className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <RefreshIcon />

        {retryLabel}
      </button>
    </div>
  );
}

function SecurityFeature({
  icon,
  title,
  description,
}: {
  icon:
    ReactNode;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="text-[var(--primary)]">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function DataAccessItem({
  label,
}: {
  label:
    string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-[var(--success)]">
        <SmallCheckIcon />
      </span>

      <span>
        {label}
      </span>
    </li>
  );
}

function DetailRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-[var(--text-muted)]">
        {label}
      </dt>

      <dd className="text-right font-bold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

function getPrimaryButtonLabel(
  step:
    ModalStep,
  mode:
    ConnectPlaidAccountMode,
) {
  switch (
    step
  ) {
    case "loading-link-token":
      return "Preparing secure connection";

    case "opening-link":
      return "Opening Plaid";

    case "exchanging-token":
      return "Securing connection";

    default:
      return mode ===
        "update"
        ? "Reconnect with Plaid"
        : "Continue with Plaid";
  }
}

function getConnectionStateTitle(
  step:
    ModalStep,
  mode:
    ConnectPlaidAccountMode,
  ready:
    boolean,
) {
  switch (
    step
  ) {
    case "loading-link-token":
      return "Preparing Plaid Link";

    case "opening-link":
      return "Opening secure connection";

    case "exchanging-token":
      return "Saving your connection securely";

    case "ready":
      return ready
        ? mode ===
          "update"
          ? "Ready to reconnect"
          : "Ready to connect"
        : "Loading Plaid";

    case "idle":
    default:
      return "Secure account connection";
  }
}

function getConnectionStateDescription(
  step:
    ModalStep,
  mode:
    ConnectPlaidAccountMode,
  ready:
    boolean,
) {
  switch (
    step
  ) {
    case "loading-link-token":
      return "CASE Budget is creating a short-lived Link token for this session.";

    case "opening-link":
      return "Plaid is opening its secure institution connection experience.";

    case "exchanging-token":
      return "CASE Budget is encrypting the provider token and storing the connection.";

    case "ready":
      return ready
        ? mode ===
          "update"
          ? "Continue to Plaid to restore access to this institution."
          : "Continue to Plaid to choose an institution and select accounts."
        : "The Plaid connection experience is still loading.";

    case "idle":
    default:
      return "Plaid handles institution login, multi-factor authentication, and account selection.";
  }
}

function createPlaidExitError(
  error:
    PlaidLinkError,
  requestId?:
    string,
) {
  return new ConnectPlaidAccountModalError({
    message:
      error.display_message ??
      error.error_message ??
      "Plaid Link closed before the connection was completed.",

    code:
      "link-exited",

    requestId,

    plaidErrorCode:
      error.error_code ??
      undefined,

    cause:
      error,
  });
}

function createApiResponseError({
  responseBody,
  fallbackMessage,
  code,
}: {
  responseBody:
    unknown;

  fallbackMessage:
    string;

  code:
    ConnectPlaidAccountModalErrorCode;
}) {
  const apiError =
    isApiErrorResponse(
      responseBody,
    )
      ? responseBody.error
      : undefined;

  return new ConnectPlaidAccountModalError({
    message:
      apiError?.message ??
      fallbackMessage,

    code,

    requestId:
      apiError?.requestId,

    apiErrorCode:
      apiError?.code,
  });
}

function isRelinkRequiredError(
  error:
    ConnectPlaidAccountModalError,
) {
  return (
    error.apiErrorCode ===
      "connection-relink-required" ||
    error.apiErrorCode ===
      "item-not-found" ||
    error.apiErrorCode ===
      "plaid-item-revoked"
  );
}

function normalizeModalError({
  error,
  fallbackMessage,
  fallbackCode,
}: {
  error:
    unknown;

  fallbackMessage:
    string;

  fallbackCode:
    ConnectPlaidAccountModalErrorCode;
}) {
  if (
    error instanceof
    ConnectPlaidAccountModalError
  ) {
    return error;
  }

  if (
    isAbortError(
      error,
    )
  ) {
    return new ConnectPlaidAccountModalError({
      message:
        "The connection request was canceled.",

      code:
        "network-error",

      cause:
        error,
    });
  }

  if (
    error instanceof
    TypeError
  ) {
    return new ConnectPlaidAccountModalError({
      message:
        "CASE Budget could not reach the server. Check the network connection and try again.",

      code:
        "network-error",

      cause:
        error,
    });
  }

  return new ConnectPlaidAccountModalError({
    message:
      fallbackMessage,

    code:
      fallbackCode,

    cause:
      error,
  });
}

async function readJsonResponse(
  response:
    Response,
) {
  const contentType =
    response.headers.get(
      "content-type",
    ) ??
    "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isLinkTokenResponse(
  value:
    unknown,
): value is LinkTokenResponse {
  if (
    !isPlainObject(
      value,
    )
  ) {
    return false;
  }

  return (
    typeof value.linkToken ===
      "string" &&
    Boolean(
      value.linkToken,
    ) &&
    typeof value.expiration ===
      "string" &&
    typeof value.requestId ===
      "string"
  );
}

function isExchangeTokenResponse(
  value:
    unknown,
): value is ExchangeTokenResponse {
  if (
    !isPlainObject(
      value,
    ) ||
    !isPlainObject(
      value.connection,
    ) ||
    !isPlainObject(
      value.item,
    )
  ) {
    return false;
  }

  return (
    typeof value.connection.id ===
      "string" &&
    value.connection.provider ===
      "plaid" &&
    value.connection.category ===
      "banking" &&
    typeof value.connection.providerConnectionId ===
      "string" &&
    typeof value.connection.institutionName ===
      "string" &&
    (
      value.connection.status ===
        "connected" ||
      value.connection.status ===
        "error"
    ) &&
    typeof value.connection.createdAt ===
      "string" &&
    typeof value.connection.updatedAt ===
      "string" &&
    typeof value.item.itemId ===
      "string" &&
    Array.isArray(
      value.item.availableProducts,
    ) &&
    Array.isArray(
      value.item.billedProducts,
    ) &&
    Array.isArray(
      value.item.consentedProducts,
    ) &&
    typeof value.requestId ===
      "string"
  );
}

function isApiErrorResponse(
  value:
    unknown,
): value is ApiErrorResponse {
  return (
    isPlainObject(
      value,
    ) &&
    (
      value.error ===
        undefined ||
      isPlainObject(
        value.error,
      )
    )
  );
}

function isPlainObject(
  value:
    unknown,
): value is Record<
  string,
  any
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
}

function isAbortError(
  error:
    unknown,
) {
  return (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  );
}

function PlaidShieldIcon() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  );
}

function BankIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v9" />
      <path d="M9 10v9" />
      <path d="M15 10v9" />
      <path d="M19 10v9" />
      <path d="M3 19h18" />
    </svg>
  );
}

function LockIcon() {
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
      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c7 0 10 8 10 8a17.7 17.7 0 0 1-2 3.1" />
      <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3 8 10 8a10.8 10.8 0 0 0 5.4-1.4" />
    </svg>
  );
}

function RefreshIcon() {
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
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.3 6.3L4 11" />
      <path d="M5.5 15A7 7 0 0 0 17.7 17.7L20 13" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function SmallCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function WarningIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
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

function SpinnerIcon({
  size = 18,
}: {
  size?:
    number;
}) {
  return (
    <svg
      width={
        size
      }
      height={
        size
      }
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
