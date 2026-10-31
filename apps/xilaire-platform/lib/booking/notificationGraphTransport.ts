/**
 * XilAire Technologies
 * AUTH-04T-24U-R8M-R2
 *
 * Direct, single-use Microsoft Graph sendMail adapter.
 *
 * This file does not obtain tokens or perform a request
 * when imported or when a transport is constructed.
 *
 * The caller must provide an explicitly approved
 * HTTP implementation.
 */

import type {
  BookingNotificationMessage,
} from "./notificationTemplates"

import type {
  NotificationTransport,
} from "./notificationSubmission"

export type GraphSendMailFetch = (
  url: string,
  init: {
    method: "POST"
    headers: Record<string, string>
    body: string
    redirect: "error"
    cache: "no-store"
  }
) => Promise<{ status: number }>

export type GraphTransportOptions = {
  accessToken: string
  bookingMailbox: string
  message: BookingNotificationMessage
  fetchImpl: GraphSendMailFetch
}

function requireMailbox(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[^\s@/\\?#]+@[^\s@/\\?#]+\.[^\s@/\\?#]+$/.test(value)
  ) {
    throw new Error("GRAPH_TRANSPORT_MAILBOX_INVALID")
  }

  return value
}

function requireToken(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    /[\r\n]/.test(value)
  ) {
    throw new Error("GRAPH_TRANSPORT_TOKEN_INVALID")
  }

  return value
}

function requireMessage(
  message: BookingNotificationMessage
): void {
  if (
    !message ||
    typeof message.subject !== "string" ||
    !message.subject.trim() ||
    /[\r\n]/.test(message.subject) ||
    message.body?.contentType !== "HTML" ||
    typeof message.body.content !== "string" ||
    !message.body.content.trim() ||
    !Array.isArray(message.toRecipients) ||
    message.toRecipients.length !== 1
  ) {
    throw new Error("GRAPH_TRANSPORT_MESSAGE_INVALID")
  }

  requireMailbox(
    message.toRecipients[0]?.emailAddress?.address
  )
}

/**
 * Constructs a single-use HTTP transport.
 *
 * Calling the returned function more than once will
 * throw before another HTTP request can be issued.
 *
 * The injected fetchImpl must itself be non-retrying.
 */
export function createGraphSendMailTransport(
  options: GraphTransportOptions
): NotificationTransport {
  if (
    !options ||
    typeof options.fetchImpl !== "function"
  ) {
    throw new Error("GRAPH_TRANSPORT_FETCH_REQUIRED")
  }

  const token = requireToken(options.accessToken)
  const mailbox = requireMailbox(options.bookingMailbox)

  requireMessage(options.message)

  const endpoint =
    "https://graph.microsoft.com/v1.0/users/" +
    encodeURIComponent(mailbox) +
    "/sendMail"

  // Serialize before any transport invocation.
  const body = JSON.stringify({
    message: options.message,
    saveToSentItems: true,
  })

  const fetchImpl = options.fetchImpl

  let attempted = false

  return async (): Promise<number> => {
    if (attempted) {
      throw new Error("GRAPH_TRANSPORT_ALREADY_ATTEMPTED")
    }

    // Mark attempted before the external operation.
    attempted = true

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      redirect: "error",
      cache: "no-store",
    })

    if (
      !response ||
      typeof response.status !== "number" ||
      !Number.isInteger(response.status)
    ) {
      throw new Error("GRAPH_TRANSPORT_RESPONSE_INVALID")
    }

    return response.status
  }
}