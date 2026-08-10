"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  deleteNetWorthSnapshot,
  getNetWorthSnapshots,
  recordNetWorthSnapshot,
  type NetWorthSnapshot,
} from "@/lib/net-worth/net-worth-service";

export type LoadNetWorthSnapshotsActionResult = {
  success: boolean;
  snapshots: NetWorthSnapshot[];
  error: string | null;
};

export type RecordNetWorthSnapshotActionInput = {
  workspaceId: string;
  snapshotDate?: string;
  totalAssets: number;
  totalLiabilities: number;
};

export type RecordNetWorthSnapshotActionResult = {
  success: boolean;
  snapshot: NetWorthSnapshot | null;
  error: string | null;
};

export type DeleteNetWorthSnapshotActionInput = {
  workspaceId: string;
  snapshotId: string;
};

export type DeleteNetWorthSnapshotActionResult = {
  success: boolean;
  error: string | null;
};

const NET_WORTH_ROUTE =
  "/dashboard/net-worth";

export async function loadNetWorthSnapshotsAction(
  workspaceId: string,
): Promise<LoadNetWorthSnapshotsActionResult> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      snapshots: [],
      error:
        "A workspace is required to load net worth history.",
    };
  }

  const result =
    await getNetWorthSnapshots(
      normalizedWorkspaceId,
    );

  if (
    !result.success
  ) {
    return {
      success: false,
      snapshots: [],
      error:
        result.error ??
        "Unable to load net worth history.",
    };
  }

  return {
    success: true,
    snapshots:
      result.data,
    error: null,
  };
}

export async function recordNetWorthSnapshotAction({
  workspaceId,
  snapshotDate,
  totalAssets,
  totalLiabilities,
}: RecordNetWorthSnapshotActionInput): Promise<RecordNetWorthSnapshotActionResult> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      snapshot: null,
      error:
        "A workspace is required to record net worth.",
    };
  }

  if (
    !Number.isFinite(
      totalAssets,
    ) ||
    totalAssets < 0
  ) {
    return {
      success: false,
      snapshot: null,
      error:
        "Total assets must be a valid amount greater than or equal to $0.",
    };
  }

  if (
    !Number.isFinite(
      totalLiabilities,
    ) ||
    totalLiabilities < 0
  ) {
    return {
      success: false,
      snapshot: null,
      error:
        "Total liabilities must be a valid amount greater than or equal to $0.",
    };
  }

  const result =
    await recordNetWorthSnapshot({
      workspaceId:
        normalizedWorkspaceId,

      snapshotDate,

      totalAssets,

      totalLiabilities,
    });

  if (
    !result.success ||
    !result.data
  ) {
    return {
      success: false,
      snapshot: null,
      error:
        result.error ??
        "Unable to record the net worth snapshot.",
    };
  }

  revalidatePath(
    NET_WORTH_ROUTE,
  );

  revalidatePath(
    "/dashboard",
  );

  return {
    success: true,
    snapshot:
      result.data,
    error: null,
  };
}

export async function deleteNetWorthSnapshotAction({
  workspaceId,
  snapshotId,
}: DeleteNetWorthSnapshotActionInput): Promise<DeleteNetWorthSnapshotActionResult> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  const normalizedSnapshotId =
    snapshotId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      error:
        "A workspace is required to delete a net worth snapshot.",
    };
  }

  if (
    !normalizedSnapshotId
  ) {
    return {
      success: false,
      error:
        "A net worth snapshot is required.",
    };
  }

  const result =
    await deleteNetWorthSnapshot(
      normalizedSnapshotId,
      normalizedWorkspaceId,
    );

  if (
    !result.success
  ) {
    return {
      success: false,
      error:
        result.error ??
        "Unable to delete the net worth snapshot.",
    };
  }

  revalidatePath(
    NET_WORTH_ROUTE,
  );

  revalidatePath(
    "/dashboard",
  );

  return {
    success: true,
    error: null,
  };
}