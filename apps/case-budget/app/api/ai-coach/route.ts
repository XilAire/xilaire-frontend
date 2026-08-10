import {
  randomUUID,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  buildAiCoachPrompt,
  type AiCoachConversationMessage,
} from "@/lib/ai-coach/ai-coach-prompt";

import {
  calculateAiRequestCost,
  getAiModelPricing,
  normalizeOpenAiUsage,
} from "@/lib/ai-coach/ai-usage-service";

import {
  applyAiCoachUsage,
  getAiAllowanceHttpStatus,
  getAiAllowanceUserMessage,
  reserveAiCoachQuestion,
  safelyReleaseAiCoachQuestion,
} from "@/lib/ai-coach/ai-allowance-service";

import {
  getSupabaseSubscriptionRepository,
} from "@/lib/subscriptions/subscription-storage";

import {
  getSubscriptionAccessErrorMessage,
  getSubscriptionAccessErrorStatus,
  isSubscriptionAccessError,
  resolveAuthenticatedAiCoachAccess,
} from "@/lib/subscriptions/subscription-access";

import type {
  AiCoachFinancialContext,
  AiCoachInsight,
  AiCoachSummary,
  AiCoachSuggestedPrompt,
} from "@/lib/ai-coach/ai-coach-service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const MAX_USER_MESSAGE_LENGTH =
  6_000;

const MAX_CONVERSATION_MESSAGES =
  20;

const MAX_CONVERSATION_MESSAGE_LENGTH =
  6_000;

const REQUEST_TIMEOUT_MS =
  45_000;

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type AiCoachRequestBody = {
  message:
    string;

  summary:
    AiCoachSummary;

  workspaceId:
    string | null;

  workspaceName:
    string | null;

  userFirstName:
    string | null;

  conversation:
    AiCoachConversationMessage[];
};

type OpenAiResponsePayload = {
  id?:
    unknown;

  output?:
    unknown;

  output_text?:
    unknown;

  usage?:
    unknown;

  error?:
    unknown;
};

export async function POST(
  request: Request,
) {
  let reservedUsagePeriodId:
    string | null =
    null;

  let authenticatedUserId:
    string | null =
    null;

  let aiRequestId:
    string | null =
    null;

  let aiRequestStartedAt:
    string | null =
    null;

  try {
    const rawBody =
      await readJsonBody(
        request,
      );

    if (
      !rawBody.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            rawBody.error,
        },
        {
          status:
            400,
        },
      );
    }

    const validatedRequest =
      validateAiCoachRequest(
        rawBody.value,
      );

    if (
      !validatedRequest.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            validatedRequest.error,
        },
        {
          status:
            400,
        },
      );
    }

    const {
      message,
      summary,
      workspaceId,
      workspaceName,
      userFirstName,
      conversation,
    } =
      validatedRequest.value;

    /*
     * Authentication and subscription access are resolved on the server.
     * The browser is never trusted to tell us whether the user is Pro.
     */
    const subscriptionAccess =
      await resolveAuthenticatedAiCoachAccess({
        workspaceId,
      });

    authenticatedUserId =
      subscriptionAccess
        .identity
        .userId;

    if (
      !subscriptionAccess
        .access
        .allowed
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            subscriptionAccess
              .access
              .reason ===
              "monthly-limit-reached"
              ? "You have used all AI Coach questions included for this month."
              : "AI Coach is available with CASE Budget Pro.",
        },
        {
          status:
            subscriptionAccess
              .access
              .reason ===
              "monthly-limit-reached"
              ? 429
              : 403,
        },
      );
    }

    const configuration =
      getOpenAiConfiguration();

    if (
      !configuration.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            configuration.error,
        },
        {
          status:
            500,
        },
      );
    }

    /*
     * The database RPC performs the final allowance check atomically.
     * This is the authoritative enforcement point for concurrent requests.
     */
    const reservation =
      await reserveAiCoachQuestion({
        userId:
          authenticatedUserId,

        workspaceId,

        subscriptionId:
          subscriptionAccess
            .subscription
            .id,

        plan:
          subscriptionAccess
            .subscription
            .plan,
      });

    if (
      !reservation.allowed ||
      !reservation.usagePeriodId
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            getAiAllowanceUserMessage(
              reservation,
            ),

          allowance: {
            monthlyQuestionLimit:
              reservation
                .monthlyQuestionLimit,

            successfulQuestionsUsed:
              reservation
                .successfulQuestionsUsed,

            successfulQuestionsRemaining:
              reservation
                .successfulQuestionsRemaining,
          },
        },
        {
          status:
            getAiAllowanceHttpStatus(
              reservation,
            ),
        },
      );
    }

    reservedUsagePeriodId =
      reservation.usagePeriodId;

    aiRequestId =
      randomUUID();

    aiRequestStartedAt =
      new Date()
        .toISOString();

    const repository =
      getSupabaseSubscriptionRepository();

    /*
     * Create the request ledger entry before spending money with OpenAI.
     */
    try {
      await repository.saveAiRequest({
        request: {
          id:
            aiRequestId,

          userId:
            authenticatedUserId,

          workspaceId,

          subscriptionId:
            subscriptionAccess
              .subscription
              .id,

          usagePeriodId:
            reservedUsagePeriodId,

          requestType:
            "ai-coach",

          status:
            "pending",

          model:
            configuration.model,

          promptCharacters:
            message.length,

          conversationMessageCount:
            conversation.length,

          inputTokens:
            0,

          cachedInputTokens:
            0,

          outputTokens:
            0,

          totalTokens:
            0,

          estimatedCostUsd:
            0,

          countedAgainstAllowance:
            true,

          providerRequestId:
            null,

          errorCode:
            null,

          errorMessage:
            null,

          startedAt:
            aiRequestStartedAt,

          completedAt:
            null,

          createdAt:
            aiRequestStartedAt,
        },
      });
    } catch (
      error
    ) {
      await safelyReleaseAiCoachQuestion({
        usagePeriodId:
          reservedUsagePeriodId,

        userId:
          authenticatedUserId,
      });

      reservedUsagePeriodId =
        null;

      throw error;
    }

    const promptBundle =
      buildAiCoachPrompt({
        userMessage:
          message,

        summary,

        workspaceName,

        userFirstName,

        conversation,
      });

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        REQUEST_TIMEOUT_MS,
      );

    try {
      const response =
        await fetch(
          OPENAI_RESPONSES_URL,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${configuration.apiKey}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                model:
                  configuration.model,

                instructions:
                  [
                    promptBundle
                      .systemPrompt,

                    promptBundle
                      .contextPrompt,
                  ].join(
                    "\n\n",
                  ),

                input:
                  buildOpenAiInput({
                    conversation,

                    userMessage:
                      message,
                  }),

                store:
                  false,
              }),

            signal:
              controller.signal,

            cache:
              "no-store",
          },
        );

      const responseBody =
        await readOpenAiResponse(
          response,
        );

      if (
        !response.ok
      ) {
        const providerError =
          getOpenAiErrorMessage(
            responseBody,
          );

        console.error(
          "CASE AI Coach OpenAI request failed.",
          {
            status:
              response.status,

            statusText:
              response.statusText,

            error:
              providerError,
          },
        );

        await releaseReservationAfterFailure({
          repository,

          usagePeriodId:
            reservedUsagePeriodId,

          userId:
            authenticatedUserId,

          requestId:
            aiRequestId,

          subscriptionId:
            subscriptionAccess
              .subscription
              .id,

          workspaceId,

          model:
            configuration.model,

          promptCharacters:
            message.length,

          conversationMessageCount:
            conversation.length,

          startedAt:
            aiRequestStartedAt,

          errorCode:
            `openai_http_${response.status}`,

          errorMessage:
            providerError,
        });

        reservedUsagePeriodId =
          null;

        return NextResponse.json(
          {
            success:
              false,

            error:
              getSafeOpenAiErrorMessage(
                response.status,
              ),
          },
          {
            status:
              mapOpenAiStatus(
                response.status,
              ),
          },
        );
      }

      const answer =
        extractResponseText(
          responseBody,
        );

      if (
        !answer
      ) {
        console.error(
          "CASE AI Coach received an OpenAI response without output text.",
        );

        await releaseReservationAfterFailure({
          repository,

          usagePeriodId:
            reservedUsagePeriodId,

          userId:
            authenticatedUserId,

          requestId:
            aiRequestId,

          subscriptionId:
            subscriptionAccess
              .subscription
              .id,

          workspaceId,

          model:
            configuration.model,

          promptCharacters:
            message.length,

          conversationMessageCount:
            conversation.length,

          startedAt:
            aiRequestStartedAt,

          errorCode:
            "empty_response",

          errorMessage:
            "OpenAI returned no usable output text.",
        });

        reservedUsagePeriodId =
          null;

        return NextResponse.json(
          {
            success:
              false,

            error:
              "AI Coach did not return a usable response. Please try again.",
          },
          {
            status:
              502,
          },
        );
      }

      const providerUsage =
        normalizeOpenAiUsage(
          responseBody.usage,
        );

      const modelPricing =
        getAiModelPricing(
          configuration.model,
        );

      const estimatedCostUsd =
        modelPricing
          ? calculateAiRequestCost({
              usage:
                providerUsage,

              pricing:
                modelPricing,
            })
          : 0;

      const providerRequestId =
        getOptionalString(
          responseBody.id,
        );

      const completedAt =
        new Date()
          .toISOString();

      /*
       * The OpenAI request succeeded, so the reserved question remains
       * consumed. Apply token/cost totals to the monthly usage period.
       */
      try {
        const usageApplied =
          await applyAiCoachUsage({
            usagePeriodId:
              reservedUsagePeriodId,

            userId:
              authenticatedUserId,

            usage:
              providerUsage,

            estimatedCostUsd,
          });

        if (
          !usageApplied
        ) {
          console.error(
            "CASE AI Coach could not apply token usage to the AI usage period.",
            {
              usagePeriodId:
                reservedUsagePeriodId,

              userId:
                authenticatedUserId,
            },
          );
        }
      } catch (
        usageError
      ) {
        /*
         * Do not release the question here. OpenAI successfully generated
         * the answer and incurred cost. Releasing would undercount usage.
         */
        console.error(
          "CASE AI Coach token/cost accounting failed after a successful OpenAI response.",
          usageError,
        );
      }

      try {
        await repository.saveAiRequest({
          request: {
            id:
              aiRequestId,

            userId:
              authenticatedUserId,

            workspaceId,

            subscriptionId:
              subscriptionAccess
                .subscription
                .id,

            usagePeriodId:
              reservedUsagePeriodId,

            requestType:
              "ai-coach",

            status:
              "completed",

            model:
              configuration.model,

            promptCharacters:
              message.length,

            conversationMessageCount:
              conversation.length,

            inputTokens:
              providerUsage
                .inputTokens,

            cachedInputTokens:
              providerUsage
                .cachedInputTokens,

            outputTokens:
              providerUsage
                .outputTokens,

            totalTokens:
              providerUsage
                .totalTokens,

            estimatedCostUsd,

            countedAgainstAllowance:
              true,

            providerRequestId,

            errorCode:
              null,

            errorMessage:
              null,

            startedAt:
              aiRequestStartedAt,

            completedAt,

            createdAt:
              aiRequestStartedAt,
          },
        });
      } catch (
        ledgerError
      ) {
        /*
         * The answer and usage are valid. Do not charge the user a second
         * question merely because ledger finalization failed.
         */
        console.error(
          "CASE AI Coach request ledger finalization failed.",
          ledgerError,
        );
      }

      console.info(
        "CASE AI Coach request completed.",
        {
          requestId:
            aiRequestId,

          providerRequestId,

          model:
            configuration.model,

          inputTokens:
            providerUsage
              .inputTokens,

          cachedInputTokens:
            providerUsage
              .cachedInputTokens,

          outputTokens:
            providerUsage
              .outputTokens,

          totalTokens:
            providerUsage
              .totalTokens,

          estimatedCostUsd,

          successfulQuestionsUsed:
            reservation
              .successfulQuestionsUsed,

          successfulQuestionsRemaining:
            reservation
              .successfulQuestionsRemaining,

          monthlyQuestionLimit:
            reservation
              .monthlyQuestionLimit,
        },
      );

      reservedUsagePeriodId =
        null;

      return NextResponse.json(
        {
          success:
            true,

          message:
            answer,

          model:
            configuration.model,

          allowance: {
            monthlyQuestionLimit:
              reservation
                .monthlyQuestionLimit,

            successfulQuestionsUsed:
              reservation
                .successfulQuestionsUsed,

            successfulQuestionsRemaining:
              reservation
                .successfulQuestionsRemaining,
          },

          usage: {
            inputTokens:
              providerUsage
                .inputTokens,

            cachedInputTokens:
              providerUsage
                .cachedInputTokens,

            outputTokens:
              providerUsage
                .outputTokens,

            totalTokens:
              providerUsage
                .totalTokens,

            estimatedCostUsd,

            providerRequestId,
          },
        },
      );
    } catch (
      error
    ) {
      /*
       * Network failures, timeouts, and unexpected provider-processing
       * failures must return the reserved question to the user.
       */
      if (
        reservedUsagePeriodId &&
        authenticatedUserId
      ) {
        await releaseReservationAfterFailure({
          repository,

          usagePeriodId:
            reservedUsagePeriodId,

          userId:
            authenticatedUserId,

          requestId:
            aiRequestId,

          subscriptionId:
            subscriptionAccess
              .subscription
              .id,

          workspaceId,

          model:
            configuration.model,

          promptCharacters:
            message.length,

          conversationMessageCount:
            conversation.length,

          startedAt:
            aiRequestStartedAt,

          errorCode:
            isAbortError(
              error,
            )
              ? "timeout"
              : "request_failed",

          errorMessage:
            getSafeErrorMessage(
              error,
            ),
        });

        reservedUsagePeriodId =
          null;
      }

      throw error;
    } finally {
      clearTimeout(
        timeout,
      );
    }
  } catch (
    error
  ) {
    /*
     * This is a final safety net. If an unexpected exception occurs after
     * reservation but before the inner request handler releases it, return
     * the allowance here.
     */
    if (
      reservedUsagePeriodId &&
      authenticatedUserId
    ) {
      await safelyReleaseAiCoachQuestion({
        usagePeriodId:
          reservedUsagePeriodId,

        userId:
          authenticatedUserId,
      });

      reservedUsagePeriodId =
        null;
    }

    if (
      isSubscriptionAccessError(
        error,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            getSubscriptionAccessErrorMessage(
              error,
            ),
        },
        {
          status:
            getSubscriptionAccessErrorStatus(
              error,
            ),
        },
      );
    }

    if (
      isAbortError(
        error,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "AI Coach took too long to respond. Please try again.",
        },
        {
          status:
            504,
        },
      );
    }

    console.error(
      "CASE AI Coach API route failed.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "AI Coach is temporarily unavailable. Please try again.",
      },
      {
        status:
          500,
      },
    );
  }
}

async function releaseReservationAfterFailure({
  repository,
  usagePeriodId,
  userId,
  requestId,
  subscriptionId,
  workspaceId,
  model,
  promptCharacters,
  conversationMessageCount,
  startedAt,
  errorCode,
  errorMessage,
}: {
  repository:
    ReturnType<
      typeof getSupabaseSubscriptionRepository
    >;

  usagePeriodId:
    string;

  userId:
    string;

  requestId:
    string;

  subscriptionId:
    string;

  workspaceId:
    string | null;

  model:
    string;

  promptCharacters:
    number;

  conversationMessageCount:
    number;

  startedAt:
    string;

  errorCode:
    string;

  errorMessage:
    string;
}) {
  await safelyReleaseAiCoachQuestion({
    usagePeriodId,

    userId,
  });

  try {
    await repository.saveAiRequest({
      request: {
        id:
          requestId,

        userId,

        workspaceId,

        subscriptionId,

        usagePeriodId,

        requestType:
          "ai-coach",

        status:
          "failed",

        model,

        promptCharacters,

        conversationMessageCount,

        inputTokens:
          0,

        cachedInputTokens:
          0,

        outputTokens:
          0,

        totalTokens:
          0,

        estimatedCostUsd:
          0,

        countedAgainstAllowance:
          false,

        providerRequestId:
          null,

        errorCode,

        errorMessage:
          truncateText(
            errorMessage,
            1_000,
          ),

        startedAt,

        completedAt:
          new Date()
            .toISOString(),

        createdAt:
          startedAt,
      },
    });
  } catch (
    ledgerError
  ) {
    console.error(
      "CASE AI Coach failed to finalize the failed request ledger entry.",
      ledgerError,
    );
  }
}

function getSafeErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return (
      error.message
        .trim() ||
      error.name
    );
  }

  return "Unexpected AI Coach request failure.";
}

function truncateText(
  value:
    string,
  maximumLength:
    number,
) {
  if (
    value.length <=
    maximumLength
  ) {
    return value;
  }

  return value.slice(
    0,
    maximumLength,
  );
}

function getOpenAiConfiguration():
  | {
      success:
        true;

      apiKey:
        string;

      model:
        string;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim();

  if (
    !apiKey
  ) {
    return {
      success:
        false,

      error:
        "AI Coach is not configured. OPENAI_API_KEY is missing.",
    };
  }

  const model =
    process.env
      .OPENAI_MODEL
      ?.trim();

  if (
    !model
  ) {
    return {
      success:
        false,

      error:
        "AI Coach is not configured. OPENAI_MODEL is missing.",
    };
  }

  return {
    success:
      true,

    apiKey,

    model,
  };
}

async function readJsonBody(
  request:
    Request,
):
  Promise<
    | {
        success:
          true;

        value:
          unknown;
      }
    | {
        success:
          false;

        error:
          string;
      }
  > {
  try {
    return {
      success:
        true,

      value:
        await request.json(),
    };
  } catch {
    return {
      success:
        false,

      error:
        "The request body must contain valid JSON.",
    };
  }
}

function validateAiCoachRequest(
  value:
    unknown,
):
  | {
      success:
        true;

      value:
        AiCoachRequestBody;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return {
      success:
        false,

      error:
        "Invalid AI Coach request.",
    };
  }

  const message =
    getString(
      record.message,
    );

  if (
    !message
  ) {
    return {
      success:
        false,

      error:
        "Enter a question for AI Coach.",
    };
  }

  if (
    message.length >
    MAX_USER_MESSAGE_LENGTH
  ) {
    return {
      success:
        false,

      error:
        `AI Coach questions must be ${MAX_USER_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`,
    };
  }

  const summary =
    validateSummary(
      record.summary,
    );

  if (
    !summary
  ) {
    return {
      success:
        false,

      error:
        "The AI Coach financial context is invalid.",
    };
  }

  const conversation =
    validateConversation(
      record.conversation,
    );

  if (
    !conversation.success
  ) {
    return conversation;
  }

  return {
    success:
      true,

    value: {
      message,

      summary,

      workspaceId:
        getOptionalString(
          record.workspaceId,
        ),

      workspaceName:
        getOptionalString(
          record.workspaceName,
        ),

      userFirstName:
        getOptionalString(
          record.userFirstName,
        ),

      conversation:
        conversation.value,
    },
  };
}

function validateSummary(
  value:
    unknown,
): AiCoachSummary | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const context =
    validateFinancialContext(
      record.context,
    );

  if (
    !context
  ) {
    return null;
  }

  const headline =
    getString(
      record.headline,
    );

  const summary =
    getString(
      record.summary,
    );

  if (
    !headline ||
    !summary
  ) {
    return null;
  }

  const insights =
    validateInsights(
      record.insights,
    );

  const suggestedPrompts =
    validateSuggestedPrompts(
      record.suggestedPrompts,
    );

  const topInsight =
    record.topInsight ===
    null
      ? null
      : validateInsight(
          record.topInsight,
        );

  const hasFinancialData =
    getBoolean(
      record.hasFinancialData,
    );

  if (
    hasFinancialData ===
    null
  ) {
    return null;
  }

  return {
    context,

    headline,

    summary,

    insights,

    suggestedPrompts,

    topInsight,

    hasFinancialData,
  };
}

function validateFinancialContext(
  value:
    unknown,
): AiCoachFinancialContext | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const period =
    asRecord(
      record.period,
    );

  if (
    !period
  ) {
    return null;
  }

  const startDate =
    getString(
      period.startDate,
    );

  const endDate =
    getString(
      period.endDate,
    );

  if (
    !startDate ||
    !endDate
  ) {
    return null;
  }

  const income =
    getNumber(
      record.income,
    );

  const expenses =
    getNumber(
      record.expenses,
    );

  const cashFlow =
    getNumber(
      record.cashFlow,
    );

  const totalAssets =
    getNumber(
      record.totalAssets,
    );

  const totalLiabilities =
    getNumber(
      record.totalLiabilities,
    );

  const netWorth =
    getNumber(
      record.netWorth,
    );

  const emergencyFundBalance =
    getNumber(
      record.emergencyFundBalance,
    );

  const totalDebt =
    getNumber(
      record.totalDebt,
    );

  const minimumDebtPayments =
    getNumber(
      record.minimumDebtPayments,
    );

  const overdueBillCount =
    getInteger(
      record.overdueBillCount,
    );

  const upcomingBillCount =
    getInteger(
      record.upcomingBillCount,
    );

  const budgetAssigned =
    getNumber(
      record.budgetAssigned,
    );

  const budgetSpent =
    getNumber(
      record.budgetSpent,
    );

  const budgetRemaining =
    getNumber(
      record.budgetRemaining,
    );

  const investmentValue =
    getNumber(
      record.investmentValue,
    );

  const investmentCostBasis =
    getNumber(
      record.investmentCostBasis,
    );

  const investmentGainLoss =
    getNumber(
      record.investmentGainLoss,
    );

  const transactionCount =
    getInteger(
      record.transactionCount,
    );

  const accountCount =
    getInteger(
      record.accountCount,
    );

  const goalCount =
    getInteger(
      record.goalCount,
    );

  const billCount =
    getInteger(
      record.billCount,
    );

  const debtCount =
    getInteger(
      record.debtCount,
    );

  const investmentAccountCount =
    getInteger(
      record.investmentAccountCount,
    );

  if (
    income ===
      null ||
    expenses ===
      null ||
    cashFlow ===
      null ||
    totalAssets ===
      null ||
    totalLiabilities ===
      null ||
    netWorth ===
      null ||
    emergencyFundBalance ===
      null ||
    totalDebt ===
      null ||
    minimumDebtPayments ===
      null ||
    overdueBillCount ===
      null ||
    upcomingBillCount ===
      null ||
    budgetAssigned ===
      null ||
    budgetSpent ===
      null ||
    budgetRemaining ===
      null ||
    investmentValue ===
      null ||
    investmentCostBasis ===
      null ||
    investmentGainLoss ===
      null ||
    transactionCount ===
      null ||
    accountCount ===
      null ||
    goalCount ===
      null ||
    billCount ===
      null ||
    debtCount ===
      null ||
    investmentAccountCount ===
      null
  ) {
    return null;
  }

  return {
    period: {
      startDate,

      endDate,
    },

    income,

    expenses,

    cashFlow,

    savingsRate:
      getNullableNumber(
        record.savingsRate,
      ),

    totalAssets,

    totalLiabilities,

    netWorth,

    emergencyFundBalance,

    emergencyFundMonths:
      getNullableNumber(
        record.emergencyFundMonths,
      ),

    totalDebt,

    minimumDebtPayments,

    overdueBillCount,

    upcomingBillCount,

    budgetAssigned,

    budgetSpent,

    budgetRemaining,

    investmentValue,

    investmentCostBasis,

    investmentGainLoss,

    transactionCount,

    accountCount,

    goalCount,

    billCount,

    debtCount,

    investmentAccountCount,
  };
}

function validateConversation(
  value:
    unknown,
):
  | {
      success:
        true;

      value:
        AiCoachConversationMessage[];
    }
  | {
      success:
        false;

      error:
        string;
    } {
  if (
    value ===
    undefined ||
    value ===
    null
  ) {
    return {
      success:
        true,

      value:
        [],
    };
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    return {
      success:
        false,

      error:
        "AI Coach conversation history is invalid.",
    };
  }

  if (
    value.length >
    MAX_CONVERSATION_MESSAGES
  ) {
    return {
      success:
        false,

      error:
        `AI Coach supports up to ${MAX_CONVERSATION_MESSAGES} conversation messages per request.`,
    };
  }

  const messages:
    AiCoachConversationMessage[] =
    [];

  for (
    const item
    of value
  ) {
    const record =
      asRecord(
        item,
      );

    if (
      !record
    ) {
      return {
        success:
          false,

        error:
          "AI Coach conversation history is invalid.",
      };
    }

    const role =
      getString(
        record.role,
      );

    const content =
      getString(
        record.content,
      );

    if (
      (
        role !==
          "user" &&
        role !==
          "assistant"
      ) ||
      !content
    ) {
      return {
        success:
          false,

        error:
          "AI Coach conversation history contains an invalid message.",
      };
    }

    if (
      content.length >
      MAX_CONVERSATION_MESSAGE_LENGTH
    ) {
      return {
        success:
          false,

        error:
          `AI Coach conversation messages must be ${MAX_CONVERSATION_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`,
      };
    }

    messages.push({
      role,

      content,
    });
  }

  return {
    success:
      true,

    value:
      messages,
  };
}

function validateInsights(
  value:
    unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      validateInsight,
    )
    .filter(
      (
        insight,
      ): insight is AiCoachInsight =>
        insight !==
        null,
    )
    .slice(
      0,
      20,
    );
}

function validateInsight(
  value:
    unknown,
): AiCoachInsight | null {
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

  const type =
    getString(
      record.type,
    );

  const priority =
    getString(
      record.priority,
    );

  const tone =
    getString(
      record.tone,
    );

  const title =
    getString(
      record.title,
    );

  const description =
    getString(
      record.description,
    );

  if (
    !id ||
    !isInsightType(
      type,
    ) ||
    !isInsightPriority(
      priority,
    ) ||
    !isInsightTone(
      tone,
    ) ||
    !title ||
    !description
  ) {
    return null;
  }

  return {
    id,

    type,

    priority,

    tone,

    title,

    description,

    valueLabel:
      getOptionalString(
        record.valueLabel,
      ),

    action:
      validateAction(
        record.action,
      ),
  };
}

function validateSuggestedPrompts(
  value:
    unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  const prompts:
    AiCoachSuggestedPrompt[] =
    [];

  for (
    const item
    of value.slice(
      0,
      10,
    )
  ) {
    const record =
      asRecord(
        item,
      );

    if (
      !record
    ) {
      continue;
    }

    const id =
      getString(
        record.id,
      );

    const label =
      getString(
        record.label,
      );

    const prompt =
      getString(
        record.prompt,
      );

    const category =
      getString(
        record.category,
      );

    if (
      !id ||
      !label ||
      !prompt ||
      !isInsightType(
        category,
      )
    ) {
      continue;
    }

    prompts.push({
      id,

      label,

      prompt,

      category,
    });
  }

  return prompts;
}

function validateAction(
  value:
    unknown,
): AiCoachInsight["action"] {
  if (
    value ===
    null ||
    value ===
    undefined
  ) {
    return null;
  }

  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const label =
    getString(
      record.label,
    );

  const href =
    getString(
      record.href,
    );

  if (
    !label ||
    !href
  ) {
    return null;
  }

  if (
    !href.startsWith(
      "/dashboard/",
    )
  ) {
    return null;
  }

  return {
    label,

    href,
  };
}

function buildOpenAiInput({
  conversation,
  userMessage,
}: {
  conversation:
    AiCoachConversationMessage[];

  userMessage:
    string;
}) {
  const input =
    conversation.map(
      (
        message,
      ) => {
        if (
          message.role ===
          "assistant"
        ) {
          return {
            role:
              "assistant" as const,

            content: [
              {
                type:
                  "output_text" as const,

                text:
                  message.content,
              },
            ],
          };
        }

        return {
          role:
            "user" as const,

          content: [
            {
              type:
                "input_text" as const,

              text:
                message.content,
            },
          ],
        };
      },
    );

  input.push({
    role:
      "user" as const,

    content: [
      {
        type:
          "input_text" as const,

        text:
          userMessage,
      },
    ],
  });

  return input;
}

async function readOpenAiResponse(
  response:
    Response,
): Promise<OpenAiResponsePayload> {
  try {
    const value =
      await response.json();

    const record =
      asRecord(
        value,
      );

    if (
      !record
    ) {
      return {};
    }

    return record;
  } catch {
    return {};
  }
}

function extractResponseText(
  payload:
    OpenAiResponsePayload,
) {
  const directOutputText =
    getString(
      payload.output_text,
    );

  if (
    directOutputText
  ) {
    return directOutputText;
  }

  if (
    !Array.isArray(
      payload.output,
    )
  ) {
    return null;
  }

  const textParts:
    string[] =
    [];

  for (
    const outputItem
    of payload.output
  ) {
    const outputRecord =
      asRecord(
        outputItem,
      );

    if (
      !outputRecord
    ) {
      continue;
    }

    if (
      outputRecord.type !==
      "message"
    ) {
      continue;
    }

    if (
      !Array.isArray(
        outputRecord.content,
      )
    ) {
      continue;
    }

    for (
      const contentItem
      of outputRecord.content
    ) {
      const contentRecord =
        asRecord(
          contentItem,
        );

      if (
        !contentRecord
      ) {
        continue;
      }

      if (
        contentRecord.type !==
        "output_text"
      ) {
        continue;
      }

      const text =
        getString(
          contentRecord.text,
        );

      if (
        text
      ) {
        textParts.push(
          text,
        );
      }
    }
  }

  const combinedText =
    textParts
      .join(
        "\n",
      )
      .trim();

  return (
    combinedText ||
    null
  );
}

function getOpenAiErrorMessage(
  payload:
    OpenAiResponsePayload,
) {
  const errorRecord =
    asRecord(
      payload.error,
    );

  return (
    getString(
      errorRecord?.message,
    ) ??
    "Unknown OpenAI API error."
  );
}

function getSafeOpenAiErrorMessage(
  status:
    number,
) {
  if (
    status ===
    401
  ) {
    return "AI Coach authentication failed. Check the server API configuration.";
  }

  if (
    status ===
    403
  ) {
    return "AI Coach does not currently have permission to use the configured model.";
  }

  if (
    status ===
    404
  ) {
    return "The configured AI Coach model could not be found.";
  }

  if (
    status ===
    429
  ) {
    return "AI Coach is receiving too many requests right now. Please try again shortly.";
  }

  if (
    status >=
    500
  ) {
    return "The AI service is temporarily unavailable. Please try again.";
  }

  return "AI Coach could not complete the request. Please try again.";
}

function mapOpenAiStatus(
  status:
    number,
) {
  if (
    status ===
    429
  ) {
    return 429;
  }

  if (
    status >=
    500
  ) {
    return 502;
  }

  return 500;
}

function isInsightType(
  value:
    string | null,
): value is AiCoachInsight["type"] {
  return (
    value ===
      "cash-flow" ||
    value ===
      "spending" ||
    value ===
      "savings" ||
    value ===
      "emergency-fund" ||
    value ===
      "debt" ||
    value ===
      "bills" ||
    value ===
      "budget" ||
    value ===
      "net-worth" ||
    value ===
      "investments" ||
    value ===
      "general"
  );
}

function isInsightPriority(
  value:
    string | null,
): value is AiCoachInsight["priority"] {
  return (
    value ===
      "critical" ||
    value ===
      "high" ||
    value ===
      "medium" ||
    value ===
      "low"
  );
}

function isInsightTone(
  value:
    string | null,
): value is AiCoachInsight["tone"] {
  return (
    value ===
      "positive" ||
    value ===
      "warning" ||
    value ===
      "neutral" ||
    value ===
      "informational"
  );
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

function getOptionalString(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return getString(
    value,
  );
}

function getNumber(
  value:
    unknown,
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function getNullableNumber(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return getNumber(
    value,
  );
}

function getInteger(
  value:
    unknown,
) {
  const numberValue =
    getNumber(
      value,
    );

  if (
    numberValue ===
      null ||
    !Number.isInteger(
      numberValue,
    ) ||
    numberValue <
      0
  ) {
    return null;
  }

  return numberValue;
}

function getBoolean(
  value:
    unknown,
) {
  if (
    typeof value !==
    "boolean"
  ) {
    return null;
  }

  return value;
}

function isAbortError(
  error:
    unknown,
) {
  if (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  ) {
    return true;
  }

  const record =
    asRecord(
      error,
    );

  return (
    getString(
      record?.name,
    ) ===
    "AbortError"
  );
}