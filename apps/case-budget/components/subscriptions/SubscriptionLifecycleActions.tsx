"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";

type SubscriptionLifecycleActionsProps = {
  cancelAtPeriodEnd:
    boolean;

  currentPeriodEnd?:
    string | null;

  className?:
    string;
};

type LifecycleApiResponse =
  | {
      success:
        true;

      code:
        string;

      subscriptionId:
        string;

      status:
        string;

      cancelAtPeriodEnd:
        boolean;

      canceledAt?:
        string | null;

      currentPeriodEnd:
        string | null;

      message:
        string;
    }
  | {
      success:
        false;

      code?:
        string;

      error:
        string;
    };

export default function SubscriptionLifecycleActions({
  cancelAtPeriodEnd,
  currentPeriodEnd =
    null,
  className,
}: SubscriptionLifecycleActionsProps) {
  const router =
    useRouter();

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    showCancelConfirmation,
    setShowCancelConfirmation,
  ] =
    useState(
      false,
    );

  async function handleCancel() {
    setIsSubmitting(
      true,
    );

    setErrorMessage(
      null,
    );

    setSuccessMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/subscriptions/cancel",
          {
            method:
              "POST",

            cache:
              "no-store",
          },
        );

      const payload =
        await readLifecycleResponse(
          response,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          payload &&
          payload.success ===
            false
            ? payload.error
            : "CASE Budget could not schedule cancellation.",
        );
      }

      if (
        !payload ||
        payload.success !==
          true
      ) {
        throw new Error(
          "CASE Budget received an invalid cancellation response.",
        );
      }

      setSuccessMessage(
        payload.message,
      );

      setShowCancelConfirmation(
        false,
      );

      router.refresh();
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  async function handleResume() {
    setIsSubmitting(
      true,
    );

    setErrorMessage(
      null,
    );

    setSuccessMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/subscriptions/resume",
          {
            method:
              "POST",

            cache:
              "no-store",
          },
        );

      const payload =
        await readLifecycleResponse(
          response,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          payload &&
          payload.success ===
            false
            ? payload.error
            : "CASE Budget could not resume the subscription.",
        );
      }

      if (
        !payload ||
        payload.success !==
          true
      ) {
        throw new Error(
          "CASE Budget received an invalid resume response.",
        );
      }

      setSuccessMessage(
        payload.message,
      );

      router.refresh();
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <div
      className={
        className
      }
    >
      {cancelAtPeriodEnd ? (
        <ScheduledCancellationState
          isSubmitting={
            isSubmitting
          }
          currentPeriodEnd={
            currentPeriodEnd
          }
          onResume={
            handleResume
          }
        />
      ) : (
        <ActiveSubscriptionState
          isSubmitting={
            isSubmitting
          }
          showCancelConfirmation={
            showCancelConfirmation
          }
          currentPeriodEnd={
            currentPeriodEnd
          }
          onShowConfirmation={
            () =>
              setShowCancelConfirmation(
                true,
              )
          }
          onHideConfirmation={
            () =>
              setShowCancelConfirmation(
                false,
              )
          }
          onCancel={
            handleCancel
          }
        />
      )}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4"
        >
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

            <div>
              <p className="text-sm font-bold text-rose-900">
                Subscription update failed
              </p>

              <p className="mt-1 text-sm leading-6 text-rose-800">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-bold text-emerald-900">
                Subscription updated
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActiveSubscriptionState({
  isSubmitting,
  showCancelConfirmation,
  currentPeriodEnd,
  onShowConfirmation,
  onHideConfirmation,
  onCancel,
}: {
  isSubmitting:
    boolean;

  showCancelConfirmation:
    boolean;

  currentPeriodEnd:
    string | null;

  onShowConfirmation:
    () => void;

  onHideConfirmation:
    () => void;

  onCancel:
    () => void;
}) {
  if (
    showCancelConfirmation
  ) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div className="flex-1">
            <p className="text-sm font-black text-amber-950">
              Cancel your CASE Budget subscription?
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Your subscription will
              not end immediately.
              You will keep paid
              access through the end
              of your current billing
              period
              {formatDate(
                currentPeriodEnd,
              )
                ? ` on ${formatDate(
                    currentPeriodEnd,
                  )}`
                : ""}
              .
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              After that date, your
              account will return to
              CASE Budget Free unless
              you resume the
              subscription first.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  onCancel
                }
                disabled={
                  isSubmitting
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />

                    Scheduling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />

                    Schedule cancellation
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={
                  onHideConfirmation
                }
                disabled={
                  isSubmitting
                }
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300 bg-white px-5 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep subscription
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-black text-slate-900">
        Cancel subscription
      </p>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        If you cancel, your paid
        features remain available
        through the end of the
        current billing period.
      </p>

      <button
        type="button"
        onClick={
          onShowConfirmation
        }
        disabled={
          isSubmitting
        }
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel subscription
      </button>
    </div>
  );
}

function ScheduledCancellationState({
  isSubmitting,
  currentPeriodEnd,
  onResume,
}: {
  isSubmitting:
    boolean;

  currentPeriodEnd:
    string | null;

  onResume:
    () => void;
}) {
  const formattedDate =
    formatDate(
      currentPeriodEnd,
    );

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

        <div className="flex-1">
          <p className="text-sm font-black text-amber-950">
            Cancellation scheduled
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Your CASE Budget paid
            features remain available
            {formattedDate
              ? ` until ${formattedDate}`
              : " until the end of the current billing period"}
            .
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            You can resume the same
            subscription before it
            ends. No new subscription
            will be created.
          </p>

          <button
            type="button"
            onClick={
              onResume
            }
            disabled={
              isSubmitting
            }
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />

                Resuming...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />

                Resume subscription
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

async function readLifecycleResponse(
  response:
    Response,
): Promise<LifecycleApiResponse | null> {
  try {
    const value =
      await response.json();

    if (
      !isRecord(
        value,
      )
    ) {
      return null;
    }

    if (
      value.success ===
      true
    ) {
      const subscriptionId =
        getString(
          value.subscriptionId,
        );

      const code =
        getString(
          value.code,
        );

      const status =
        getString(
          value.status,
        );

      const message =
        getString(
          value.message,
        );

      if (
        !subscriptionId ||
        !code ||
        !status ||
        !message
      ) {
        return null;
      }

      return {
        success:
          true,

        code,

        subscriptionId,

        status,

        cancelAtPeriodEnd:
          value.cancelAtPeriodEnd ===
          true,

        canceledAt:
          getString(
            value.canceledAt,
          ),

        currentPeriodEnd:
          getString(
            value.currentPeriodEnd,
          ),

        message,
      };
    }

    if (
      value.success ===
      false
    ) {
      return {
        success:
          false,

        code:
          getString(
            value.code,
          ) ??
          undefined,

        error:
          getString(
            value.error,
          ) ??
          "CASE Budget could not update your subscription.",
      };
    }

    return null;
  } catch {
    return null;
  }
}

function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
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
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function getErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
      Error
  ) {
    const message =
      error.message
        .trim();

    if (
      message
    ) {
      return message;
    }
  }

  return "CASE Budget could not update your subscription. Please try again.";
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function getString(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}