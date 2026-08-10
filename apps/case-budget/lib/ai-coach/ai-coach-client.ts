import type {
  AiCoachConversationMessage,
} from "@/lib/ai-coach/ai-coach-prompt";

import type {
  AiCoachSummary,
} from "@/lib/ai-coach/ai-coach-service";

export type SendAiCoachMessageInput = {
  message:
    string;

  summary:
    AiCoachSummary;

  workspaceName?:
    string | null;

  userFirstName?:
    string | null;

  conversation?:
    AiCoachConversationMessage[];

  signal?:
    AbortSignal;
};

export type AiCoachApiSuccessResponse = {
  success:
    true;

  message:
    string;

  model:
    string | null;
};

export type AiCoachApiErrorResponse = {
  success:
    false;

  error:
    string;
};

export type AiCoachApiResponse =
  | AiCoachApiSuccessResponse
  | AiCoachApiErrorResponse;

export type AiCoachClientResult =
  | {
      success:
        true;

      message:
        string;

      model:
        string | null;
    }
  | {
      success:
        false;

      error:
        string;

      status:
        number | null;

      aborted:
        boolean;
    };

const AI_COACH_ENDPOINT =
  "/api/ai-coach";

const DEFAULT_ERROR_MESSAGE =
  "AI Coach could not complete the request. Please try again.";

const NETWORK_ERROR_MESSAGE =
  "AI Coach could not reach the server. Check your connection and try again.";

const ABORT_ERROR_MESSAGE =
  "AI Coach request was canceled.";

export async function sendAiCoachMessage({
  message,
  summary,
  workspaceName,
  userFirstName,
  conversation = [],
  signal,
}: SendAiCoachMessageInput): Promise<AiCoachClientResult> {
  const normalizedMessage =
    message.trim();

  if (
    !normalizedMessage
  ) {
    return {
      success:
        false,

      error:
        "Enter a question for AI Coach.",

      status:
        null,

      aborted:
        false,
    };
  }

  const normalizedConversation =
    normalizeConversation(
      conversation,
    );

  try {
    const response =
      await fetch(
        AI_COACH_ENDPOINT,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              message:
                normalizedMessage,

              summary,

              workspaceName:
                normalizeOptionalText(
                  workspaceName,
                ),

              userFirstName:
                normalizeOptionalText(
                  userFirstName,
                ),

              conversation:
                normalizedConversation,
            }),

          signal,

          cache:
            "no-store",
        },
      );

    const payload =
      await readApiResponse(
        response,
      );

    if (
      !response.ok
    ) {
      return {
        success:
          false,

        error:
          getApiErrorMessage(
            payload,
          ),

        status:
          response.status,

        aborted:
          false,
      };
    }

    if (
      !payload ||
      payload.success !==
        true
    ) {
      return {
        success:
          false,

        error:
          getApiErrorMessage(
            payload,
          ),

        status:
          response.status,

        aborted:
          false,
      };
    }

    const responseMessage =
      normalizeOptionalText(
        payload.message,
      );

    if (
      !responseMessage
    ) {
      return {
        success:
          false,

        error:
          "AI Coach returned an empty response. Please try again.",

        status:
          response.status,

        aborted:
          false,
      };
    }

    return {
      success:
        true,

      message:
        responseMessage,

      model:
        normalizeOptionalText(
          payload.model,
        ),
    };
  } catch (
    error
  ) {
    if (
      isAbortError(
        error,
      )
    ) {
      return {
        success:
          false,

        error:
          ABORT_ERROR_MESSAGE,

        status:
          null,

        aborted:
          true,
      };
    }

    console.error(
      "CASE AI Coach client request failed.",
      error,
    );

    return {
      success:
        false,

      error:
        NETWORK_ERROR_MESSAGE,

      status:
        null,

      aborted:
        false,
    };
  }
}

export function createAiCoachAbortController() {
  return new AbortController();
}

export function buildAiCoachConversationHistory(
  messages:
    Array<{
      role:
        | "user"
        | "coach"
        | "assistant";

      content:
        string;
    }>,
): AiCoachConversationMessage[] {
  return messages
    .map(
      (
        message,
      ) => {
        const content =
          message.content.trim();

        if (
          !content
        ) {
          return null;
        }

        if (
          message.role ===
          "user"
        ) {
          return {
            role:
              "user" as const,

            content,
          };
        }

        return {
          role:
            "assistant" as const,

          content,
        };
      },
    )
    .filter(
      (
        message,
      ): message is AiCoachConversationMessage =>
        message !==
        null,
    );
}

async function readApiResponse(
  response:
    Response,
): Promise<AiCoachApiResponse | null> {
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
      const message =
        normalizeOptionalText(
          value.message,
        );

      if (
        !message
      ) {
        return null;
      }

      return {
        success:
          true,

        message,

        model:
          normalizeOptionalText(
            value.model,
          ),
      };
    }

    if (
      value.success ===
      false
    ) {
      return {
        success:
          false,

        error:
          normalizeOptionalText(
            value.error,
          ) ??
          DEFAULT_ERROR_MESSAGE,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getApiErrorMessage(
  payload:
    AiCoachApiResponse | null,
) {
  if (
    payload &&
    payload.success ===
      false
  ) {
    return (
      normalizeOptionalText(
        payload.error,
      ) ??
      DEFAULT_ERROR_MESSAGE
    );
  }

  return DEFAULT_ERROR_MESSAGE;
}

function normalizeConversation(
  conversation:
    AiCoachConversationMessage[],
) {
  return conversation
    .map(
      (
        message,
      ) => ({
        role:
          message.role,

        content:
          message.content.trim(),
      }),
    )
    .filter(
      (
        message,
      ) =>
        message.content.length >
        0,
    );
}

function normalizeOptionalText(
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

function isAbortError(
  error:
    unknown,
) {
  if (
    typeof DOMException !==
      "undefined" &&
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  ) {
    return true;
  }

  if (
    !isRecord(
      error,
    )
  ) {
    return false;
  }

  return (
    error.name ===
    "AbortError"
  );
}