import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";

type BulkHoldAction = "apply" | "remove";

type BulkHoldBody = {
  action?: BulkHoldAction;
  holdId?: string;
  messageIds?: string[];
  notes?: string | null;
};

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
  account_type: string | null;
};

type HoldRow = {
  id: string;
  org_id: string;
  name: string | null;
  status: string | null;
};

type MessageRow = {
  id: string;
  org_id: string;
  subject: string | null;
  on_hold: boolean | null;
};

type HoldLinkRow = {
  id: string;
  hold_id: string;
  message_id: string;
};

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function canManageVault(profile: ProfileRow | null) {
  if (!profile?.role) return false;

  const allowedRoles = new Set([
    "master_admin",
    "super_admin",
    "admin",
    "vault_admin",
    "vault_compliance_admin",
  ]);

  return allowedRoles.has(profile.role);
}

async function loadAuthorizedContext(
  supabase: ReturnType<typeof createRouteSupabaseClient>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: jsonError("Unauthorized.", 401),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id, role, account_type")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return {
      ok: false as const,
      response: jsonError(`Failed to load profile: ${profileError.message}`, 500),
    };
  }

  if (!profile?.org_id) {
    return {
      ok: false as const,
      response: jsonError("No organization is associated with the current user.", 403),
    };
  }

  if (!canManageVault(profile)) {
    return {
      ok: false as const,
      response: jsonError("You do not have permission to manage holds.", 403),
    };
  }

  return {
    ok: true as const,
    user,
    profile,
  };
}

async function loadHoldAndMessages(
  supabase: ReturnType<typeof createRouteSupabaseClient>,
  orgId: string,
  holdId: string,
  messageIds: string[]
) {
  const { data: hold, error: holdError } = await supabase
    .from("vault_holds")
    .select("id, org_id, name, status")
    .eq("id", holdId)
    .eq("org_id", orgId)
    .maybeSingle<HoldRow>();

  if (holdError) {
    return {
      ok: false as const,
      response: jsonError(`Failed to load hold: ${holdError.message}`, 500),
    };
  }

  if (!hold) {
    return {
      ok: false as const,
      response: jsonError("Hold not found.", 404),
    };
  }

  const { data: messages, error: messagesError } = await supabase
    .from("vault_messages")
    .select("id, org_id, subject, on_hold")
    .eq("org_id", orgId)
    .in("id", messageIds);

  if (messagesError) {
    return {
      ok: false as const,
      response: jsonError(`Failed to load messages: ${messagesError.message}`, 500),
    };
  }

  const messageRows = (messages ?? []) as MessageRow[];

  if (messageRows.length !== messageIds.length) {
    const foundIds = new Set(messageRows.map((row) => row.id));
    const missingIds = messageIds.filter((id) => !foundIds.has(id));

    return {
      ok: false as const,
      response: jsonError(
        "One or more messages were not found in your organization.",
        404,
        { missingMessageIds: missingIds }
      ),
    };
  }

  return {
    ok: true as const,
    hold,
    messages: messageRows,
  };
}

async function applyBulkHold(params: {
  supabase: ReturnType<typeof createRouteSupabaseClient>;
  orgId: string;
  userId: string;
  hold: HoldRow;
  messages: MessageRow[];
  notes: string | null;
}) {
  const { supabase, orgId, userId, hold, messages, notes } = params;
  const messageIds = messages.map((message) => message.id);

  if (hold.status && hold.status !== "active") {
    return jsonError("Only active holds can be applied.", 409);
  }

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("vault_hold_messages")
    .select("id, hold_id, message_id")
    .eq("hold_id", hold.id)
    .in("message_id", messageIds);

  if (existingLinksError) {
    return jsonError(`Failed to load existing hold links: ${existingLinksError.message}`, 500);
  }

  const existingLinkRows = (existingLinks ?? []) as HoldLinkRow[];
  const alreadyLinkedMessageIds = new Set(existingLinkRows.map((row) => row.message_id));

  const timestamp = new Date().toISOString();

  const linksToInsert = messages
    .filter((message) => !alreadyLinkedMessageIds.has(message.id))
    .map((message) => ({
      org_id: orgId,
      hold_id: hold.id,
      message_id: message.id,
      applied_at: timestamp,
      applied_by: userId,
      notes,
    }));

  if (linksToInsert.length > 0) {
    const { error: insertLinksError } = await supabase
      .from("vault_hold_messages")
      .insert(linksToInsert);

    if (insertLinksError) {
      return jsonError(`Failed to create hold links: ${insertLinksError.message}`, 500);
    }
  }

  const { error: updateMessagesError } = await supabase
    .from("vault_messages")
    .update({
      on_hold: true,
      updated_at: timestamp,
    })
    .eq("org_id", orgId)
    .in("id", messageIds);

  if (updateMessagesError) {
    return jsonError(`Failed to update message hold flags: ${updateMessagesError.message}`, 500);
  }

  const { data: refreshedLinks, error: refreshedLinksError } = await supabase
    .from("vault_hold_messages")
    .select(
      `
        id,
        org_id,
        hold_id,
        message_id,
        applied_at,
        applied_by,
        notes
      `
    )
    .eq("hold_id", hold.id)
    .in("message_id", messageIds);

  if (refreshedLinksError) {
    return jsonError(`Failed to load updated hold links: ${refreshedLinksError.message}`, 500);
  }

  return NextResponse.json({
    success: true,
    action: "apply",
    hold: {
      id: hold.id,
      name: hold.name,
      status: hold.status,
    },
    summary: {
      requestedCount: messageIds.length,
      insertedCount: linksToInsert.length,
      alreadyLinkedCount: messageIds.length - linksToInsert.length,
      updatedMessageCount: messageIds.length,
    },
    links: refreshedLinks ?? [],
  });
}

async function removeBulkHold(params: {
  supabase: ReturnType<typeof createRouteSupabaseClient>;
  orgId: string;
  hold: HoldRow;
  messages: MessageRow[];
}) {
  const { supabase, orgId, hold, messages } = params;
  const messageIds = messages.map((message) => message.id);

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("vault_hold_messages")
    .select("id, hold_id, message_id")
    .eq("hold_id", hold.id)
    .in("message_id", messageIds);

  if (existingLinksError) {
    return jsonError(`Failed to load existing hold links: ${existingLinksError.message}`, 500);
  }

  const existingLinkRows = (existingLinks ?? []) as HoldLinkRow[];
  const linkedMessageIds = new Set(existingLinkRows.map((row) => row.message_id));
  const removedMessageIds = messageIds.filter((id) => linkedMessageIds.has(id));
  const notLinkedMessageIds = messageIds.filter((id) => !linkedMessageIds.has(id));

  if (existingLinkRows.length > 0) {
    const linkIdsToDelete = existingLinkRows.map((row) => row.id);

    const { error: deleteLinksError } = await supabase
      .from("vault_hold_messages")
      .delete()
      .in("id", linkIdsToDelete);

    if (deleteLinksError) {
      return jsonError(`Failed to remove hold links: ${deleteLinksError.message}`, 500);
    }
  }

  let messagesWithOtherHolds = new Set<string>();

  if (removedMessageIds.length > 0) {
    const { data: remainingLinks, error: remainingLinksError } = await supabase
      .from("vault_hold_messages")
      .select("message_id")
      .in("message_id", removedMessageIds);

    if (remainingLinksError) {
      return jsonError(`Failed to verify remaining hold links: ${remainingLinksError.message}`, 500);
    }

    messagesWithOtherHolds = new Set(
      (remainingLinks ?? [])
        .map((row: { message_id: string | null }) => row.message_id)
        .filter(Boolean) as string[]
    );
  }

  const messageIdsToClear = removedMessageIds.filter(
    (messageId) => !messagesWithOtherHolds.has(messageId)
  );

  const messageIdsToKeepTrue = removedMessageIds.filter((messageId) =>
    messagesWithOtherHolds.has(messageId)
  );

  const timestamp = new Date().toISOString();

  if (messageIdsToClear.length > 0) {
    const { error: clearFlagsError } = await supabase
      .from("vault_messages")
      .update({
        on_hold: false,
        updated_at: timestamp,
      })
      .eq("org_id", orgId)
      .in("id", messageIdsToClear);

    if (clearFlagsError) {
      return jsonError(`Failed to clear message hold flags: ${clearFlagsError.message}`, 500);
    }
  }

  if (messageIdsToKeepTrue.length > 0) {
    const { error: keepFlagsError } = await supabase
      .from("vault_messages")
      .update({
        on_hold: true,
        updated_at: timestamp,
      })
      .eq("org_id", orgId)
      .in("id", messageIdsToKeepTrue);

    if (keepFlagsError) {
      return jsonError(`Failed to preserve remaining message hold flags: ${keepFlagsError.message}`, 500);
    }
  }

  return NextResponse.json({
    success: true,
    action: "remove",
    hold: {
      id: hold.id,
      name: hold.name,
      status: hold.status,
    },
    summary: {
      requestedCount: messageIds.length,
      removedCount: removedMessageIds.length,
      notLinkedCount: notLinkedMessageIds.length,
      clearedHoldFlagCount: messageIdsToClear.length,
      preservedHoldFlagCount: messageIdsToKeepTrue.length,
    },
    messageIds: {
      removed: removedMessageIds,
      notLinked: notLinkedMessageIds,
      clearedHoldFlag: messageIdsToClear,
      preservedHoldFlag: messageIdsToKeepTrue,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();

  const authContext = await loadAuthorizedContext(supabase);
  if (!authContext.ok) {
    return authContext.response;
  }

  let body: BulkHoldBody;

  try {
    body = (await request.json()) as BulkHoldBody;
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const action = body.action;
  const holdId = typeof body.holdId === "string" ? body.holdId.trim() : "";
  const messageIds = uniqueNonEmpty(Array.isArray(body.messageIds) ? body.messageIds : []);
  const notes =
    typeof body.notes === "string" && body.notes.trim().length > 0
      ? body.notes.trim()
      : null;

  if (action !== "apply" && action !== "remove") {
    return jsonError("action must be either 'apply' or 'remove'.");
  }

  if (!holdId) {
    return jsonError("holdId is required.");
  }

  if (messageIds.length === 0) {
    return jsonError("At least one messageId is required.");
  }

  const contextResult = await loadHoldAndMessages(
    supabase,
    authContext.profile.org_id!,
    holdId,
    messageIds
  );

  if (!contextResult.ok) {
    return contextResult.response;
  }

  if (action === "apply") {
    return applyBulkHold({
      supabase,
      orgId: authContext.profile.org_id!,
      userId: authContext.user.id,
      hold: contextResult.hold,
      messages: contextResult.messages,
      notes,
    });
  }

  return removeBulkHold({
    supabase,
    orgId: authContext.profile.org_id!,
    hold: contextResult.hold,
    messages: contextResult.messages,
  });
}