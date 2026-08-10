"use client";

import {
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Lightbulb,
  MessageCircle,
  PiggyBank,
  ReceiptText,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useApp,
} from "@/components/providers/AppProvider";

import {
  useBills,
} from "@/components/providers/BillsProvider";

import {
  useDebts,
} from "@/components/providers/DebtsProvider";

import {
  useGoals,
} from "@/components/providers/GoalsProvider";

import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

import {
  buildAiCoachConversationHistory,
  createAiCoachAbortController,
  sendAiCoachMessage,
} from "@/lib/ai-coach/ai-coach-client";

import {
  buildAiCoachSummary,
  type AiCoachAccount,
  type AiCoachBill,
  type AiCoachDebt,
  type AiCoachFinancialContext,
  type AiCoachGoal,
  type AiCoachInsight,
  type AiCoachInsightTone,
  type AiCoachInsightType,
  type AiCoachSuggestedPrompt,
  type AiCoachTransaction,
} from "@/lib/ai-coach/ai-coach-service";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type LocalCoachMessage = {
  id: string;

  role:
    | "user"
    | "coach";

  content:
    string;
};

const moneyFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  );

const percentFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    },
  );

export default function AiCoachOverview() {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const {
    transactions,
  } =
    useTransactions();

  const {
    accounts,
  } =
    useAccounts();

  const {
    bills,
  } =
    useBills();

  const {
    debts,
  } =
    useDebts();

  const {
    goals,
  } =
    useGoals();

  const [
    message,
    setMessage,
  ] =
    useState(
      "",
    );

  const [
    conversation,
    setConversation,
  ] =
    useState<
      LocalCoachMessage[]
    >(
      [],
    );

  const [
    isSending,
    setIsSending,
  ] =
    useState(
      false,
    );

  const [
    sendError,
    setSendError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    activeModel,
    setActiveModel,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const abortControllerRef =
    useRef<
      AbortController | null
    >(
      null,
    );

  const normalizedTransactions =
    useMemo(
      () =>
        normalizeTransactions(
          transactions,
        ),
      [
        transactions,
      ],
    );

  const normalizedAccounts =
    useMemo(
      () =>
        normalizeAccounts(
          accounts,
        ),
      [
        accounts,
      ],
    );

  const normalizedBills =
    useMemo(
      () =>
        normalizeBills(
          bills,
        ),
      [
        bills,
      ],
    );

  const normalizedDebts =
    useMemo(
      () =>
        normalizeDebts(
          debts,
        ),
      [
        debts,
      ],
    );

  const normalizedGoals =
    useMemo(
      () =>
        normalizeGoals(
          goals,
        ),
      [
        goals,
      ],
    );

  const coachSummary =
    useMemo(
      () =>
        buildAiCoachSummary({
          transactions:
            normalizedTransactions,

          accounts:
            normalizedAccounts,

          bills:
            normalizedBills,

          debts:
            normalizedDebts,

          goals:
            normalizedGoals,

          budgetItems:
            [],

          investments:
            [],
        }),
      [
        normalizedAccounts,
        normalizedBills,
        normalizedDebts,
        normalizedGoals,
        normalizedTransactions,
      ],
    );

  const firstName =
    currentUser?.firstName
      ?.trim() ||
    currentUser?.displayName
      ?.trim()
      .split(
        " ",
      )[0] ||
    "there";

  const workspaceName =
    activeWorkspace?.name
      ?.trim() ||
    "your workspace";

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await submitCoachMessage(
      message,
    );
  }

  async function handlePromptClick(
    prompt:
      AiCoachSuggestedPrompt,
  ) {
    await submitCoachMessage(
      prompt.prompt,
    );
  }

  async function submitCoachMessage(
    prompt:
      string,
  ) {
    const trimmedPrompt =
      prompt.trim();

    if (
      !trimmedPrompt ||
      isSending
    ) {
      return;
    }

    const timestamp =
      Date.now();

    const userMessage:
      LocalCoachMessage = {
      id:
        `user-${timestamp}`,

      role:
        "user",

      content:
        trimmedPrompt,
    };

    const conversationHistory =
      buildAiCoachConversationHistory(
        conversation,
      );

    setConversation(
      (
        currentConversation,
      ) => [
        ...currentConversation,
        userMessage,
      ],
    );

    setMessage(
      "",
    );

    setSendError(
      null,
    );

    setIsSending(
      true,
    );

    abortControllerRef.current
      ?.abort();

    const controller =
      createAiCoachAbortController();

    abortControllerRef.current =
      controller;

    const result =
      await sendAiCoachMessage({
        message:
          trimmedPrompt,

        summary:
          coachSummary,

        workspaceName,

        userFirstName:
          firstName,

        conversation:
          conversationHistory,

        signal:
          controller.signal,
      });

    if (
      abortControllerRef.current ===
      controller
    ) {
      abortControllerRef.current =
        null;
    }

    if (
      result.success
    ) {
      setConversation(
        (
          currentConversation,
        ) => [
          ...currentConversation,

          {
            id:
              `coach-${Date.now()}`,

            role:
              "coach",

            content:
              result.message,
          },
        ],
      );

      setActiveModel(
        result.model,
      );

      setIsSending(
        false,
      );

      return;
    }

    if (
      !result.aborted
    ) {
      const fallbackResponse =
        buildLocalCoachResponse({
          prompt:
            trimmedPrompt,

          summary:
            coachSummary,
        });

      setConversation(
        (
          currentConversation,
        ) => [
          ...currentConversation,

          {
            id:
              `coach-fallback-${Date.now()}`,

            role:
              "coach",

            content:
              fallbackResponse,
          },
        ],
      );

      setSendError(
        result.error,
      );
    }

    setIsSending(
      false,
    );
  }

  function handleCancelRequest() {
    abortControllerRef.current
      ?.abort();

    abortControllerRef.current =
      null;

    setIsSending(
      false,
    );

    setSendError(
      null,
    );
  }

  async function handleRetry() {
    const lastUserMessage =
      [
        ...conversation,
      ]
        .reverse()
        .find(
          (
            item,
          ) =>
            item.role ===
            "user",
        );

    if (
      !lastUserMessage
    ) {
      return;
    }

    setConversation(
      (
        currentConversation,
      ) =>
        currentConversation.filter(
          (
            item,
          ) =>
            !item.id.startsWith(
              "coach-fallback-",
            ),
        ),
    );

    await submitCoachMessage(
      lastUserMessage.content,
    );
  }

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <AiCoachHeader
          firstName={
            firstName
          }
          workspaceName={
            workspaceName
          }
        />

        <AiCoachHero
          headline={
            coachSummary
              .headline
          }
          summary={
            coachSummary
              .summary
          }
          hasFinancialData={
            coachSummary
              .hasFinancialData
          }
          topInsight={
            coachSummary
              .topInsight
          }
        />

        <FinancialSnapshot
          context={
            coachSummary
              .context
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <CoachConversationCard
            message={
              message
            }
            conversation={
              conversation
            }
            suggestedPrompts={
              coachSummary
                .suggestedPrompts
            }
            isSending={
              isSending
            }
            error={
              sendError
            }
            activeModel={
              activeModel
            }
            onMessageChange={
              setMessage
            }
            onSubmit={
              handleSubmit
            }
            onPromptClick={
              handlePromptClick
            }
            onCancel={
              handleCancelRequest
            }
            onRetry={
              handleRetry
            }
          />

          <PriorityInsightCard
            insight={
              coachSummary
                .topInsight
            }
            hasFinancialData={
              coachSummary
                .hasFinancialData
            }
          />
        </section>

        <CoachInsightsSection
          insights={
            coachSummary
              .insights
          }
          hasFinancialData={
            coachSummary
              .hasFinancialData
          }
        />

        <CoachQuickActions />

        <CoachDisclaimer />
      </div>
    </div>
  );
}

function AiCoachHeader({
  firstName,
  workspaceName,
}: {
  firstName:
    string;

  workspaceName:
    string;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <BrainCircuit className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                AI Coach
              </p>

              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">
                Pro
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Your personal financial coach
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              Hi {firstName}. I use the
              real financial data in{" "}
              <span className="font-semibold text-slate-700">
                {workspaceName}
              </span>{" "}
              to surface priorities,
              explain tradeoffs, and
              help you decide what to
              work on next.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/financial-health"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <ShieldCheck className="h-[18px] w-[18px]" />

            Financial health
          </Link>

          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            <TrendingUp className="h-[18px] w-[18px]" />

            View reports
          </Link>
        </div>
      </div>
    </section>
  );
}

function AiCoachHero({
  headline,
  summary,
  hasFinancialData,
  topInsight,
}: {
  headline:
    string;

  summary:
    string;

  hasFinancialData:
    boolean;

  topInsight:
    AiCoachInsight | null;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-emerald-50 shadow-sm">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-violet-700">
            <Sparkles className="h-4 w-4" />

            Personalized coaching
          </div>

          <h2 className="mt-4 max-w-4xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
            {headline}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            {summary}
          </p>

          {topInsight ? (
            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Top priority
              </span>

              <span className="text-sm font-bold text-slate-800">
                {topInsight.title}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-[36px] bg-white shadow-lg ring-1 ring-violet-100">
            <div className="absolute inset-4 rounded-[28px] bg-gradient-to-br from-violet-100 to-emerald-100" />

            <Bot className="relative h-16 w-16 text-violet-700" />
          </div>
        </div>
      </div>

      {!hasFinancialData ? (
        <div className="border-t border-violet-100 bg-white/70 px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">
              Add transactions, accounts,
              bills, goals, or debt to
              unlock personalized
              recommendations.
            </p>

            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 transition hover:text-violet-800"
            >
              Add financial activity

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FinancialSnapshot({
  context,
}: {
  context:
    AiCoachFinancialContext;
}) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
          Current picture
        </p>

        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          What your coach sees
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          These are the financial
          signals being used to shape
          your coaching insights.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SnapshotMetricCard
          label="Monthly cash flow"
          value={
            formatMoney(
              context.cashFlow,
            )
          }
          description="Cleared income minus cleared spending"
          icon={
            context.cashFlow >=
              0
              ? TrendingUp
              : TrendingDown
          }
          tone={
            context.cashFlow >=
              0
              ? "positive"
              : "warning"
          }
        />

        <SnapshotMetricCard
          label="Savings rate"
          value={
            context.savingsRate ===
            null
              ? "—"
              : formatPercentage(
                  context.savingsRate,
                )
          }
          description="Share of cleared income remaining"
          icon={
            PiggyBank
          }
          tone={
            context.savingsRate ===
            null
              ? "neutral"
              : context.savingsRate >=
                  10
                ? "positive"
                : context.savingsRate >=
                    0
                  ? "neutral"
                  : "warning"
          }
        />

        <SnapshotMetricCard
          label="Net worth"
          value={
            formatMoney(
              context.netWorth,
            )
          }
          description="Tracked assets minus liabilities"
          icon={
            Scale
          }
          tone={
            context.netWorth >=
              0
              ? "positive"
              : "warning"
          }
        />

        <SnapshotMetricCard
          label="Active debt"
          value={
            formatMoney(
              context.totalDebt,
            )
          }
          description={
            context.debtCount >
            0
              ? `${context.debtCount} active debt${
                  context.debtCount ===
                  1
                    ? ""
                    : "s"
                } tracked`
              : "No active debts tracked"
          }
          icon={
            Landmark
          }
          tone={
            context.totalDebt >
            0
              ? "neutral"
              : "positive"
          }
        />
      </div>
    </section>
  );
}

function SnapshotMetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label:
    string;

  value:
    string;

  description:
    string;

  icon:
    LucideIcon;

  tone:
    | "positive"
    | "neutral"
    | "warning";
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p
            className={[
              "mt-2 truncate text-2xl font-bold tracking-tight",
              getSnapshotValueClassName(
                tone,
              ),
            ].join(
              " ",
            )}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            getSnapshotIconClassName(
              tone,
            ),
          ].join(
            " ",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

function CoachConversationCard({
  message,
  conversation,
  suggestedPrompts,
  isSending,
  error,
  activeModel,
  onMessageChange,
  onSubmit,
  onPromptClick,
  onCancel,
  onRetry,
}: {
  message:
    string;

  conversation:
    LocalCoachMessage[];

  suggestedPrompts:
    AiCoachSuggestedPrompt[];

  isSending:
    boolean;

  error:
    string | null;

  activeModel:
    string | null;

  onMessageChange: (
    value:
      string,
  ) => void;

  onSubmit: (
    event:
      FormEvent<HTMLFormElement>,
  ) => void;

  onPromptClick: (
    prompt:
      AiCoachSuggestedPrompt,
  ) => void;

  onCancel:
    () => void;

  onRetry:
    () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <MessageCircle className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-slate-950">
            Ask your coach
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Ask about your budget,
            spending, savings, debt,
            bills, net worth, or overall
            financial direction.
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {conversation.length >
        0 ? (
          <div className="mb-6 max-h-[420px] space-y-4 overflow-y-auto pr-1">
            {conversation.map(
              (
                item,
              ) => (
                <CoachMessageBubble
                  key={
                    item.id
                  }
                  message={
                    item
                  }
                />
              ),
            )}

            {isSending ? (
              <CoachThinkingBubble />
            ) : null}
          </div>
        ) : (
          <div className="mb-6 rounded-[24px] bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Bot className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-950">
                  What would you like to work on?
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Choose a suggested
                  question below or type
                  your own. CASE AI Coach
                  uses your current
                  workspace context and
                  sends your question to
                  the configured AI model
                  through the secure
                  server endpoint.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map(
            (
              prompt,
            ) => (
              <button
                key={
                  prompt.id
                }
                type="button"
                disabled={
                  isSending
                }
                onClick={() =>
                  onPromptClick(
                    prompt,
                  )
                }
                className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt.label}
              </button>
            ),
          )}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-900">
                  Live AI response unavailable
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  {error}
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  CASE Budget used the local financial-context fallback so you still received guidance.
                </p>

                <button
                  type="button"
                  disabled={
                    isSending
                  }
                  onClick={
                    onRetry
                  }
                  className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full border border-amber-300 bg-white px-4 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retry live AI
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={
            onSubmit
          }
          className="mt-5"
        >
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-2 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-50">
            <textarea
              value={
                message
              }
              onChange={
                (
                  event,
                ) =>
                  onMessageChange(
                    event.target
                      .value,
                  )
              }
              rows={
                3
              }
              placeholder="Ask CASE AI Coach about your finances..."
              className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
            />

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-2 pt-2">
              <p className="hidden text-xs text-slate-400 sm:block">
                {isSending
                  ? "CASE AI Coach is thinking…"
                  : activeModel
                    ? `Connected to ${activeModel}`
                    : "Uses your active CASE Budget workspace context"}
              </p>

              {isSending ? (
                <button
                  type="button"
                  onClick={
                    onCancel
                  }
                  className="ml-auto inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    message.trim()
                      .length ===
                    0
                  }
                  className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send

                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function CoachThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-[22px] rounded-bl-md bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500 [animation-delay:300ms]" />
          </span>

          Thinking
        </div>
      </div>
    </div>
  );
}

function CoachMessageBubble({
  message,
}: {
  message:
    LocalCoachMessage;
}) {
  const isUser =
    message.role ===
    "user";

  return (
    <div
      className={[
        "flex",
        isUser
          ? "justify-end"
          : "justify-start",
      ].join(
        " ",
      )}
    >
      <div
        className={[
          "max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6",
          isUser
            ? "rounded-br-md bg-violet-600 text-white"
            : "rounded-bl-md bg-slate-100 text-slate-700",
        ].join(
          " ",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <CoachMarkdown
            content={
              message.content
            }
          />
        )}
      </div>
    </div>
  );
}

type CoachMarkdownBlock =
  | {
      type:
        "heading";

      level:
        1 | 2 | 3;

      content:
        string;
    }
  | {
      type:
        "paragraph";

      content:
        string;
    }
  | {
      type:
        "unordered-list";

      items:
        string[];
    }
  | {
      type:
        "ordered-list";

      items:
        string[];
    };

function CoachMarkdown({
  content,
}: {
  content:
    string;
}) {
  const blocks =
    parseCoachMarkdown(
      content,
    );

  return (
    <div className="space-y-3 break-words">
      {blocks.map(
        (
          block,
          index,
        ) => {
          const key =
            `${block.type}-${index}`;

          if (
            block.type ===
            "heading"
          ) {
            const className =
              block.level ===
              1
                ? "text-lg font-bold leading-7 text-slate-950"
                : block.level ===
                    2
                  ? "text-base font-bold leading-6 text-slate-950"
                  : "text-sm font-bold uppercase tracking-[0.08em] text-slate-900";

            return (
              <div
                key={
                  key
                }
                className={
                  className
                }
              >
                <CoachMarkdownInline
                  content={
                    block.content
                  }
                />
              </div>
            );
          }

          if (
            block.type ===
            "unordered-list"
          ) {
            return (
              <ul
                key={
                  key
                }
                className="list-disc space-y-1.5 pl-5 marker:text-violet-500"
              >
                {block.items.map(
                  (
                    item,
                    itemIndex,
                  ) => (
                    <li
                      key={
                        `${key}-${itemIndex}`
                      }
                      className="pl-1"
                    >
                      <CoachMarkdownInline
                        content={
                          item
                        }
                      />
                    </li>
                  ),
                )}
              </ul>
            );
          }

          if (
            block.type ===
            "ordered-list"
          ) {
            return (
              <ol
                key={
                  key
                }
                className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-violet-600"
              >
                {block.items.map(
                  (
                    item,
                    itemIndex,
                  ) => (
                    <li
                      key={
                        `${key}-${itemIndex}`
                      }
                      className="pl-1"
                    >
                      <CoachMarkdownInline
                        content={
                          item
                        }
                      />
                    </li>
                  ),
                )}
              </ol>
            );
          }

          return (
            <p
              key={
                key
              }
              className="whitespace-pre-wrap"
            >
              <CoachMarkdownInline
                content={
                  block.content
                }
              />
            </p>
          );
        },
      )}
    </div>
  );
}

function CoachMarkdownInline({
  content,
}: {
  content:
    string;
}) {
  const tokens =
    tokenizeCoachMarkdownInline(
      content,
    );

  return (
    <>
      {tokens.map(
        (
          token,
          index,
        ) => {
          const key =
            `${token.type}-${index}`;

          switch (
            token.type
          ) {
            case "bold":
              return (
                <strong
                  key={
                    key
                  }
                  className="font-bold text-slate-950"
                >
                  {token.content}
                </strong>
              );

            case "italic":
              return (
                <em
                  key={
                    key
                  }
                  className="italic"
                >
                  {token.content}
                </em>
              );

            case "code":
              return (
                <code
                  key={
                    key
                  }
                  className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-800"
                >
                  {token.content}
                </code>
              );

            case "text":
            default:
              return (
                <span
                  key={
                    key
                  }
                >
                  {token.content}
                </span>
              );
          }
        },
      )}
    </>
  );
}

type CoachMarkdownInlineToken =
  | {
      type:
        "text";

      content:
        string;
    }
  | {
      type:
        "bold";

      content:
        string;
    }
  | {
      type:
        "italic";

      content:
        string;
    }
  | {
      type:
        "code";

      content:
        string;
    };

function parseCoachMarkdown(
  value:
    string,
): CoachMarkdownBlock[] {
  const normalizedValue =
    value
      .replace(
        /\r\n/g,
        "\n",
      )
      .replace(
        /\r/g,
        "\n",
      )
      .trim();

  if (
    !normalizedValue
  ) {
    return [];
  }

  const lines =
    normalizedValue.split(
      "\n",
    );

  const blocks:
    CoachMarkdownBlock[] =
    [];

  let paragraphLines:
    string[] =
    [];

  let unorderedItems:
    string[] =
    [];

  let orderedItems:
    string[] =
    [];

  function flushParagraph() {
    if (
      paragraphLines.length ===
      0
    ) {
      return;
    }

    blocks.push({
      type:
        "paragraph",

      content:
        paragraphLines
          .join(
            " ",
          )
          .trim(),
    });

    paragraphLines =
      [];
  }

  function flushUnorderedList() {
    if (
      unorderedItems.length ===
      0
    ) {
      return;
    }

    blocks.push({
      type:
        "unordered-list",

      items:
        unorderedItems,
    });

    unorderedItems =
      [];
  }

  function flushOrderedList() {
    if (
      orderedItems.length ===
      0
    ) {
      return;
    }

    blocks.push({
      type:
        "ordered-list",

      items:
        orderedItems,
    });

    orderedItems =
      [];
  }

  function flushAll() {
    flushParagraph();
    flushUnorderedList();
    flushOrderedList();
  }

  for (
    const rawLine
    of lines
  ) {
    const line =
      rawLine.trim();

    if (
      !line
    ) {
      flushAll();

      continue;
    }

    const headingMatch =
      line.match(
        /^(#{1,3})\s+(.+)$/,
      );

    if (
      headingMatch
    ) {
      flushAll();

      blocks.push({
        type:
          "heading",

        level:
          headingMatch[1]
            .length as
            1 | 2 | 3,

        content:
          headingMatch[2]
            .trim(),
      });

      continue;
    }

    const unorderedMatch =
      line.match(
        /^[-*+]\s+(.+)$/,
      );

    if (
      unorderedMatch
    ) {
      flushParagraph();
      flushOrderedList();

      unorderedItems.push(
        unorderedMatch[1]
          .trim(),
      );

      continue;
    }

    const orderedMatch =
      line.match(
        /^\d+[.)]\s+(.+)$/,
      );

    if (
      orderedMatch
    ) {
      flushParagraph();
      flushUnorderedList();

      orderedItems.push(
        orderedMatch[1]
          .trim(),
      );

      continue;
    }

    flushUnorderedList();
    flushOrderedList();

    paragraphLines.push(
      line,
    );
  }

  flushAll();

  return blocks;
}

function tokenizeCoachMarkdownInline(
  value:
    string,
): CoachMarkdownInlineToken[] {
  const tokens:
    CoachMarkdownInlineToken[] =
    [];

  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

  let lastIndex =
    0;

  let match:
    RegExpExecArray | null;

  while (
    (
      match =
        pattern.exec(
          value,
        )
    ) !==
    null
  ) {
    if (
      match.index >
      lastIndex
    ) {
      tokens.push({
        type:
          "text",

        content:
          value.slice(
            lastIndex,
            match.index,
          ),
      });
    }

    const rawToken =
      match[0];

    if (
      (
        rawToken.startsWith(
          "**",
        ) &&
        rawToken.endsWith(
          "**",
        )
      ) ||
      (
        rawToken.startsWith(
          "__",
        ) &&
        rawToken.endsWith(
          "__",
        )
      )
    ) {
      tokens.push({
        type:
          "bold",

        content:
          rawToken.slice(
            2,
            -2,
          ),
      });
    } else if (
      rawToken.startsWith(
        "`",
      ) &&
      rawToken.endsWith(
        "`",
      )
    ) {
      tokens.push({
        type:
          "code",

        content:
          rawToken.slice(
            1,
            -1,
          ),
      });
    } else {
      tokens.push({
        type:
          "italic",

        content:
          rawToken.slice(
            1,
            -1,
          ),
      });
    }

    lastIndex =
      pattern.lastIndex;
  }

  if (
    lastIndex <
    value.length
  ) {
    tokens.push({
      type:
        "text",

      content:
        value.slice(
          lastIndex,
        ),
    });
  }

  if (
    tokens.length ===
    0
  ) {
    tokens.push({
      type:
        "text",

      content:
        value,
    });
  }

  return tokens;
}

function PriorityInsightCard({
  insight,
  hasFinancialData,
}: {
  insight:
    AiCoachInsight | null;

  hasFinancialData:
    boolean;
}) {
  if (
    !insight
  ) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[380px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Lightbulb className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-950">
            {hasFinancialData
              ? "No urgent coaching priority"
              : "Your first insight will appear here"}
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {hasFinancialData
              ? "As your financial activity changes, CASE AI Coach will surface the most important next action here."
              : "Add real financial activity and CASE AI Coach will identify the first area worth focusing on."}
          </p>
        </div>
      </section>
    );
  }

  const Icon =
    getInsightIcon(
      insight.type,
    );

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                getInsightIconClassName(
                  insight.tone,
                ),
              ].join(
                " ",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                Top coaching priority
              </p>

              <h2 className="mt-1 font-bold leading-6 text-slate-950">
                {insight.title}
              </h2>
            </div>
          </div>

          <InsightPriorityBadge
            priority={
              insight.priority
            }
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {insight.valueLabel ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Current signal
            </p>

            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {insight.valueLabel}
            </p>
          </div>
        ) : null}

        <p className="mt-5 text-sm leading-7 text-slate-600">
          {insight.description}
        </p>

        {insight.action ? (
          <Link
            href={
              insight.action
                .href
            }
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            {insight.action
              .label}

            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function CoachInsightsSection({
  insights,
  hasFinancialData,
}: {
  insights:
    AiCoachInsight[];

  hasFinancialData:
    boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
            Coaching insights
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            What deserves your attention
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Recommendations are ranked
            by urgency and generated
            from your current financial
            picture.
          </p>
        </div>

        {insights.length >
        0 ? (
          <p className="text-xs font-semibold text-slate-400">
            {insights.length} insight
            {insights.length ===
            1
              ? ""
              : "s"}{" "}
            available
          </p>
        ) : null}
      </div>

      {insights.length >
      0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {insights.map(
            (
              insight,
            ) => (
              <CoachInsightCard
                key={
                  insight.id
                }
                insight={
                  insight
                }
              />
            ),
          )}
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Sparkles className="h-6 w-6" />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-950">
            {hasFinancialData
              ? "No additional insights right now"
              : "Build your financial picture"}
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {hasFinancialData
              ? "Your coaching insights will update as new transactions, bills, goals, debts, and account balances are recorded."
              : "Add real financial data to your workspace and CASE AI Coach will begin generating personalized guidance."}
          </p>
        </div>
      )}
    </section>
  );
}

function CoachInsightCard({
  insight,
}: {
  insight:
    AiCoachInsight;
}) {
  const Icon =
    getInsightIcon(
      insight.type,
    );

  return (
    <article className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              getInsightIconClassName(
                insight.tone,
              ),
            ].join(
              " ",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <InsightPriorityBadge
            priority={
              insight.priority
            }
          />
        </div>

        <h3 className="mt-5 text-base font-bold leading-6 text-slate-950">
          {insight.title}
        </h3>

        {insight.valueLabel ? (
          <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
            {insight.valueLabel}
          </p>
        ) : null}

        <p className="mt-3 text-sm leading-7 text-slate-500">
          {insight.description}
        </p>

        {insight.action ? (
          <Link
            href={
              insight.action
                .href
            }
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700 transition hover:text-violet-800"
          >
            {insight.action
              .label}

            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function InsightPriorityBadge({
  priority,
}: {
  priority:
    AiCoachInsight["priority"];
}) {
  const label =
    priority ===
    "critical"
      ? "Critical"
      : priority ===
          "high"
        ? "High priority"
        : priority ===
            "medium"
          ? "Medium"
          : "Low";

  const className =
    priority ===
    "critical"
      ? "bg-rose-100 text-rose-700"
      : priority ===
          "high"
        ? "bg-amber-100 text-amber-700"
        : priority ===
            "medium"
          ? "bg-blue-100 text-blue-700"
          : "bg-emerald-100 text-emerald-700";

  return (
    <span
      className={[
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]",
        className,
      ].join(
        " ",
      )}
    >
      {label}
    </span>
  );
}

function CoachQuickActions() {
  return (
    <section>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
          Take action
        </p>

        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Turn coaching into progress
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Move directly from guidance
          into the CASE Budget tools
          that can improve your
          financial position.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CoachQuickActionCard
          title="Review your budget"
          description="Reallocate money and give every dollar a clear purpose."
          href="/dashboard/budget"
          icon={
            WalletCards
          }
        />

        <CoachQuickActionCard
          title="Build savings"
          description="Create goals for emergencies, purchases, and long-term priorities."
          href="/dashboard/goals"
          icon={
            PiggyBank
          }
        />

        <CoachQuickActionCard
          title="Accelerate debt payoff"
          description="Focus extra cash on balances that are slowing your progress."
          href="/dashboard/debt"
          icon={
            Landmark
          }
        />

        <CoachQuickActionCard
          title="Review financial health"
          description="See how cash flow, savings, debt, reserves, and bills combine."
          href="/dashboard/financial-health"
          icon={
            ShieldCheck
          }
        />
      </div>
    </section>
  );
}

function CoachQuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title:
    string;

  description:
    string;

  href:
    string;

  icon:
    LucideIcon;
}) {
  return (
    <Link
      href={
        href
      }
      className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700">
        Open

        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function CoachDisclaimer() {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-950">
            Financial guidance, not a guarantee
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            CASE AI Coach is designed to
            help you understand your
            financial data and consider
            practical next steps. It does
            not replace professional tax,
            legal, investment, insurance,
            or individualized financial
            advice.
          </p>
        </div>
      </div>
    </section>
  );
}

function buildLocalCoachResponse({
  prompt,
  summary,
}: {
  prompt:
    string;

  summary:
    ReturnType<
      typeof buildAiCoachSummary
    >;
}) {
  const normalizedPrompt =
    prompt
      .trim()
      .toLowerCase();

  if (
    !summary.hasFinancialData
  ) {
    return "I do not have enough real financial activity in this workspace yet. Start by adding your current accounts, recent income and spending, recurring bills, and any debts or savings goals. Once those are available, I can give you much more specific guidance.";
  }

  if (
    normalizedPrompt.includes(
      "debt",
    )
  ) {
    if (
      summary.context
        .totalDebt <=
      0
    ) {
      return "I do not see any active debt tracked in this workspace right now. If you add your current balances, interest rates, and minimum payments, I can help compare payoff priorities.";
    }

    return `You currently have ${formatMoney(
      summary.context
        .totalDebt,
    )} of active debt tracked. I would first protect essential bills and positive cash flow, then direct additional available cash toward the most expensive debt while keeping an emergency reserve in place.`;
  }

  if (
    normalizedPrompt.includes(
      "save",
    ) ||
    normalizedPrompt.includes(
      "saving",
    ) ||
    normalizedPrompt.includes(
      "emergency",
    )
  ) {
    if (
      summary.context
        .savingsRate ===
      null
    ) {
      return "I need cleared income history before I can calculate a reliable savings rate. Record your income and expenses for the current month, and I can help identify a realistic monthly savings target.";
    }

    return `Your current savings rate is approximately ${formatPercentage(
      summary.context
        .savingsRate,
    )}. Your tracked emergency reserve is ${formatMoney(
      summary.context
        .emergencyFundBalance,
    )}. The next step is to protect positive monthly cash flow and consistently direct part of that margin toward your highest-priority savings goal.`;
  }

  if (
    normalizedPrompt.includes(
      "spend",
    ) ||
    normalizedPrompt.includes(
      "cut",
    ) ||
    normalizedPrompt.includes(
      "expense",
    )
  ) {
    return `You have ${formatMoney(
      summary.context
        .expenses,
    )} of cleared spending this month. I would start with your largest discretionary categories, recurring subscriptions, and any budget items that are consistently above plan before cutting essential expenses.`;
  }

  if (
    normalizedPrompt.includes(
      "bill",
    )
  ) {
    if (
      summary.context
        .overdueBillCount >
      0
    ) {
      return `You have ${summary.context.overdueBillCount} overdue bill${
        summary.context
          .overdueBillCount ===
        1
          ? ""
          : "s"
      } tracked. Those should be reviewed first because late fees and service interruptions can create avoidable pressure on your cash flow.`;
    }

    return `I do not see any overdue tracked bills right now. There are ${summary.context.upcomingBillCount} bill${
      summary.context
        .upcomingBillCount ===
      1
        ? ""
        : "s"
    } due within the next seven days.`;
  }

  if (
    normalizedPrompt.includes(
      "month",
    ) ||
    normalizedPrompt.includes(
      "review",
    ) ||
    normalizedPrompt.includes(
      "overall",
    )
  ) {
    return `${summary.headline} You have ${formatMoney(
      summary.context
        .income,
    )} of cleared income, ${formatMoney(
      summary.context
        .expenses,
    )} of cleared spending, and ${formatMoney(
      summary.context
        .cashFlow,
    )} of net cash flow this month. ${
      summary.topInsight
        ? `The first area I would focus on is: ${summary.topInsight.title}.`
        : "I do not see an urgent issue in the currently tracked data."
    }`;
  }

  return `${summary.headline} ${
    summary.topInsight
      ? `Based on the financial data I can currently see, the highest-priority issue is "${summary.topInsight.title}". ${summary.topInsight.description}`
      : "I can help you review your spending, savings, bills, debt, net worth, and monthly cash flow."
  }`;
}

function normalizeTransactions(
  values:
    readonly unknown[],
): AiCoachTransaction[] {
  return values
    .map(
      normalizeTransaction,
    )
    .filter(
      (
        value,
      ): value is AiCoachTransaction =>
        value !==
        null,
    );
}

function normalizeTransaction(
  value:
    unknown,
): AiCoachTransaction | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const date =
    getFirstString(
      record.date,
      record.transactionDate,
      record.transaction_date,
    );

  const amount =
    getNumber(
      record.amount,
    );

  const type =
    normalizeTransactionType(
      getString(
        record.type,
      ),
    );

  const status =
    normalizeTransactionStatus(
      getString(
        record.status,
      ),
    );

  if (
    !id ||
    !date ||
    amount ===
      null ||
    !type ||
    !status
  ) {
    return null;
  }

  const category =
    asRecord(
      record.category,
    );

  return {
    id,
    date,
    amount,
    type,
    status,

    merchant:
      getFirstString(
        record.merchant,
        record.payee,
        record.description,
      ),

    categoryName:
      getFirstString(
        record.categoryName,
        record.category_name,
        category?.name,
      ),

    categoryGroupName:
      getFirstString(
        record.categoryGroupName,
        record.category_group_name,
        category?.groupName,
        category?.group_name,
      ),
  };
}

function normalizeAccounts(
  values:
    readonly unknown[],
): AiCoachAccount[] {
  return values
    .map(
      normalizeAccount,
    )
    .filter(
      (
        value,
      ): value is AiCoachAccount =>
        value !==
        null,
    );
}

function normalizeAccount(
  value:
    unknown,
): AiCoachAccount | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const name =
    getFirstString(
      record.name,
      record.accountName,
      record.account_name,
    );

  const type =
    getFirstString(
      record.type,
      record.accountType,
      record.account_type,
    );

  const balance =
    getFirstNumber(
      record.balance,
      record.currentBalance,
      record.current_balance,
      record.availableBalance,
      record.available_balance,
    );

  if (
    !id ||
    !name ||
    !type ||
    balance ===
      null
  ) {
    return null;
  }

  return {
    id,
    name,
    type,
    balance,

    includeInNetWorth:
      getFirstBoolean(
        record.includeInNetWorth,
        record.include_in_net_worth,
      ) ??
      true,
  };
}

function normalizeBills(
  values:
    readonly unknown[],
): AiCoachBill[] {
  return values
    .map(
      normalizeBill,
    )
    .filter(
      (
        value,
      ): value is AiCoachBill =>
        value !==
        null,
    );
}

function normalizeBill(
  value:
    unknown,
): AiCoachBill | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const name =
    getFirstString(
      record.name,
      record.title,
      record.payee,
    );

  if (
    !id ||
    !name
  ) {
    return null;
  }

  return {
    id,
    name,

    amount:
      getNumber(
        record.amount,
      ) ??
      0,

    dueDate:
      getFirstString(
        record.dueDate,
        record.due_date,
      ),

    status:
      getString(
        record.status,
      ),
  };
}

function normalizeDebts(
  values:
    readonly unknown[],
): AiCoachDebt[] {
  return values
    .map(
      normalizeDebt,
    )
    .filter(
      (
        value,
      ): value is AiCoachDebt =>
        value !==
        null,
    );
}

function normalizeDebt(
  value:
    unknown,
): AiCoachDebt | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const name =
    getFirstString(
      record.name,
      record.title,
      record.creditor,
    );

  const currentBalance =
    getFirstNumber(
      record.currentBalance,
      record.current_balance,
      record.balance,
      record.remainingBalance,
      record.remaining_balance,
    );

  if (
    !id ||
    !name ||
    currentBalance ===
      null
  ) {
    return null;
  }

  return {
    id,
    name,
    currentBalance,

    interestRate:
      getFirstNumber(
        record.interestRate,
        record.interest_rate,
        record.apr,
      ),

    minimumPayment:
      getFirstNumber(
        record.minimumPayment,
        record.minimum_payment,
      ),

    isActive:
      getFirstBoolean(
        record.isActive,
        record.is_active,
      ) ??
      true,
  };
}

function normalizeGoals(
  values:
    readonly unknown[],
): AiCoachGoal[] {
  return values
    .map(
      normalizeGoal,
    )
    .filter(
      (
        value,
      ): value is AiCoachGoal =>
        value !==
        null,
    );
}

function normalizeGoal(
  value:
    unknown,
): AiCoachGoal | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const name =
    getFirstString(
      record.name,
      record.title,
    );

  if (
    !id ||
    !name
  ) {
    return null;
  }

  return {
    id,
    name,

    currentAmount:
      getFirstNumber(
        record.currentAmount,
        record.current_amount,
        record.savedAmount,
        record.saved_amount,
        record.balance,
      ) ??
      0,

    targetAmount:
      getFirstNumber(
        record.targetAmount,
        record.target_amount,
        record.goalAmount,
        record.goal_amount,
      ) ??
      0,

    targetDate:
      getFirstString(
        record.targetDate,
        record.target_date,
      ),

    status:
      getString(
        record.status,
      ),

    isEmergencyFund:
      getFirstBoolean(
        record.isEmergencyFund,
        record.is_emergency_fund,
      ) ??
      undefined,
  };
}

function normalizeTransactionType(
  value:
    string | null,
):
  | AiCoachTransaction["type"]
  | null {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "income":
      return "income";

    case "expense":
      return "expense";

    case "transfer":
      return "transfer";

    default:
      return null;
  }
}

function normalizeTransactionStatus(
  value:
    string | null,
):
  | AiCoachTransaction["status"]
  | null {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "cleared":
      return "cleared";

    case "pending":
      return "pending";

    default:
      return null;
  }
}

function getInsightIcon(
  type:
    AiCoachInsightType,
): LucideIcon {
  switch (
    type
  ) {
    case "cash-flow":
      return CircleDollarSign;

    case "spending":
      return ReceiptText;

    case "savings":
      return PiggyBank;

    case "emergency-fund":
      return ShieldCheck;

    case "debt":
      return Landmark;

    case "bills":
      return ReceiptText;

    case "budget":
      return WalletCards;

    case "net-worth":
      return Scale;

    case "investments":
      return TrendingUp;

    case "general":
    default:
      return Lightbulb;
  }
}

function getInsightIconClassName(
  tone:
    AiCoachInsightTone,
) {
  switch (
    tone
  ) {
    case "positive":
      return "bg-emerald-50 text-emerald-600";

    case "warning":
      return "bg-rose-50 text-rose-600";

    case "informational":
      return "bg-blue-50 text-blue-600";

    case "neutral":
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getSnapshotValueClassName(
  tone:
    | "positive"
    | "neutral"
    | "warning",
) {
  switch (
    tone
  ) {
    case "positive":
      return "text-emerald-700";

    case "warning":
      return "text-rose-700";

    case "neutral":
    default:
      return "text-slate-950";
  }
}

function getSnapshotIconClassName(
  tone:
    | "positive"
    | "neutral"
    | "warning",
) {
  switch (
    tone
  ) {
    case "positive":
      return "bg-emerald-50 text-emerald-600";

    case "warning":
      return "bg-rose-50 text-rose-600";

    case "neutral":
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as
    UnknownRecord;
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

function getFirstString(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const stringValue =
      getString(
        value,
      );

    if (
      stringValue
    ) {
      return stringValue;
    }
  }

  return null;
}

function getNumber(
  value:
    unknown,
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsedValue =
      Number(
        value,
      );

    if (
      Number.isFinite(
        parsedValue,
      )
    ) {
      return parsedValue;
    }
  }

  return null;
}

function getFirstNumber(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const numberValue =
      getNumber(
        value,
      );

    if (
      numberValue !==
      null
    ) {
      return numberValue;
    }
  }

  return null;
}

function getBoolean(
  value:
    unknown,
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  return null;
}

function getFirstBoolean(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const booleanValue =
      getBoolean(
        value,
      );

    if (
      booleanValue !==
      null
    ) {
      return booleanValue;
    }
  }

  return null;
}

function formatMoney(
  value:
    number,
) {
  return moneyFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatPercentage(
  value:
    number,
) {
  return `${percentFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  )}%`;
}
