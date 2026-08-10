import "server-only";

import type {
  CreateInvestmentAccountData,
  CreateInvestmentActivityData,
  CreateInvestmentHoldingData,
  InvestmentAccountData,
  InvestmentAccountType,
  InvestmentActivityData,
  InvestmentActivityType,
  InvestmentConnectionStatus,
  InvestmentHoldingData,
  InvestmentHoldingType,
  UpdateInvestmentAccountData,
  UpdateInvestmentActivityData,
  UpdateInvestmentHoldingData,
} from "@/components/providers/InvestmentsProvider";

import {
  createClient,
} from "@/lib/supabase/server";

export type InvestmentsData = {
  investmentAccounts:
    InvestmentAccountData[];

  holdings:
    InvestmentHoldingData[];

  activities:
    InvestmentActivityData[];
};

export type InvestmentsDataResult = {
  success: boolean;
  data: InvestmentsData;
  error: string | null;
};

export type InvestmentAccountsResult = {
  success: boolean;
  data: InvestmentAccountData[];
  error: string | null;
};

export type InvestmentAccountResult = {
  success: boolean;
  data: InvestmentAccountData | null;
  error: string | null;
};

export type InvestmentHoldingsResult = {
  success: boolean;
  data: InvestmentHoldingData[];
  error: string | null;
};

export type InvestmentHoldingResult = {
  success: boolean;
  data: InvestmentHoldingData | null;
  error: string | null;
};

export type InvestmentActivitiesResult = {
  success: boolean;
  data: InvestmentActivityData[];
  error: string | null;
};

export type InvestmentActivityResult = {
  success: boolean;
  data: InvestmentActivityData | null;
  error: string | null;
};

export type InvestmentDeleteResult = {
  success: boolean;
  error: string | null;
};

export type CreateInvestmentAccountInput = {
  workspaceId: string;
  account: CreateInvestmentAccountData;
};

export type UpdateInvestmentAccountInput = {
  workspaceId: string;
  investmentAccountId: string;
  updates: UpdateInvestmentAccountData;
};

export type DeleteInvestmentAccountInput = {
  workspaceId: string;
  investmentAccountId: string;
};

export type SetInvestmentAccountNetWorthInput = {
  workspaceId: string;
  investmentAccountId: string;
  included: boolean;
};

export type UpdateInvestmentAccountCashBalanceInput = {
  workspaceId: string;
  investmentAccountId: string;
  cashBalance: number;
};

export type CreateInvestmentHoldingInput = {
  workspaceId: string;
  holding: CreateInvestmentHoldingData;
};

export type UpdateInvestmentHoldingInput = {
  workspaceId: string;
  holdingId: string;
  updates: UpdateInvestmentHoldingData;
};

export type DeleteInvestmentHoldingInput = {
  workspaceId: string;
  holdingId: string;
};

export type UpdateInvestmentHoldingMarketPriceInput = {
  workspaceId: string;
  holdingId: string;
  currentPrice: number;
  updatedAt?: string;
};

export type CreateInvestmentActivityInput = {
  workspaceId: string;
  activity: CreateInvestmentActivityData;
};

export type UpdateInvestmentActivityInput = {
  workspaceId: string;
  activityId: string;
  updates: UpdateInvestmentActivityData;
};

export type DeleteInvestmentActivityInput = {
  workspaceId: string;
  activityId: string;
};

type InvestmentAccountRow = {
  id: string;
  workspace_id: string;
  name: string;
  institution: string | null;
  type: string;
  linked_account_id: string | null;
  currency: string;
  cash_balance: number | string;
  is_included_in_net_worth: boolean;
  connection_status: string;
  last_synced_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type InvestmentHoldingRow = {
  id: string;
  workspace_id: string;
  investment_account_id: string;
  symbol: string | null;
  name: string;
  type: string;
  quantity: number | string;
  average_cost: number | string;
  current_price: number | string;
  market_value: number | string;
  cost_basis: number | string;
  unrealized_gain: number | string;
  unrealized_gain_percentage:
    number | string;
  annual_dividend_income:
    number | string | null;
  last_price_updated_at:
    string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type InvestmentActivityRow = {
  id: string;
  workspace_id: string;
  investment_account_id: string;
  holding_id: string | null;
  type: string;
  date: string;
  amount: number | string;
  quantity:
    number | string | null;
  price_per_unit:
    number | string | null;
  fees:
    number | string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const INVESTMENT_ACCOUNT_SELECT =
  [
    "id",
    "workspace_id",
    "name",
    "institution",
    "type",
    "linked_account_id",
    "currency",
    "cash_balance",
    "is_included_in_net_worth",
    "connection_status",
    "last_synced_at",
    "notes",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const INVESTMENT_HOLDING_SELECT =
  [
    "id",
    "workspace_id",
    "investment_account_id",
    "symbol",
    "name",
    "type",
    "quantity",
    "average_cost",
    "current_price",
    "market_value",
    "cost_basis",
    "unrealized_gain",
    "unrealized_gain_percentage",
    "annual_dividend_income",
    "last_price_updated_at",
    "notes",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const INVESTMENT_ACTIVITY_SELECT =
  [
    "id",
    "workspace_id",
    "investment_account_id",
    "holding_id",
    "type",
    "date",
    "amount",
    "quantity",
    "price_per_unit",
    "fees",
    "description",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const INVESTMENT_ACCOUNT_TYPES:
  InvestmentAccountType[] =
  [
    "brokerage",
    "retirement",
    "ira",
    "roth-ira",
    "401k",
    "403b",
    "529",
    "hsa",
    "crypto",
    "other",
  ];

const INVESTMENT_CONNECTION_STATUSES:
  InvestmentConnectionStatus[] =
  [
    "manual",
    "connected",
    "disconnected",
    "error",
    "pending",
  ];

const INVESTMENT_HOLDING_TYPES:
  InvestmentHoldingType[] =
  [
    "stock",
    "etf",
    "mutual-fund",
    "bond",
    "option",
    "crypto",
    "cash",
    "real-estate",
    "commodity",
    "other",
  ];

const INVESTMENT_ACTIVITY_TYPES:
  InvestmentActivityType[] =
  [
    "contribution",
    "withdrawal",
    "buy",
    "sell",
    "dividend",
    "interest",
    "fee",
    "transfer",
    "adjustment",
  ];

export async function getInvestmentsData(
  workspaceId: string,
): Promise<InvestmentsDataResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,

      data: {
        investmentAccounts:
          [],

        holdings:
          [],

        activities:
          [],
      },

      error:
        "A workspace is required to load investments.",
    };
  }

  try {
    const supabase =
      await createClient();

    const [
      accountsResult,
      holdingsResult,
      activitiesResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "investment_accounts",
          )
          .select(
            INVESTMENT_ACCOUNT_SELECT,
          )
          .eq(
            "workspace_id",
            normalizedWorkspaceId,
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            },
          ),

        supabase
          .from(
            "investment_holdings",
          )
          .select(
            INVESTMENT_HOLDING_SELECT,
          )
          .eq(
            "workspace_id",
            normalizedWorkspaceId,
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            },
          ),

        supabase
          .from(
            "investment_activities",
          )
          .select(
            INVESTMENT_ACTIVITY_SELECT,
          )
          .eq(
            "workspace_id",
            normalizedWorkspaceId,
          )
          .order(
            "date",
            {
              ascending:
                false,
            },
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          ),
      ]);

    if (
      accountsResult.error
    ) {
      return createInvestmentsDataError(
        normalizeInvestmentsError(
          accountsResult
            .error
            .message,
        ),
      );
    }

    if (
      holdingsResult.error
    ) {
      return createInvestmentsDataError(
        normalizeInvestmentsError(
          holdingsResult
            .error
            .message,
        ),
      );
    }

    if (
      activitiesResult.error
    ) {
      return createInvestmentsDataError(
        normalizeInvestmentsError(
          activitiesResult
            .error
            .message,
        ),
      );
    }

    const investmentAccounts =
      (
        accountsResult.data ??
        []
      )
        .map(
          (
            row,
          ) =>
            parseInvestmentAccountRow(
              row,
            ),
        )
        .filter(
          (
            account,
          ): account is InvestmentAccountData =>
            account !==
            null,
        );

    const holdings =
      (
        holdingsResult.data ??
        []
      )
        .map(
          (
            row,
          ) =>
            parseInvestmentHoldingRow(
              row,
            ),
        )
        .filter(
          (
            holding,
          ): holding is InvestmentHoldingData =>
            holding !==
            null,
        );

    const activities =
      (
        activitiesResult.data ??
        []
      )
        .map(
          (
            row,
          ) =>
            parseInvestmentActivityRow(
              row,
            ),
        )
        .filter(
          (
            activity,
          ): activity is InvestmentActivityData =>
            activity !==
            null,
        );

    return {
      success: true,

      data: {
        investmentAccounts,
        holdings,
        activities,
      },

      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentsDataError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function getInvestmentAccounts(
  workspaceId: string,
): Promise<InvestmentAccountsResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      data: [],
      error:
        "A workspace is required to load investment accounts.",
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
          "investment_accounts",
        )
        .select(
          INVESTMENT_ACCOUNT_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (
      error
    ) {
      return {
        success: false,
        data: [],
        error:
          normalizeInvestmentsError(
            error.message,
          ),
      };
    }

    return {
      success: true,

      data:
        (
          data ??
          []
        )
          .map(
            (
              row,
            ) =>
              parseInvestmentAccountRow(
                row,
              ),
          )
          .filter(
            (
              account,
            ): account is InvestmentAccountData =>
              account !==
              null,
          ),

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

export async function getInvestmentAccountById(
  workspaceId: string,
  investmentAccountId: string,
): Promise<InvestmentAccountResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedAccountId =
    normalizeRequiredText(
      investmentAccountId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedAccountId
  ) {
    return {
      success: false,
      data: null,
      error:
        "A workspace and investment account are required.",
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
          "investment_accounts",
        )
        .select(
          INVESTMENT_ACCOUNT_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedAccountId,
        )
        .maybeSingle();

    if (
      error
    ) {
      return {
        success: false,
        data: null,
        error:
          normalizeInvestmentsError(
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

    const account =
      parseInvestmentAccountRow(
        data,
      );

    if (
      !account
    ) {
      return {
        success: false,
        data: null,
        error:
          "The investment account response was incomplete or invalid.",
      };
    }

    return {
      success: true,
      data:
        account,
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

export async function createInvestmentAccount({
  workspaceId,
  account,
}: CreateInvestmentAccountInput): Promise<InvestmentAccountResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedName =
    normalizeRequiredText(
      account.name,
    );

  if (
    !normalizedWorkspaceId
  ) {
    return createInvestmentAccountError(
      "A workspace is required to create an investment account.",
    );
  }

  if (
    !normalizedName
  ) {
    return createInvestmentAccountError(
      "An investment account name is required.",
    );
  }

  if (
    !isInvestmentAccountType(
      account.type,
    )
  ) {
    return createInvestmentAccountError(
      "A valid investment account type is required.",
    );
  }

  const cashBalance =
    normalizeCurrency(
      account.cashBalance ??
        0,
    );

  if (
    cashBalance <
    0
  ) {
    return createInvestmentAccountError(
      "Investment account cash balance cannot be negative.",
    );
  }

  const connectionStatus =
    account.connectionStatus ??
    "manual";

  if (
    !isInvestmentConnectionStatus(
      connectionStatus,
    )
  ) {
    return createInvestmentAccountError(
      "A valid investment connection status is required.",
    );
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
          "investment_accounts",
        )
        .insert({
          workspace_id:
            normalizedWorkspaceId,

          name:
            normalizedName,

          institution:
            normalizeOptionalText(
              account.institution,
            ),

          type:
            account.type,

          linked_account_id:
            normalizeOptionalText(
              account.linkedAccountId,
            ),

          currency:
            normalizeCurrencyCode(
              account.currency,
            ),

          cash_balance:
            cashBalance,

          is_included_in_net_worth:
            account.isIncludedInNetWorth ??
            true,

          connection_status:
            connectionStatus,

          last_synced_at:
            normalizeOptionalText(
              account.lastSyncedAt,
            ),

          notes:
            normalizeOptionalText(
              account.notes,
            ),
        })
        .select(
          INVESTMENT_ACCOUNT_SELECT,
        )
        .single();

    if (
      error
    ) {
      return createInvestmentAccountError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
    }

    const createdAccount =
      parseInvestmentAccountRow(
        data,
      );

    if (
      !createdAccount
    ) {
      return createInvestmentAccountError(
        "The created investment account response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        createdAccount,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentAccountError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function updateInvestmentAccount({
  workspaceId,
  investmentAccountId,
  updates,
}: UpdateInvestmentAccountInput): Promise<InvestmentAccountResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedAccountId =
    normalizeRequiredText(
      investmentAccountId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedAccountId
  ) {
    return createInvestmentAccountError(
      "A workspace and investment account are required.",
    );
  }

  const updatePayload:
    Record<
      string,
      unknown
    > =
    {};

  if (
    updates.name !==
    undefined
  ) {
    const name =
      normalizeRequiredText(
        updates.name,
      );

    if (
      !name
    ) {
      return createInvestmentAccountError(
        "Investment account name cannot be empty.",
      );
    }

    updatePayload.name =
      name;
  }

  if (
    updates.institution !==
    undefined
  ) {
    updatePayload.institution =
      normalizeOptionalText(
        updates.institution,
      );
  }

  if (
    updates.type !==
    undefined
  ) {
    if (
      !isInvestmentAccountType(
        updates.type,
      )
    ) {
      return createInvestmentAccountError(
        "A valid investment account type is required.",
      );
    }

    updatePayload.type =
      updates.type;
  }

  if (
    updates.linkedAccountId !==
    undefined
  ) {
    updatePayload.linked_account_id =
      normalizeOptionalText(
        updates.linkedAccountId,
      );
  }

  if (
    updates.currency !==
    undefined
  ) {
    updatePayload.currency =
      normalizeCurrencyCode(
        updates.currency,
      );
  }

  if (
    updates.cashBalance !==
    undefined
  ) {
    if (
      !Number.isFinite(
        updates.cashBalance,
      ) ||
      updates.cashBalance <
      0
    ) {
      return createInvestmentAccountError(
        "Investment account cash balance cannot be negative.",
      );
    }

    updatePayload.cash_balance =
      normalizeCurrency(
        updates.cashBalance,
      );
  }

  if (
    updates.isIncludedInNetWorth !==
    undefined
  ) {
    updatePayload.is_included_in_net_worth =
      updates.isIncludedInNetWorth;
  }

  if (
    updates.connectionStatus !==
    undefined
  ) {
    if (
      !isInvestmentConnectionStatus(
        updates.connectionStatus,
      )
    ) {
      return createInvestmentAccountError(
        "A valid investment connection status is required.",
      );
    }

    updatePayload.connection_status =
      updates.connectionStatus;
  }

  if (
    updates.lastSyncedAt !==
    undefined
  ) {
    updatePayload.last_synced_at =
      normalizeOptionalText(
        updates.lastSyncedAt,
      );
  }

  if (
    updates.notes !==
    undefined
  ) {
    updatePayload.notes =
      normalizeOptionalText(
        updates.notes,
      );
  }

  if (
    Object.keys(
      updatePayload,
    ).length ===
    0
  ) {
    return getInvestmentAccountById(
      normalizedWorkspaceId,
      normalizedAccountId,
    );
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
          "investment_accounts",
        )
        .update(
          updatePayload,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedAccountId,
        )
        .select(
          INVESTMENT_ACCOUNT_SELECT,
        )
        .maybeSingle();

    if (
      error
    ) {
      return createInvestmentAccountError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
    }

    if (
      !data
    ) {
      return createInvestmentAccountError(
        "The investment account could not be found.",
      );
    }

    const account =
      parseInvestmentAccountRow(
        data,
      );

    if (
      !account
    ) {
      return createInvestmentAccountError(
        "The updated investment account response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        account,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentAccountError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function setInvestmentAccountNetWorthInclusion({
  workspaceId,
  investmentAccountId,
  included,
}: SetInvestmentAccountNetWorthInput): Promise<InvestmentAccountResult> {
  return updateInvestmentAccount({
    workspaceId,
    investmentAccountId,

    updates: {
      isIncludedInNetWorth:
        included,
    },
  });
}

export async function updateInvestmentAccountCashBalance({
  workspaceId,
  investmentAccountId,
  cashBalance,
}: UpdateInvestmentAccountCashBalanceInput): Promise<InvestmentAccountResult> {
  return updateInvestmentAccount({
    workspaceId,
    investmentAccountId,

    updates: {
      cashBalance,
    },
  });
}

export async function deleteInvestmentAccount({
  workspaceId,
  investmentAccountId,
}: DeleteInvestmentAccountInput): Promise<InvestmentDeleteResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedAccountId =
    normalizeRequiredText(
      investmentAccountId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedAccountId
  ) {
    return {
      success: false,

      error:
        "A workspace and investment account are required.",
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
          "investment_accounts",
        )
        .delete()
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedAccountId,
        );

    if (
      error
    ) {
      return {
        success: false,

        error:
          normalizeInvestmentsError(
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

export async function getInvestmentHoldings(
  workspaceId: string,
  investmentAccountId?: string,
): Promise<InvestmentHoldingsResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      data: [],
      error:
        "A workspace is required to load investment holdings.",
    };
  }

  try {
    const supabase =
      await createClient();

    let query =
      supabase
        .from(
          "investment_holdings",
        )
        .select(
          INVESTMENT_HOLDING_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        );

    const normalizedAccountId =
      normalizeOptionalText(
        investmentAccountId,
      );

    if (
      normalizedAccountId
    ) {
      query =
        query.eq(
          "investment_account_id",
          normalizedAccountId,
        );
    }

    const {
      data,
      error,
    } =
      await query.order(
        "created_at",
        {
          ascending:
            true,
        },
      );

    if (
      error
    ) {
      return {
        success: false,
        data: [],
        error:
          normalizeInvestmentsError(
            error.message,
          ),
      };
    }

    return {
      success: true,

      data:
        (
          data ??
          []
        )
          .map(
            (
              row,
            ) =>
              parseInvestmentHoldingRow(
                row,
              ),
          )
          .filter(
            (
              holding,
            ): holding is InvestmentHoldingData =>
              holding !==
              null,
          ),

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

export async function getInvestmentHoldingById(
  workspaceId: string,
  holdingId: string,
): Promise<InvestmentHoldingResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedHoldingId =
    normalizeRequiredText(
      holdingId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedHoldingId
  ) {
    return createInvestmentHoldingError(
      "A workspace and investment holding are required.",
    );
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
          "investment_holdings",
        )
        .select(
          INVESTMENT_HOLDING_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedHoldingId,
        )
        .maybeSingle();

    if (
      error
    ) {
      return createInvestmentHoldingError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
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

    const holding =
      parseInvestmentHoldingRow(
        data,
      );

    if (
      !holding
    ) {
      return createInvestmentHoldingError(
        "The investment holding response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        holding,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentHoldingError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function createInvestmentHolding({
  workspaceId,
  holding,
}: CreateInvestmentHoldingInput): Promise<InvestmentHoldingResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedAccountId =
    normalizeRequiredText(
      holding.investmentAccountId,
    );

  const normalizedName =
    normalizeRequiredText(
      holding.name,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedAccountId
  ) {
    return createInvestmentHoldingError(
      "A workspace and investment account are required.",
    );
  }

  if (
    !normalizedName
  ) {
    return createInvestmentHoldingError(
      "An investment holding name is required.",
    );
  }

  if (
    !isInvestmentHoldingType(
      holding.type,
    )
  ) {
    return createInvestmentHoldingError(
      "A valid investment holding type is required.",
    );
  }

  if (
    !isNonNegativeFiniteNumber(
      holding.quantity,
    )
  ) {
    return createInvestmentHoldingError(
      "Holding quantity cannot be negative.",
    );
  }

  if (
    !isNonNegativeFiniteNumber(
      holding.averageCost,
    )
  ) {
    return createInvestmentHoldingError(
      "Holding average cost cannot be negative.",
    );
  }

  const currentPrice =
    holding.currentPrice ??
    holding.averageCost;

  if (
    !isNonNegativeFiniteNumber(
      currentPrice,
    )
  ) {
    return createInvestmentHoldingError(
      "Holding market price cannot be negative.",
    );
  }

  const accountExists =
    await investmentAccountExists(
      normalizedWorkspaceId,
      normalizedAccountId,
    );

  if (
    !accountExists.success
  ) {
    return createInvestmentHoldingError(
      accountExists.error ??
        "Unable to verify the selected investment account.",
    );
  }

  if (
    !accountExists.exists
  ) {
    return createInvestmentHoldingError(
      "The selected investment account could not be found in this workspace.",
    );
  }

  const calculatedValues =
    calculateHoldingValues({
      quantity:
        holding.quantity,

      averageCost:
        holding.averageCost,

      currentPrice,
    });

  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "investment_holdings",
        )
        .insert({
          workspace_id:
            normalizedWorkspaceId,

          investment_account_id:
            normalizedAccountId,

          symbol:
            normalizeOptionalSymbol(
              holding.symbol,
            ),

          name:
            normalizedName,

          type:
            holding.type,

          quantity:
            calculatedValues
              .quantity,

          average_cost:
            calculatedValues
              .averageCost,

          current_price:
            calculatedValues
              .currentPrice,

          market_value:
            calculatedValues
              .marketValue,

          cost_basis:
            calculatedValues
              .costBasis,

          unrealized_gain:
            calculatedValues
              .unrealizedGain,

          unrealized_gain_percentage:
            calculatedValues
              .unrealizedGainPercentage,

          annual_dividend_income:
            normalizeOptionalCurrency(
              holding.annualDividendIncome,
            ),

          last_price_updated_at:
            normalizeOptionalText(
              holding.lastPriceUpdatedAt,
            ),

          notes:
            normalizeOptionalText(
              holding.notes,
            ),
        })
        .select(
          INVESTMENT_HOLDING_SELECT,
        )
        .single();

    if (
      error
    ) {
      return createInvestmentHoldingError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
    }

    const createdHolding =
      parseInvestmentHoldingRow(
        data,
      );

    if (
      !createdHolding
    ) {
      return createInvestmentHoldingError(
        "The created investment holding response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        createdHolding,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentHoldingError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function updateInvestmentHolding({
  workspaceId,
  holdingId,
  updates,
}: UpdateInvestmentHoldingInput): Promise<InvestmentHoldingResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedHoldingId =
    normalizeRequiredText(
      holdingId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedHoldingId
  ) {
    return createInvestmentHoldingError(
      "A workspace and investment holding are required.",
    );
  }

  const currentResult =
    await getInvestmentHoldingById(
      normalizedWorkspaceId,
      normalizedHoldingId,
    );

  if (
    !currentResult.success
  ) {
    return currentResult;
  }

  if (
    !currentResult.data
  ) {
    return createInvestmentHoldingError(
      "The investment holding could not be found.",
    );
  }

  const currentHolding =
    currentResult.data;

  const quantity =
    updates.quantity ??
    currentHolding.quantity;

  const averageCost =
    updates.averageCost ??
    currentHolding.averageCost;

  const currentPrice =
    updates.currentPrice ??
    currentHolding.currentPrice;

  if (
    !isNonNegativeFiniteNumber(
      quantity,
    )
  ) {
    return createInvestmentHoldingError(
      "Holding quantity cannot be negative.",
    );
  }

  if (
    !isNonNegativeFiniteNumber(
      averageCost,
    )
  ) {
    return createInvestmentHoldingError(
      "Holding average cost cannot be negative.",
    );
  }

  if (
    !isNonNegativeFiniteNumber(
      currentPrice,
    )
  ) {
    return createInvestmentHoldingError(
      "Holding market price cannot be negative.",
    );
  }

  const calculatedValues =
    calculateHoldingValues({
      quantity,
      averageCost,
      currentPrice,
    });

  const updatePayload:
    Record<
      string,
      unknown
    > = {
      quantity:
        calculatedValues
          .quantity,

      average_cost:
        calculatedValues
          .averageCost,

      current_price:
        calculatedValues
          .currentPrice,

      market_value:
        calculatedValues
          .marketValue,

      cost_basis:
        calculatedValues
          .costBasis,

      unrealized_gain:
        calculatedValues
          .unrealizedGain,

      unrealized_gain_percentage:
        calculatedValues
          .unrealizedGainPercentage,
    };

  if (
    updates.symbol !==
    undefined
  ) {
    updatePayload.symbol =
      normalizeOptionalSymbol(
        updates.symbol,
      );
  }

  if (
    updates.name !==
    undefined
  ) {
    const name =
      normalizeRequiredText(
        updates.name,
      );

    if (
      !name
    ) {
      return createInvestmentHoldingError(
        "Investment holding name cannot be empty.",
      );
    }

    updatePayload.name =
      name;
  }

  if (
    updates.type !==
    undefined
  ) {
    if (
      !isInvestmentHoldingType(
        updates.type,
      )
    ) {
      return createInvestmentHoldingError(
        "A valid investment holding type is required.",
      );
    }

    updatePayload.type =
      updates.type;
  }

  if (
    updates.annualDividendIncome !==
    undefined
  ) {
    if (
      updates.annualDividendIncome !==
        null &&
      !isNonNegativeFiniteNumber(
        updates.annualDividendIncome,
      )
    ) {
      return createInvestmentHoldingError(
        "Annual dividend income cannot be negative.",
      );
    }

    updatePayload.annual_dividend_income =
      normalizeOptionalCurrency(
        updates.annualDividendIncome,
      );
  }

  if (
    updates.lastPriceUpdatedAt !==
    undefined
  ) {
    updatePayload.last_price_updated_at =
      normalizeOptionalText(
        updates.lastPriceUpdatedAt,
      );
  }

  if (
    updates.notes !==
    undefined
  ) {
    updatePayload.notes =
      normalizeOptionalText(
        updates.notes,
      );
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
          "investment_holdings",
        )
        .update(
          updatePayload,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedHoldingId,
        )
        .select(
          INVESTMENT_HOLDING_SELECT,
        )
        .maybeSingle();

    if (
      error
    ) {
      return createInvestmentHoldingError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
    }

    if (
      !data
    ) {
      return createInvestmentHoldingError(
        "The investment holding could not be found.",
      );
    }

    const holding =
      parseInvestmentHoldingRow(
        data,
      );

    if (
      !holding
    ) {
      return createInvestmentHoldingError(
        "The updated investment holding response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        holding,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentHoldingError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function updateInvestmentHoldingMarketPrice({
  workspaceId,
  holdingId,
  currentPrice,
  updatedAt =
    new Date().toISOString(),
}: UpdateInvestmentHoldingMarketPriceInput): Promise<InvestmentHoldingResult> {
  return updateInvestmentHolding({
    workspaceId,
    holdingId,

    updates: {
      currentPrice,

      lastPriceUpdatedAt:
        updatedAt,
    },
  });
}

export async function deleteInvestmentHolding({
  workspaceId,
  holdingId,
}: DeleteInvestmentHoldingInput): Promise<InvestmentDeleteResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedHoldingId =
    normalizeRequiredText(
      holdingId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedHoldingId
  ) {
    return {
      success: false,

      error:
        "A workspace and investment holding are required.",
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
          "investment_holdings",
        )
        .delete()
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedHoldingId,
        );

    if (
      error
    ) {
      return {
        success: false,

        error:
          normalizeInvestmentsError(
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

export async function getInvestmentActivities(
  workspaceId: string,
  investmentAccountId?: string,
  holdingId?: string,
): Promise<InvestmentActivitiesResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success: false,
      data: [],
      error:
        "A workspace is required to load investment activity.",
    };
  }

  try {
    const supabase =
      await createClient();

    let query =
      supabase
        .from(
          "investment_activities",
        )
        .select(
          INVESTMENT_ACTIVITY_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        );

    const normalizedAccountId =
      normalizeOptionalText(
        investmentAccountId,
      );

    const normalizedHoldingId =
      normalizeOptionalText(
        holdingId,
      );

    if (
      normalizedAccountId
    ) {
      query =
        query.eq(
          "investment_account_id",
          normalizedAccountId,
        );
    }

    if (
      normalizedHoldingId
    ) {
      query =
        query.eq(
          "holding_id",
          normalizedHoldingId,
        );
    }

    const {
      data,
      error,
    } =
      await query
        .order(
          "date",
          {
            ascending:
              false,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      error
    ) {
      return {
        success: false,
        data: [],
        error:
          normalizeInvestmentsError(
            error.message,
          ),
      };
    }

    return {
      success: true,

      data:
        (
          data ??
          []
        )
          .map(
            (
              row,
            ) =>
              parseInvestmentActivityRow(
                row,
              ),
          )
          .filter(
            (
              activity,
            ): activity is InvestmentActivityData =>
              activity !==
              null,
          ),

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

export async function getInvestmentActivityById(
  workspaceId: string,
  activityId: string,
): Promise<InvestmentActivityResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedActivityId =
    normalizeRequiredText(
      activityId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedActivityId
  ) {
    return createInvestmentActivityError(
      "A workspace and investment activity are required.",
    );
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
          "investment_activities",
        )
        .select(
          INVESTMENT_ACTIVITY_SELECT,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedActivityId,
        )
        .maybeSingle();

    if (
      error
    ) {
      return createInvestmentActivityError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
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

    const activity =
      parseInvestmentActivityRow(
        data,
      );

    if (
      !activity
    ) {
      return createInvestmentActivityError(
        "The investment activity response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        activity,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentActivityError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function createInvestmentActivity({
  workspaceId,
  activity,
}: CreateInvestmentActivityInput): Promise<InvestmentActivityResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedAccountId =
    normalizeRequiredText(
      activity.investmentAccountId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedAccountId
  ) {
    return createInvestmentActivityError(
      "A workspace and investment account are required.",
    );
  }

  if (
    !isInvestmentActivityType(
      activity.type,
    )
  ) {
    return createInvestmentActivityError(
      "A valid investment activity type is required.",
    );
  }

  const normalizedDate =
    normalizeDate(
      activity.date,
    );

  if (
    !normalizedDate
  ) {
    return createInvestmentActivityError(
      "A valid investment activity date is required.",
    );
  }

  if (
    !isNonNegativeFiniteNumber(
      activity.amount,
    )
  ) {
    return createInvestmentActivityError(
      "Investment activity amount cannot be negative.",
    );
  }

  if (
    activity.quantity !==
      undefined &&
    !isNonNegativeFiniteNumber(
      activity.quantity,
    )
  ) {
    return createInvestmentActivityError(
      "Investment activity quantity cannot be negative.",
    );
  }

  if (
    activity.pricePerUnit !==
      undefined &&
    !isNonNegativeFiniteNumber(
      activity.pricePerUnit,
    )
  ) {
    return createInvestmentActivityError(
      "Investment activity price per unit cannot be negative.",
    );
  }

  if (
    activity.fees !==
      undefined &&
    !isNonNegativeFiniteNumber(
      activity.fees,
    )
  ) {
    return createInvestmentActivityError(
      "Investment activity fees cannot be negative.",
    );
  }

  const accountExists =
    await investmentAccountExists(
      normalizedWorkspaceId,
      normalizedAccountId,
    );

  if (
    !accountExists.success
  ) {
    return createInvestmentActivityError(
      accountExists.error ??
        "Unable to verify the selected investment account.",
    );
  }

  if (
    !accountExists.exists
  ) {
    return createInvestmentActivityError(
      "The selected investment account could not be found in this workspace.",
    );
  }

  const normalizedHoldingId =
    normalizeOptionalText(
      activity.holdingId,
    );

  if (
    normalizedHoldingId
  ) {
    const holdingExists =
      await investmentHoldingBelongsToAccount(
        normalizedWorkspaceId,
        normalizedHoldingId,
        normalizedAccountId,
      );

    if (
      !holdingExists.success
    ) {
      return createInvestmentActivityError(
        holdingExists.error ??
          "Unable to verify the selected investment holding.",
      );
    }

    if (
      !holdingExists.exists
    ) {
      return createInvestmentActivityError(
        "The selected holding does not belong to this investment account.",
      );
    }
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
          "investment_activities",
        )
        .insert({
          workspace_id:
            normalizedWorkspaceId,

          investment_account_id:
            normalizedAccountId,

          holding_id:
            normalizedHoldingId,

          type:
            activity.type,

          date:
            normalizedDate,

          amount:
            normalizeCurrency(
              Math.abs(
                activity.amount,
              ),
            ),

          quantity:
            normalizeOptionalQuantity(
              activity.quantity,
            ),

          price_per_unit:
            normalizeOptionalCurrency(
              activity.pricePerUnit,
            ),

          fees:
            normalizeOptionalCurrency(
              activity.fees,
            ) ??
            0,

          description:
            normalizeOptionalText(
              activity.description,
            ),
        })
        .select(
          INVESTMENT_ACTIVITY_SELECT,
        )
        .single();

    if (
      error
    ) {
      return createInvestmentActivityError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
    }

    const createdActivity =
      parseInvestmentActivityRow(
        data,
      );

    if (
      !createdActivity
    ) {
      return createInvestmentActivityError(
        "The created investment activity response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        createdActivity,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentActivityError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function updateInvestmentActivity({
  workspaceId,
  activityId,
  updates,
}: UpdateInvestmentActivityInput): Promise<InvestmentActivityResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedActivityId =
    normalizeRequiredText(
      activityId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedActivityId
  ) {
    return createInvestmentActivityError(
      "A workspace and investment activity are required.",
    );
  }

  const updatePayload:
    Record<
      string,
      unknown
    > =
    {};

  if (
    updates.type !==
    undefined
  ) {
    if (
      !isInvestmentActivityType(
        updates.type,
      )
    ) {
      return createInvestmentActivityError(
        "A valid investment activity type is required.",
      );
    }

    updatePayload.type =
      updates.type;
  }

  if (
    updates.date !==
    undefined
  ) {
    const normalizedDate =
      normalizeDate(
        updates.date,
      );

    if (
      !normalizedDate
    ) {
      return createInvestmentActivityError(
        "A valid investment activity date is required.",
      );
    }

    updatePayload.date =
      normalizedDate;
  }

  if (
    updates.amount !==
    undefined
  ) {
    if (
      !isNonNegativeFiniteNumber(
        updates.amount,
      )
    ) {
      return createInvestmentActivityError(
        "Investment activity amount cannot be negative.",
      );
    }

    updatePayload.amount =
      normalizeCurrency(
        Math.abs(
          updates.amount,
        ),
      );
  }

  if (
    updates.quantity !==
    undefined
  ) {
    if (
      !isNonNegativeFiniteNumber(
        updates.quantity,
      )
    ) {
      return createInvestmentActivityError(
        "Investment activity quantity cannot be negative.",
      );
    }

    updatePayload.quantity =
      normalizeOptionalQuantity(
        updates.quantity,
      );
  }

  if (
    updates.pricePerUnit !==
    undefined
  ) {
    if (
      !isNonNegativeFiniteNumber(
        updates.pricePerUnit,
      )
    ) {
      return createInvestmentActivityError(
        "Investment activity price per unit cannot be negative.",
      );
    }

    updatePayload.price_per_unit =
      normalizeOptionalCurrency(
        updates.pricePerUnit,
      );
  }

  if (
    updates.fees !==
    undefined
  ) {
    if (
      !isNonNegativeFiniteNumber(
        updates.fees,
      )
    ) {
      return createInvestmentActivityError(
        "Investment activity fees cannot be negative.",
      );
    }

    updatePayload.fees =
      normalizeCurrency(
        updates.fees,
      );
  }

  if (
    updates.description !==
    undefined
  ) {
    updatePayload.description =
      normalizeOptionalText(
        updates.description,
      );
  }

  if (
    Object.keys(
      updatePayload,
    ).length ===
    0
  ) {
    return getInvestmentActivityById(
      normalizedWorkspaceId,
      normalizedActivityId,
    );
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
          "investment_activities",
        )
        .update(
          updatePayload,
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedActivityId,
        )
        .select(
          INVESTMENT_ACTIVITY_SELECT,
        )
        .maybeSingle();

    if (
      error
    ) {
      return createInvestmentActivityError(
        normalizeInvestmentsError(
          error.message,
        ),
      );
    }

    if (
      !data
    ) {
      return createInvestmentActivityError(
        "The investment activity could not be found.",
      );
    }

    const activity =
      parseInvestmentActivityRow(
        data,
      );

    if (
      !activity
    ) {
      return createInvestmentActivityError(
        "The updated investment activity response was incomplete or invalid.",
      );
    }

    return {
      success: true,
      data:
        activity,
      error: null,
    };
  } catch (
    error
  ) {
    return createInvestmentActivityError(
      getUnknownErrorMessage(
        error,
      ),
    );
  }
}

export async function deleteInvestmentActivity({
  workspaceId,
  activityId,
}: DeleteInvestmentActivityInput): Promise<InvestmentDeleteResult> {
  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedActivityId =
    normalizeRequiredText(
      activityId,
    );

  if (
    !normalizedWorkspaceId ||
    !normalizedActivityId
  ) {
    return {
      success: false,

      error:
        "A workspace and investment activity are required.",
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
          "investment_activities",
        )
        .delete()
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "id",
          normalizedActivityId,
        );

    if (
      error
    ) {
      return {
        success: false,

        error:
          normalizeInvestmentsError(
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

function parseInvestmentAccountRow(
  value: unknown,
): InvestmentAccountData | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const row =
    value as Partial<InvestmentAccountRow>;

  const id =
    normalizeRequiredText(
      row.id,
    );

  const name =
    normalizeRequiredText(
      row.name,
    );

  const currency =
    normalizeRequiredText(
      row.currency,
    );

  const cashBalance =
    parseRequiredNumber(
      row.cash_balance,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      row.updated_at,
    );

  if (
    !id ||
    !name ||
    !currency ||
    cashBalance ===
      null ||
    typeof row.is_included_in_net_worth !==
      "boolean" ||
    !isInvestmentAccountType(
      row.type,
    ) ||
    !isInvestmentConnectionStatus(
      row.connection_status,
    ) ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,

    name,

    institution:
      normalizeOptionalText(
        row.institution,
      ) ??
      undefined,

    type:
      row.type,

    linkedAccountId:
      normalizeOptionalText(
        row.linked_account_id,
      ) ??
      undefined,

    currency:
      currency.toUpperCase(),

    cashBalance:
      normalizeCurrency(
        cashBalance,
      ),

    isIncludedInNetWorth:
      row.is_included_in_net_worth,

    connectionStatus:
      row.connection_status,

    lastSyncedAt:
      normalizeOptionalText(
        row.last_synced_at,
      ) ??
      undefined,

    notes:
      normalizeOptionalText(
        row.notes,
      ) ??
      undefined,

    createdAt,

    updatedAt,
  };
}

function parseInvestmentHoldingRow(
  value: unknown,
): InvestmentHoldingData | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const row =
    value as Partial<InvestmentHoldingRow>;

  const id =
    normalizeRequiredText(
      row.id,
    );

  const investmentAccountId =
    normalizeRequiredText(
      row.investment_account_id,
    );

  const name =
    normalizeRequiredText(
      row.name,
    );

  const quantity =
    parseRequiredNumber(
      row.quantity,
    );

  const averageCost =
    parseRequiredNumber(
      row.average_cost,
    );

  const currentPrice =
    parseRequiredNumber(
      row.current_price,
    );

  const marketValue =
    parseRequiredNumber(
      row.market_value,
    );

  const costBasis =
    parseRequiredNumber(
      row.cost_basis,
    );

  const unrealizedGain =
    parseRequiredNumber(
      row.unrealized_gain,
    );

  const unrealizedGainPercentage =
    parseRequiredNumber(
      row.unrealized_gain_percentage,
    );

  const annualDividendIncome =
    parseOptionalNumber(
      row.annual_dividend_income,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      row.updated_at,
    );

  if (
    !id ||
    !investmentAccountId ||
    !name ||
    !isInvestmentHoldingType(
      row.type,
    ) ||
    quantity ===
      null ||
    averageCost ===
      null ||
    currentPrice ===
      null ||
    marketValue ===
      null ||
    costBasis ===
      null ||
    unrealizedGain ===
      null ||
    unrealizedGainPercentage ===
      null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,

    investmentAccountId,

    symbol:
      normalizeOptionalSymbol(
        row.symbol,
      ) ??
      undefined,

    name,

    type:
      row.type,

    quantity:
      normalizeQuantity(
        quantity,
      ),

    averageCost:
      normalizeCurrency(
        averageCost,
      ),

    currentPrice:
      normalizeCurrency(
        currentPrice,
      ),

    marketValue:
      normalizeCurrency(
        marketValue,
      ),

    costBasis:
      normalizeCurrency(
        costBasis,
      ),

    unrealizedGain:
      normalizeCurrency(
        unrealizedGain,
      ),

    unrealizedGainPercentage:
      normalizePercentage(
        unrealizedGainPercentage,
      ),

    annualDividendIncome:
      annualDividendIncome ===
      null
        ? undefined
        : normalizeCurrency(
            annualDividendIncome,
          ),

    lastPriceUpdatedAt:
      normalizeOptionalText(
        row.last_price_updated_at,
      ) ??
      undefined,

    notes:
      normalizeOptionalText(
        row.notes,
      ) ??
      undefined,

    createdAt,

    updatedAt,
  };
}

function parseInvestmentActivityRow(
  value: unknown,
): InvestmentActivityData | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const row =
    value as Partial<InvestmentActivityRow>;

  const id =
    normalizeRequiredText(
      row.id,
    );

  const investmentAccountId =
    normalizeRequiredText(
      row.investment_account_id,
    );

  const date =
    normalizeRequiredText(
      row.date,
    );

  const amount =
    parseRequiredNumber(
      row.amount,
    );

  const quantity =
    parseOptionalNumber(
      row.quantity,
    );

  const pricePerUnit =
    parseOptionalNumber(
      row.price_per_unit,
    );

  const fees =
    parseOptionalNumber(
      row.fees,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      row.updated_at,
    );

  if (
    !id ||
    !investmentAccountId ||
    !date ||
    amount ===
      null ||
    !isInvestmentActivityType(
      row.type,
    ) ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,

    investmentAccountId,

    holdingId:
      normalizeOptionalText(
        row.holding_id,
      ) ??
      undefined,

    type:
      row.type,

    date,

    amount:
      normalizeCurrency(
        amount,
      ),

    quantity:
      quantity ===
      null
        ? undefined
        : normalizeQuantity(
            quantity,
          ),

    pricePerUnit:
      pricePerUnit ===
      null
        ? undefined
        : normalizeCurrency(
            pricePerUnit,
          ),

    fees:
      fees ===
      null
        ? undefined
        : normalizeCurrency(
            fees,
          ),

    description:
      normalizeOptionalText(
        row.description,
      ) ??
      undefined,

    createdAt,

    updatedAt,
  };
}

function calculateHoldingValues({
  quantity,
  averageCost,
  currentPrice,
}: {
  quantity: number;
  averageCost: number;
  currentPrice: number;
}) {
  const normalizedQuantity =
    normalizeQuantity(
      quantity,
    );

  const normalizedAverageCost =
    normalizeCurrency(
      averageCost,
    );

  const normalizedCurrentPrice =
    normalizeCurrency(
      currentPrice,
    );

  const marketValue =
    normalizeCurrency(
      normalizedQuantity *
      normalizedCurrentPrice,
    );

  const costBasis =
    normalizeCurrency(
      normalizedQuantity *
      normalizedAverageCost,
    );

  const unrealizedGain =
    normalizeCurrency(
      marketValue -
      costBasis,
    );

  return {
    quantity:
      normalizedQuantity,

    averageCost:
      normalizedAverageCost,

    currentPrice:
      normalizedCurrentPrice,

    marketValue,

    costBasis,

    unrealizedGain,

    unrealizedGainPercentage:
      calculatePercentage(
        unrealizedGain,
        costBasis,
      ),
  };
}

async function investmentAccountExists(
  workspaceId: string,
  investmentAccountId: string,
): Promise<{
  success: boolean;
  exists: boolean;
  error: string | null;
}> {
  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "investment_accounts",
        )
        .select(
          "id",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "id",
          investmentAccountId,
        )
        .maybeSingle();

    if (
      error
    ) {
      return {
        success: false,
        exists: false,

        error:
          normalizeInvestmentsError(
            error.message,
          ),
      };
    }

    return {
      success: true,

      exists:
        data !==
        null,

      error: null,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      exists: false,

      error:
        getUnknownErrorMessage(
          error,
        ),
    };
  }
}

async function investmentHoldingBelongsToAccount(
  workspaceId: string,
  holdingId: string,
  investmentAccountId: string,
): Promise<{
  success: boolean;
  exists: boolean;
  error: string | null;
}> {
  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "investment_holdings",
        )
        .select(
          "id",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "id",
          holdingId,
        )
        .eq(
          "investment_account_id",
          investmentAccountId,
        )
        .maybeSingle();

    if (
      error
    ) {
      return {
        success: false,
        exists: false,

        error:
          normalizeInvestmentsError(
            error.message,
          ),
      };
    }

    return {
      success: true,

      exists:
        data !==
        null,

      error: null,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      exists: false,

      error:
        getUnknownErrorMessage(
          error,
        ),
    };
  }
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

function normalizeQuantity(
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
        1_000_000,
    ) /
    1_000_000
  );
}

function normalizePercentage(
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
        1_000_000,
    ) /
    1_000_000
  );
}

function calculatePercentage(
  numerator: number,
  denominator: number,
) {
  if (
    denominator ===
    0
  ) {
    return 0;
  }

  return normalizePercentage(
    (
      numerator /
      denominator
    ) *
      100,
  );
}

function normalizeOptionalCurrency(
  value:
    number |
    null |
    undefined,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return normalizeCurrency(
    Math.max(
      0,
      value,
    ),
  );
}

function normalizeOptionalQuantity(
  value:
    number |
    null |
    undefined,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return normalizeQuantity(
    Math.max(
      0,
      value,
    ),
  );
}

function normalizeCurrencyCode(
  value:
    string |
    null |
    undefined,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    )
      ?.toUpperCase() ??
    "USD";

  return normalizedValue.length ===
    3
    ? normalizedValue
    : "USD";
}

function normalizeOptionalSymbol(
  value:
    string |
    null |
    undefined,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  return normalizedValue
    ? normalizedValue.toUpperCase()
    : null;
}

function normalizeRequiredText(
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

function normalizeOptionalText(
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

  return normalizeRequiredText(
    value,
  );
}

function parseRequiredNumber(
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

function parseOptionalNumber(
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

  return parseRequiredNumber(
    value,
  );
}

function normalizeDate(
  value: string,
) {
  const normalizedValue =
    normalizeRequiredText(
      value,
    );

  if (
    !normalizedValue ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue,
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

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month -
        1 ||
    date.getDate() !==
      day
  ) {
    return null;
  }

  return normalizedValue;
}

function isInvestmentAccountType(
  value: unknown,
): value is InvestmentAccountType {
  return (
    typeof value ===
      "string" &&
    INVESTMENT_ACCOUNT_TYPES.includes(
      value as InvestmentAccountType,
    )
  );
}

function isInvestmentConnectionStatus(
  value: unknown,
): value is InvestmentConnectionStatus {
  return (
    typeof value ===
      "string" &&
    INVESTMENT_CONNECTION_STATUSES.includes(
      value as InvestmentConnectionStatus,
    )
  );
}

function isInvestmentHoldingType(
  value: unknown,
): value is InvestmentHoldingType {
  return (
    typeof value ===
      "string" &&
    INVESTMENT_HOLDING_TYPES.includes(
      value as InvestmentHoldingType,
    )
  );
}

function isInvestmentActivityType(
  value: unknown,
): value is InvestmentActivityType {
  return (
    typeof value ===
      "string" &&
    INVESTMENT_ACTIVITY_TYPES.includes(
      value as InvestmentActivityType,
    )
  );
}

function isNonNegativeFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    ) &&
    value >=
      0
  );
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

function createInvestmentsDataError(
  error: string,
): InvestmentsDataResult {
  return {
    success: false,

    data: {
      investmentAccounts:
        [],

      holdings:
        [],

      activities:
        [],
    },

    error,
  };
}

function createInvestmentAccountError(
  error: string,
): InvestmentAccountResult {
  return {
    success: false,
    data: null,
    error,
  };
}

function createInvestmentHoldingError(
  error: string,
): InvestmentHoldingResult {
  return {
    success: false,
    data: null,
    error,
  };
}

function createInvestmentActivityError(
  error: string,
): InvestmentActivityResult {
  return {
    success: false,
    data: null,
    error,
  };
}

function normalizeInvestmentsError(
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
    return "You do not have permission to access investments for this CASE Budget workspace.";
  }

  if (
    normalizedMessage.includes(
      "foreign key",
    )
  ) {
    return "The selected investment account, holding, or workspace is no longer available.";
  }

  if (
    normalizedMessage.includes(
      "check constraint",
    )
  ) {
    return "One or more investment values are outside the allowed range.";
  }

  if (
    normalizedMessage.includes(
      "relation",
    ) &&
    normalizedMessage.includes(
      "does not exist",
    )
  ) {
    return "The CASE Budget investment database tables are not available.";
  }

  if (
    normalizedMessage.includes(
      "invalid input syntax for type uuid",
    )
  ) {
    return "The selected CASE Budget investment record is invalid.";
  }

  return (
    message.trim() ||
    "Unable to access CASE Budget investment data."
  );
}

function getUnknownErrorMessage(
  error: unknown,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return "Unable to access CASE Budget investment data.";
}