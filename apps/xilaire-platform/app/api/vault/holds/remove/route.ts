import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";

type RemoveHoldBody = {
  holdId?: string;
  messageId?: string;
  messageIds?: string[];
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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  let body: RemoveHoldBody;

  try {
    body = (await request.json()) as RemoveHoldBody;
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const holdId = typeof body.holdId === "string" ? body.holdId.trim() : "";
  const requestedMessageIds = uniqueNonEmpty([
    body.messageId,
    ...(Array.isArray(body.messageIds) ? body.messageIds : []),
  ]);

  if (!holdId) {
    return jsonError("holdId is required.");
  }

  if (requestedMessageIds.length === 0) {
    return jsonError("At least one messageId is required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id, role, account_type")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return jsonError(`Failed to load profile: ${profileError.message}`, 500);
  }

  if (!profile?.org_id) {
    return jsonError("No organization is associated with the current user.", 403);
  }

  if (!canManageVault(profile)) {
    return jsonError("You do not have permission to remove holds.", 403);
  }

  const { data: hold, error: holdError } = await supabase
    .from("vault_holds")
    .select("id, org_id, name, status")
    .eq("id", holdId)
    .eq("org_id", profile.org_id)
    .maybeSingle<HoldRow>();

  if (holdError) {
    return jsonError(`Failed to load hold: ${holdError.message}`, 500);
  }

  if (!hold) {
    return jsonError("Hold not found.", 404);
  }

  const { data: messages, error: messagesError } = await supabase
    .from("vault_messages")
    .select("id, org_id, subject, on_hold")
    .eq("org_id", profile.org_id)
    .in("id", requestedMessageIds);

  if (messagesError) {
    return jsonError(`Failed to load messages: ${messagesError.message}`, 500);
  }

  const messageRows = (messages ?? []) as MessageRow[];

  if (messageRows.length !== requestedMessageIds.length) {
    const foundIds = new Set(messageRows.map((row) => row.id));
    const missingIds = requestedMessageIds.filter((id) => !foundIds.has(id));

    return NextResponse.json(
      {
        error: "One or more messages were not found in your organization.",
        missingMessageIds: missingIds,
      },
      { status: 404 }
    );
  }

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("vault_hold_messages")
    .select("id, hold_id, message_id")
    .eq("hold_id", hold.id)
    .in("message_id", requestedMessageIds);

  if (existingLinksError) {
    return jsonError(`Failed to load existing hold links: ${existingLinksError.message}`, 500);
  }

  const existingLinkRows = (existingLinks ?? []) as HoldLinkRow[];
  const linkedMessageIds = new Set(existingLinkRows.map((row) => row.message_id));

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

  const removedMessageIds = requestedMessageIds.filter((id) => linkedMessageIds.has(id));

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

  if (messageIdsToClear.length > 0) {
    const { error: clearFlagsError } = await supabase
      .from("vault_messages")
      .update({
        on_hold: false,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", profile.org_id)
      .in("id", messageIdsToClear);

    if (clearFlagsError) {
      return jsonError(`Failed to clear message hold flags: ${clearFlagsError.message}`, 500);
    }
  }

  const messageIdsToKeepTrue = removedMessageIds.filter((messageId) =>
    messagesWithOtherHolds.has(messageId)
  );

  if (messageIdsToKeepTrue.length > 0) {
    const { error: keepFlagsError } = await supabase
      .from("vault_messages")
      .update({
        on_hold: true,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", profile.org_id)
      .in("id", messageIdsToKeepTrue);

    if (keepFlagsError) {
      return jsonError(`Failed to preserve remaining message hold flags: ${keepFlagsError.message}`, 500);
    }
  }

  const notLinkedMessageIds = requestedMessageIds.filter((id) => !linkedMessageIds.has(id));

  return NextResponse.json({
    success: true,
    hold: {
      id: hold.id,
      name: hold.name,
      status: hold.status,
    },
    summary: {
      requestedCount: requestedMessageIds.length,
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