import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

export type NetWorthSnapshot = {
  id: string;
  workspaceId: string;
  snapshotDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNetWorthSnapshotInput = {
  workspaceId: string;
  snapshotDate?: string;
  totalAssets: number;
  totalLiabilities: number;
};

export type NetWorthSnapshotResult = {
  success: boolean;
  data: NetWorthSnapshot | null;
  error: string | null;
};

export type NetWorthSnapshotsResult = {
  success: boolean;
  data: NetWorthSnapshot[];
  error: string | null;
};

export type DeleteNetWorthSnapshotResult = {
  success: boolean;
  error: string | null;
};

type NetWorthSnapshotRow = {
  id: string;
  workspace_id: string;
  snapshot_date: string;
  total_assets:
    number | string;
  total_liabilities:
    number | string;
  net_worth:
    number | string;
  created_by:
    string | null;
  created_at: string;
  updated_at: string;
};

const NET_WORTH_SNAPSHOT_SELECT =
  [
    "id",
    "workspace_id",
    "snapshot_date",
    "total_assets",
    "total_liabilities",
    "net_worth",
    "created_by",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

export async function getNetWorthSnapshots(
  workspaceId: string,
): Promise<NetWorthSnapshotsResult> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      data: [],
      error:
        "A workspace is required to load net worth history.",
    };
  }

  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "net_worth_snapshots",
        )
        .select(
          NET_WORTH_SNAPSHOT_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .order(
          "snapshot_date",
          {
            ascending: true,
          },
        );

    if (
      error
    ) {
      return {
        success: false,
        data: [],
        error:
          normalizeNetWorthError(
            error.message,
          ),
      };
    }

    const snapshots =
      (
        data ??
        []
      )
        .map(
          (
            row,
          ) =>
            parseNetWorthSnapshotRow(
              row,
            ),
        )
        .filter(
          (
            snapshot,
          ): snapshot is NetWorthSnapshot =>
            snapshot !==
            null,
        );

    return {
      success: true,
      data:
        snapshots,
      error: null,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      data: [],
      error:
        getUnknownErrorMessage(
          error,
        ),
    };
  }
}

export async function getLatestNetWorthSnapshot(
  workspaceId: string,
): Promise<NetWorthSnapshotResult> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      data: null,
      error:
        "A workspace is required to load the latest net worth snapshot.",
    };
  }

  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "net_worth_snapshots",
        )
        .select(
          NET_WORTH_SNAPSHOT_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .order(
          "snapshot_date",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      error
    ) {
      return {
        success: false,
        data: null,
        error:
          normalizeNetWorthError(
            error.message,
          ),
      };
    }

    if (
      !data
    ) {
      return {
        success: true,
        data: null,
        error: null,
      };
    }

    const snapshot =
      parseNetWorthSnapshotRow(
        data,
      );

    if (
      !snapshot
    ) {
      return {
        success: false,
        data: null,
        error:
          "The latest net worth snapshot response was incomplete or invalid.",
      };
    }

    return {
      success: true,
      data:
        snapshot,
      error: null,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      data: null,
      error:
        getUnknownErrorMessage(
          error,
        ),
    };
  }
}

export async function recordNetWorthSnapshot({
  workspaceId,
  snapshotDate,
  totalAssets,
  totalLiabilities,
}: CreateNetWorthSnapshotInput): Promise<NetWorthSnapshotResult> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      data: null,
      error:
        "A workspace is required to record net worth.",
    };
  }

  const normalizedAssets =
    normalizeCurrency(
      totalAssets,
    );

  const normalizedLiabilities =
    normalizeCurrency(
      totalLiabilities,
    );

  if (
    normalizedAssets <
    0
  ) {
    return {
      success: false,
      data: null,
      error:
        "Total assets cannot be negative.",
    };
  }

  if (
    normalizedLiabilities <
    0
  ) {
    return {
      success: false,
      data: null,
      error:
        "Total liabilities cannot be negative.",
    };
  }

  const normalizedSnapshotDate =
    normalizeDate(
      snapshotDate,
    );

  if (
    !normalizedSnapshotDate
  ) {
    return {
      success: false,
      data: null,
      error:
        "A valid snapshot date is required.",
    };
  }

  const netWorth =
    normalizeCurrency(
      normalizedAssets -
        normalizedLiabilities,
    );

  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "net_worth_snapshots",
        )
        .upsert(
          {
            workspace_id:
              normalizedWorkspaceId,

            snapshot_date:
              normalizedSnapshotDate,

            total_assets:
              normalizedAssets,

            total_liabilities:
              normalizedLiabilities,

            net_worth:
              netWorth,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "workspace_id,snapshot_date",
          },
        )
        .select(
          NET_WORTH_SNAPSHOT_SELECT,
        )
        .single();

    if (
      error
    ) {
      return {
        success: false,
        data: null,
        error:
          normalizeNetWorthError(
            error.message,
          ),
      };
    }

    const snapshot =
      parseNetWorthSnapshotRow(
        data,
      );

    if (
      !snapshot
    ) {
      return {
        success: false,
        data: null,
        error:
          "The saved net worth snapshot response was incomplete or invalid.",
      };
    }

    return {
      success: true,
      data:
        snapshot,
      error: null,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      data: null,
      error:
        getUnknownErrorMessage(
          error,
        ),
    };
  }
}

export async function deleteNetWorthSnapshot(
  snapshotId: string,
  workspaceId: string,
): Promise<DeleteNetWorthSnapshotResult> {
  const normalizedSnapshotId =
    snapshotId.trim();

  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedSnapshotId
  ) {
    return {
      success: false,
      error:
        "A snapshot is required.",
    };
  }

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      error:
        "A workspace is required.",
    };
  }

  try {
    const supabase =
      await createClient();

    const {
      error,
    } =
      await supabase
        .from(
          "net_worth_snapshots",
        )
        .delete()
        .eq(
          "id",
          normalizedSnapshotId,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        );

    if (
      error
    ) {
      return {
        success: false,
        error:
          normalizeNetWorthError(
            error.message,
          ),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      error:
        getUnknownErrorMessage(
          error,
        ),
    };
  }
}

function parseNetWorthSnapshotRow(
  value: unknown,
): NetWorthSnapshot | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const id =
    getRequiredString(
      value.id,
    );

  const workspaceId =
    getRequiredString(
      value.workspace_id,
    );

  const snapshotDate =
    getRequiredString(
      value.snapshot_date,
    );

  const totalAssets =
    getRequiredNumber(
      value.total_assets,
    );

  const totalLiabilities =
    getRequiredNumber(
      value.total_liabilities,
    );

  const netWorth =
    getRequiredNumber(
      value.net_worth,
    );

  const createdAt =
    getRequiredString(
      value.created_at,
    );

  const updatedAt =
    getRequiredString(
      value.updated_at,
    );

  if (
    !id ||
    !workspaceId ||
    !snapshotDate ||
    totalAssets ===
      null ||
    totalLiabilities ===
      null ||
    netWorth ===
      null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,

    workspaceId,

    snapshotDate,

    totalAssets:
      normalizeCurrency(
        totalAssets,
      ),

    totalLiabilities:
      normalizeCurrency(
        totalLiabilities,
      ),

    netWorth:
      normalizeCurrency(
        netWorth,
      ),

    createdBy:
      getNullableString(
        value.created_by,
      ),

    createdAt,

    updatedAt,
  };
}

function normalizeDate(
  value:
    string | undefined,
) {
  if (
    !value
  ) {
    return getLocalDateString();
  }

  const normalizedValue =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${normalizedValue}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    normalizedValue
      .split(
        "-",
      )
      .map(
        Number,
      );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() +
      1 !==
      month ||
    date.getDate() !==
      day
  ) {
    return null;
  }

  return normalizedValue;
}

function getLocalDateString(
  date =
    new Date(),
) {
  const timezoneOffset =
    date.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    date.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}

function normalizeCurrency(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value *
        100,
    ) /
    100
  );
}

function normalizeNetWorthError(
  message: string,
) {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "row-level security",
    ) ||
    normalizedMessage.includes(
      "permission denied",
    )
  ) {
    return "You do not have permission to access net worth snapshots for this workspace.";
  }

  if (
    normalizedMessage.includes(
      "duplicate key",
    ) ||
    normalizedMessage.includes(
      "unique constraint",
    )
  ) {
    return "A net worth snapshot already exists for this date.";
  }

  if (
    normalizedMessage.includes(
      "relation",
    ) &&
    normalizedMessage.includes(
      "does not exist",
    )
  ) {
    return "The CASE Budget net worth snapshots table is not available.";
  }

  if (
    normalizedMessage.includes(
      "foreign key",
    )
  ) {
    return "The selected CASE Budget workspace is not available.";
  }

  return (
    message.trim() ||
    "Unable to access CASE Budget net worth snapshots."
  );
}

function getUnknownErrorMessage(
  error: unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return (
      error.message.trim() ||
      "Unable to access CASE Budget net worth snapshots."
    );
  }

  return "Unable to access CASE Budget net worth snapshots.";
}

function getRequiredString(
  value: unknown,
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

function getNullableString(
  value: unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return getRequiredString(
    value,
  );
}

function getRequiredNumber(
  value: unknown,
) {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }

  if (
    typeof value ===
    "string"
  ) {
    const normalizedValue =
      value.trim();

    if (
      !normalizedValue
    ) {
      return null;
    }

    const parsedValue =
      Number(
        normalizedValue,
      );

    return Number.isFinite(
      parsedValue,
    )
      ? parsedValue
      : null;
  }

  return null;
}

function isRecord(
  value: unknown,
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