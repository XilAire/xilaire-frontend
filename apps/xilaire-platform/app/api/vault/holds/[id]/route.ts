import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

type VaultHoldStatus = "active" | "released" | "expired";

type UpdateVaultHoldRequest = {
  action?: "release";
  name?: string | null;
  description?: string | null;
  reason?: string | null;
  releasedAt?: string | null;
};

function getHoldIdFromPath(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const holdId = parts[parts.length - 1]?.trim();

  if (!holdId) {
    throw new Error("A valid hold id is required.");
  }

  return holdId;
}

function toInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeLimit(value: number): number {
  if (value < 1) return 25;
  if (value > 250) return 250;
  return value;
}

function sanitizeOffset(value: number): number {
  if (value < 0) return 0;
  return value;
}

function getSupportContext(request: NextRequest) {
  const supportSessionId =
    request.headers.get("x-support-session-id") ||
    request.headers.get("X-Support-Session-Id") ||
    request.nextUrl.searchParams.get("supportSessionId") ||
    null;

  const supportGrantId =
    request.headers.get("x-support-grant-id") ||
    request.headers.get("X-Support-Grant-Id") ||
    request.nextUrl.searchParams.get("supportGrantId") ||
    null;

  return {
    supportSessionId,
    supportGrantId,
  };
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Invalid string field in request payload.");
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizePatchPayload(body: unknown): UpdateVaultHoldRequest {
  if (!body || typeof body !== "object") {
    throw new Error("A valid hold update payload is required.");
  }

  const input = body as Record<string, unknown>;

  const action =
    input.action === undefined
      ? undefined
      : input.action === "release"
      ? "release"
      : (() => {
          throw new Error('action must be "release" when provided.');
        })();

  const name = normalizeNullableString(input.name);
  const description = normalizeNullableString(input.description);
  const reason = normalizeNullableString(input.reason);
  const releasedAt = normalizeNullableString(input.releasedAt);

  if (
    action === undefined &&
    name === undefined &&
    description === undefined &&
    reason === undefined
  ) {
    throw new Error("At least one updatable field is required.");
  }

  return {
    action,
    name,
    description,
    reason,
    releasedAt,
  };
}

async function getHoldOrThrow(params: {
  holdId: string;
  orgId: string;
}) {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_holds")
    .select(
      `
      id,
      org_id,
      name,
      description,
      hold_type,
      scope_type,
      scope_value,
      status,
      reason,
      started_at,
      released_at,
      created_by,
      created_at,
      updated_at
      `
    )
    .eq("id", params.holdId)
    .eq("org_id", params.orgId)
    .single();

  if (error || !data) {
    throw new Error("Vault hold not found for the target org.");
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "full_support_admin",
    });

    const adminClient = getVaultAdminClient();
    const holdId = getHoldIdFromPath(request);
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const hold = await getHoldOrThrow({
      holdId,
      orgId: access.targetOrgId,
    });

    const includeMessages =
      request.nextUrl.searchParams.get("includeMessages") !== "false";

    let holdMessages: Array<Record<string, unknown>> = [];

    if (includeMessages) {
      const limit = sanitizeLimit(toInt(request.nextUrl.searchParams.get("limit"), 50));
      const offset = sanitizeOffset(toInt(request.nextUrl.searchParams.get("offset"), 0));

      const { data, error } = await adminClient
        .from("vault_hold_messages")
        .select(
          `
          id,
          org_id,
          hold_id,
          message_id,
          applied_at,
          applied_by,
          notes,
          vault_messages (
            id,
            subject,
            sender_email,
            sent_at,
            received_at,
            on_hold,
            disposition_status,
            has_attachments,
            attachment_count,
            size_bytes
          )
          `
        )
        .eq("org_id", access.targetOrgId)
        .eq("hold_id", holdId)
        .order("applied_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Unable to load hold messages: ${error.message}`);
      }

      holdMessages = data ?? [];
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.hold.read",
      entityType: "vault_hold",
      entityId: hold.id,
      status: "success",
      details: {
        include_messages: includeMessages,
        linked_message_count: holdMessages.length,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      item: hold,
      holdMessages,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault hold lookup failed.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("support grant") ||
      lower.includes("scope")
        ? 403
        : lower.includes("authenticate") || lower.includes("bearer token")
        ? 401
        : lower.includes("not found")
        ? 404
        : 400;

    return jsonError(message, status);
  }
}

export async function PATCH(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let auditHoldId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "full_support_admin",
    });

    auditAccess = access;

    const adminClient = getVaultAdminClient();
    const holdId = getHoldIdFromPath(request);
    auditHoldId = holdId;

    const { supportSessionId, supportGrantId } = getSupportContext(request);
    const payload = normalizePatchPayload(await request.json());

    const existingHold = await getHoldOrThrow({
      holdId,
      orgId: access.targetOrgId,
    });

    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      if (payload.name === null) {
        throw new Error("name cannot be null.");
      }
      updates.name = payload.name;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description;
    }

    if (payload.reason !== undefined) {
      updates.reason = payload.reason;
    }

    if (payload.action === "release") {
      if ((existingHold.status as VaultHoldStatus) !== "active") {
        throw new Error("Only active holds can be released.");
      }

      updates.status = "released";
      updates.released_at = payload.releasedAt ?? new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid hold updates were supplied.");
    }

    const { data: updatedHold, error: updateError } = await adminClient
      .from("vault_holds")
      .update(updates)
      .eq("id", holdId)
      .eq("org_id", access.targetOrgId)
      .select(
        `
        id,
        org_id,
        name,
        description,
        hold_type,
        scope_type,
        scope_value,
        status,
        reason,
        started_at,
        released_at,
        created_by,
        created_at,
        updated_at
        `
      )
      .single();

    if (updateError || !updatedHold) {
      throw new Error(`Unable to update Vault hold: ${updateError?.message ?? "Unknown error"}`);
    }

    if (payload.action === "release") {
      const { data: remainingActiveLinks, error: linksError } = await adminClient
        .from("vault_hold_messages")
        .select(
          `
          message_id,
          vault_holds!inner (
            id,
            status
          )
          `
        )
        .eq("org_id", access.targetOrgId)
        .eq("hold_id", holdId);

      if (linksError) {
        throw new Error(`Unable to validate hold release state: ${linksError.message}`);
      }

      const releasedMessageIds = Array.from(
        new Set((remainingActiveLinks ?? []).map((row: any) => row.message_id).filter(Boolean))
      );

      if (releasedMessageIds.length > 0) {
        const { data: otherActiveHoldLinks, error: activeHoldCheckError } = await adminClient
          .from("vault_hold_messages")
          .select(
            `
            message_id,
            hold_id,
            vault_holds!inner (
              id,
              status
            )
            `
          )
          .eq("org_id", access.targetOrgId)
          .in("message_id", releasedMessageIds);

        if (activeHoldCheckError) {
          throw new Error(`Unable to validate remaining hold links: ${activeHoldCheckError.message}`);
        }

        const messageIdsStillProtected = new Set<string>();

        for (const row of otherActiveHoldLinks ?? []) {
          const joinedHold = Array.isArray((row as any).vault_holds)
            ? (row as any).vault_holds[0]
            : (row as any).vault_holds;

          if (
            joinedHold?.status === "active" &&
            (row as any).hold_id !== holdId &&
            (row as any).message_id
          ) {
            messageIdsStillProtected.add((row as any).message_id);
          }
        }

        const messageIdsToUnflag = releasedMessageIds.filter(
          (messageId) => !messageIdsStillProtected.has(messageId)
        );

        if (messageIdsToUnflag.length > 0) {
          const { error: unflagError } = await adminClient
            .from("vault_messages")
            .update({
              on_hold: false,
              disposition_status: "retained",
            })
            .eq("org_id", access.targetOrgId)
            .in("id", messageIdsToUnflag);

          if (unflagError) {
            throw new Error(`Unable to update released message hold state: ${unflagError.message}`);
          }
        }
      }
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: payload.action === "release" ? "vault.hold.release" : "vault.hold.update",
      entityType: "vault_hold",
      entityId: updatedHold.id,
      status: "success",
      details: {
        updated_fields: Object.keys(updates),
        new_status: updatedHold.status,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      item: updatedHold,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.hold.update",
          entityType: "vault_hold",
          entityId: auditHoldId,
          status: "failure",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          request,
          supportSessionId,
          supportGrantId,
        });
      } catch {
        // swallow audit failures on error path
      }
    }

    const message =
      error instanceof Error ? error.message : "Vault hold update failed.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("support grant") ||
      lower.includes("scope")
        ? 403
        : lower.includes("authenticate") || lower.includes("bearer token")
        ? 401
        : lower.includes("not found")
        ? 404
        : 400;

    return jsonError(message, status);
  }
}