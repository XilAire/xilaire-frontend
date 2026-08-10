import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  decryptSecret,
  encryptSecret,
  reencryptSecretIfNeeded,
  secretNeedsRotation,
  type EncryptedSecret,
} from "@/lib/security/encryption";

import type {
  FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

export type PlaidSelectedAccountInput = {
  providerAccountId: string;

  name?: string;
  mask?: string;
  type?: string;
  subtype?: string;

  isSelected?: boolean;
  isActive?: boolean;
};

export type CreatePlaidItemInput = {
  connectionId: string;

  workspaceId: string;
  userId: string;

  plaidItemId: string;
  accessToken: string;

  institutionId?: string;

  availableProducts?: string[];
  billedProducts?: string[];
  consentedProducts?: string[];

  consentExpirationTime?: string;
  updateType?: string;

  selectedAccounts?: PlaidSelectedAccountInput[];

  linkSessionId?: string;

  lastVerifiedAt?: string;
};

export type UpdatePlaidItemMetadataInput = {
  institutionId?: string | null;

  availableProducts?: string[];
  billedProducts?: string[];
  consentedProducts?: string[];

  consentExpirationTime?: string | null;
  updateType?: string | null;

  linkSessionId?: string | null;

  lastVerifiedAt?: string | null;
  revokedAt?: string | null;
};

export type PlaidItemMetadata = {
  id: string;

  connectionId: string;

  workspaceId: string;
  userId: string;

  plaidItemId: string;

  institutionId?: string;

  availableProducts: string[];
  billedProducts: string[];
  consentedProducts: string[];

  consentExpirationTime?: string;
  updateType?: string;

  selectedAccounts:
    PlaidSelectedAccountData[];

  linkSessionId?: string;

  tokenFingerprint: string;
  encryptionKeyVersion: number;

  lastVerifiedAt?: string;
  revokedAt?: string;

  createdAt: string;
  updatedAt: string;
};

export type PlaidItemWithAccessToken =
  PlaidItemMetadata & {
    accessToken: string;
  };

export type PlaidSelectedAccountData = {
  id: string;

  plaidItemDatabaseId: string;
  connectionId: string;

  workspaceId: string;
  userId: string;

  providerAccountId: string;

  name?: string;
  mask?: string;
  type?: string;
  subtype?: string;

  isSelected: boolean;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
};

export type PlaidItemLookup = {
  connectionId: string;
  owner: FinancialConnectionOwner;
};

export type PlaidItemProviderLookup = {
  plaidItemId: string;
  owner?: FinancialConnectionOwner;
};

export type RotatePlaidItemTokenResult = {
  rotated: boolean;
  keyVersion: number;
};

export type PlaidItemRepositoryErrorCode =
  | "configuration-error"
  | "invalid-input"
  | "not-found"
  | "duplicate-item"
  | "ownership-mismatch"
  | "encryption-error"
  | "database-error"
  | "unknown";

export class PlaidItemRepositoryError extends Error {
  readonly code:
    PlaidItemRepositoryErrorCode;

  readonly operation:
    string;

  readonly causeCode?:
    string;

  constructor({
    message,
    code,
    operation,
    causeCode,
    cause,
  }: {
    message: string;
    code: PlaidItemRepositoryErrorCode;
    operation: string;
    causeCode?: string;
    cause?: unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "PlaidItemRepositoryError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode;
  }
}

type PlaidItemRow = {
  id: string;

  connection_id: string;

  workspace_id: string;
  user_id: string;

  plaid_item_id: string;

  access_token_ciphertext:
    unknown;

  access_token_iv:
    unknown;

  access_token_auth_tag:
    unknown;

  encryption_key_version:
    number;

  institution_id:
    string | null;

  available_products:
    string[];

  billed_products:
    string[];

  consented_products:
    string[];

  consent_expiration_time:
    string | null;

  update_type:
    string | null;

  selected_accounts:
    unknown;

  link_session_id:
    string | null;

  token_fingerprint:
    string;

  last_verified_at:
    string | null;

  revoked_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type PlaidItemAccountRow = {
  id: string;

  plaid_item_id: string;
  connection_id: string;

  workspace_id: string;
  user_id: string;

  provider_account_id: string;

  account_name: string | null;
  account_mask: string | null;
  account_type: string | null;
  account_subtype: string | null;

  is_selected: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
};

type PlaidItemInsertRow = Omit<
  PlaidItemRow,
  | "id"
  | "created_at"
  | "updated_at"
>;

type PlaidItemUpdateRow = Partial<
  Omit<
    PlaidItemRow,
    | "id"
    | "connection_id"
    | "workspace_id"
    | "user_id"
    | "plaid_item_id"
    | "created_at"
  >
>;

const PLAID_ITEMS_TABLE =
  "plaid_items";

const PLAID_ITEM_ACCOUNTS_TABLE =
  "plaid_item_accounts";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME =
  "SUPABASE_SERVICE_ROLE_KEY_CASE_BUDGET";

let cachedSupabaseAdminClient:
  SupabaseClient | null = null;

/**
 * Creates one encrypted Plaid Item secret record and stores the account
 * selection captured during Plaid Link.
 *
 * The plaintext Plaid access token is encrypted before any database write.
 */
export async function createPlaidItem(
  input:
    CreatePlaidItemInput,
): Promise<PlaidItemMetadata> {
  const operation =
    "createPlaidItem";

  const normalizedInput =
    normalizeCreateInput(
      input,
      operation,
    );

  const associatedData =
    createPlaidTokenAssociatedData({
      connectionId:
        normalizedInput.connectionId,

      workspaceId:
        normalizedInput.workspaceId,

      userId:
        normalizedInput.userId,

      plaidItemId:
        normalizedInput.plaidItemId,
    });

  let encryptedToken:
    EncryptedSecret;

  try {
    encryptedToken =
      encryptSecret(
        normalizedInput.accessToken,
        {
          associatedData,
        },
      );
  } catch (
    error
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "Unable to encrypt the Plaid access token.",

      code:
        "encryption-error",

      operation,

      cause:
        error,
    });
  }

  const selectedAccountsSnapshot =
    normalizedInput.selectedAccounts.map(
      (
        account,
      ) => ({
        provider_account_id:
          account.providerAccountId,

        name:
          account.name ??
          null,

        mask:
          account.mask ??
          null,

        type:
          account.type ??
          null,

        subtype:
          account.subtype ??
          null,

        is_selected:
          account.isSelected,

        is_active:
          account.isActive,
      }),
    );

  const insertRow:
    PlaidItemInsertRow = {
      connection_id:
        normalizedInput.connectionId,

      workspace_id:
        normalizedInput.workspaceId,

      user_id:
        normalizedInput.userId,

      plaid_item_id:
        normalizedInput.plaidItemId,

      access_token_ciphertext:
        base64ToPostgresBytea(
          encryptedToken.ciphertext,
        ),

      access_token_iv:
        base64ToPostgresBytea(
          encryptedToken.iv,
        ),

      access_token_auth_tag:
        base64ToPostgresBytea(
          encryptedToken.authTag,
        ),

      encryption_key_version:
        encryptedToken.keyVersion,

      institution_id:
        normalizedInput.institutionId ??
        null,

      available_products:
        normalizedInput.availableProducts,

      billed_products:
        normalizedInput.billedProducts,

      consented_products:
        normalizedInput.consentedProducts,

      consent_expiration_time:
        normalizedInput.consentExpirationTime ??
        null,

      update_type:
        normalizedInput.updateType ??
        null,

      selected_accounts:
        selectedAccountsSnapshot,

      link_session_id:
        normalizedInput.linkSessionId ??
        null,

      token_fingerprint:
        encryptedToken.fingerprint,

      last_verified_at:
        normalizedInput.lastVerifiedAt ??
        null,

      revoked_at:
        null,
    };

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          PLAID_ITEMS_TABLE,
        )
        .insert(
          insertRow,
        )
        .select(
          "*",
        )
        .single<PlaidItemRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
        duplicateMessage:
          "This Plaid Item has already been stored.",
      });
    }

    if (
      !data
    ) {
      throw new PlaidItemRepositoryError({
        message:
          "The Plaid Item was created but no record was returned.",

        code:
          "database-error",

        operation,
      });
    }

    if (
      normalizedInput.selectedAccounts.length >
      0
    ) {
      try {
        await replacePlaidSelectedAccounts(
          {
            connectionId:
              normalizedInput.connectionId,

            owner: {
              workspaceId:
                normalizedInput.workspaceId,

              userId:
                normalizedInput.userId,
            },
          },
          normalizedInput.selectedAccounts,
          data.id,
        );
      } catch (
        error
      ) {
        await deletePlaidItemRecordBestEffort({
          plaidItemDatabaseId:
            data.id,

          connectionId:
            normalizedInput.connectionId,

          owner: {
            workspaceId:
              normalizedInput.workspaceId,

            userId:
              normalizedInput.userId,
          },
        });

        throw error;
      }
    }

    return getRequiredPlaidItemMetadata({
      connectionId:
        normalizedInput.connectionId,

      owner: {
        workspaceId:
          normalizedInput.workspaceId,

        userId:
          normalizedInput.userId,
      },
    });
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to store the Plaid Item.",
    );
  }
}

/**
 * Returns non-secret Plaid Item metadata for one owned financial connection.
 */
export async function getPlaidItemMetadataByConnectionId({
  connectionId,
  owner,
}: PlaidItemLookup): Promise<
  PlaidItemMetadata | null
> {
  const operation =
    "getPlaidItemMetadataByConnectionId";

  const lookup =
    normalizeLookup(
      {
        connectionId,
        owner,
      },
      operation,
    );

  try {
    const itemRow =
      await getPlaidItemRowByConnectionId(
        lookup,
        operation,
      );

    if (
      !itemRow
    ) {
      return null;
    }

    const accounts =
      await listPlaidSelectedAccounts(
        lookup,
      );

    return mapPlaidItemMetadata(
      itemRow,
      accounts,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid Item metadata.",
    );
  }
}

/**
 * Returns a Plaid Item and decrypts its access token for trusted server-side
 * synchronization operations.
 */
export async function getPlaidItemWithAccessTokenByConnectionId({
  connectionId,
  owner,
}: PlaidItemLookup): Promise<
  PlaidItemWithAccessToken | null
> {
  const operation =
    "getPlaidItemWithAccessTokenByConnectionId";

  const lookup =
    normalizeLookup(
      {
        connectionId,
        owner,
      },
      operation,
    );

  try {
    const itemRow =
      await getPlaidItemRowByConnectionId(
        lookup,
        operation,
      );

    if (
      !itemRow
    ) {
      return null;
    }

    const accounts =
      await listPlaidSelectedAccounts(
        lookup,
      );

    const metadata =
      mapPlaidItemMetadata(
        itemRow,
        accounts,
      );

    const accessToken =
      decryptPlaidAccessToken(
        itemRow,
        operation,
      );

    if (
      secretNeedsRotation({
        keyVersion:
          itemRow.encryption_key_version,
      })
    ) {
      await rotatePlaidItemAccessToken(
        lookup,
      );
    }

    return {
      ...metadata,
      accessToken,
    };
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid Item access token.",
    );
  }
}

/**
 * Looks up a Plaid Item by the provider Item ID.
 *
 * Ownership should be supplied for normal user-initiated operations. The
 * owner-less variant is intended only for trusted webhook processing.
 */
export async function getPlaidItemMetadataByPlaidItemId({
  plaidItemId,
  owner,
}: PlaidItemProviderLookup): Promise<
  PlaidItemMetadata | null
> {
  const operation =
    "getPlaidItemMetadataByPlaidItemId";

  const normalizedPlaidItemId =
    requireNonEmptyString(
      plaidItemId,
      "plaidItemId",
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    let query =
      supabase
        .from(
          PLAID_ITEMS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "plaid_item_id",
          normalizedPlaidItemId,
        );

    if (
      owner
    ) {
      const normalizedOwner =
        normalizeOwner(
          owner,
          operation,
        );

      query =
        query
          .eq(
            "workspace_id",
            normalizedOwner.workspaceId,
          )
          .eq(
            "user_id",
            normalizedOwner.userId,
          );
    }

    const {
      data,
      error,
    } =
      await query.maybeSingle<PlaidItemRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    if (
      !data
    ) {
      return null;
    }

    const accounts =
      await listPlaidSelectedAccounts(
        {
          connectionId:
            data.connection_id,

          owner: {
            workspaceId:
              data.workspace_id,

            userId:
              data.user_id,
          },
        },
      );

    return mapPlaidItemMetadata(
      data,
      accounts,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid Item.",
    );
  }
}

/**
 * Returns the decrypted Plaid access token by provider Item ID.
 *
 * This is intended for trusted webhook and background sync workers.
 */
export async function getPlaidAccessTokenByPlaidItemId({
  plaidItemId,
  owner,
}: PlaidItemProviderLookup): Promise<
  string | null
> {
  const operation =
    "getPlaidAccessTokenByPlaidItemId";

  const normalizedPlaidItemId =
    requireNonEmptyString(
      plaidItemId,
      "plaidItemId",
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    let query =
      supabase
        .from(
          PLAID_ITEMS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "plaid_item_id",
          normalizedPlaidItemId,
        );

    if (
      owner
    ) {
      const normalizedOwner =
        normalizeOwner(
          owner,
          operation,
        );

      query =
        query
          .eq(
            "workspace_id",
            normalizedOwner.workspaceId,
          )
          .eq(
            "user_id",
            normalizedOwner.userId,
          );
    }

    const {
      data,
      error,
    } =
      await query.maybeSingle<PlaidItemRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    if (
      !data
    ) {
      return null;
    }

    return decryptPlaidAccessToken(
      data,
      operation,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid access token.",
    );
  }
}

/**
 * Replaces the encrypted access token for an existing Plaid Item.
 *
 * This supports future token replacement and explicit key rotation.
 */
export async function updatePlaidItemAccessToken(
  lookup:
    PlaidItemLookup,
  accessToken:
    string,
) {
  const operation =
    "updatePlaidItemAccessToken";

  const normalizedLookup =
    normalizeLookup(
      lookup,
      operation,
    );

  const normalizedAccessToken =
    requireNonEmptyString(
      accessToken,
      "accessToken",
      operation,
    );

  const itemRow =
    await getRequiredPlaidItemRow(
      normalizedLookup,
      operation,
    );

  const associatedData =
    createPlaidTokenAssociatedData({
      connectionId:
        itemRow.connection_id,

      workspaceId:
        itemRow.workspace_id,

      userId:
        itemRow.user_id,

      plaidItemId:
        itemRow.plaid_item_id,
    });

  let encryptedToken:
    EncryptedSecret;

  try {
    encryptedToken =
      encryptSecret(
        normalizedAccessToken,
        {
          associatedData,
        },
      );
  } catch (
    error
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "Unable to encrypt the replacement Plaid access token.",

      code:
        "encryption-error",

      operation,

      cause:
        error,
    });
  }

  const updateRow:
    PlaidItemUpdateRow = {
      access_token_ciphertext:
        base64ToPostgresBytea(
          encryptedToken.ciphertext,
        ),

      access_token_iv:
        base64ToPostgresBytea(
          encryptedToken.iv,
        ),

      access_token_auth_tag:
        base64ToPostgresBytea(
          encryptedToken.authTag,
        ),

      encryption_key_version:
        encryptedToken.keyVersion,

      token_fingerprint:
        encryptedToken.fingerprint,

      revoked_at:
        null,
    };

  const updatedRow =
    await updatePlaidItemRow(
      normalizedLookup,
      updateRow,
      operation,
    );

  return mapPlaidItemMetadata(
    updatedRow,
    await listPlaidSelectedAccounts(
      normalizedLookup,
    ),
  );
}

/**
 * Rotates an existing encrypted access token to the active key version.
 */
export async function rotatePlaidItemAccessToken(
  lookup:
    PlaidItemLookup,
): Promise<RotatePlaidItemTokenResult> {
  const operation =
    "rotatePlaidItemAccessToken";

  const normalizedLookup =
    normalizeLookup(
      lookup,
      operation,
    );

  const itemRow =
    await getRequiredPlaidItemRow(
      normalizedLookup,
      operation,
    );

  const encryptedSecret =
    mapRowToEncryptedSecret(
      itemRow,
      operation,
    );

  const associatedData =
    createPlaidTokenAssociatedData({
      connectionId:
        itemRow.connection_id,

      workspaceId:
        itemRow.workspace_id,

      userId:
        itemRow.user_id,

      plaidItemId:
        itemRow.plaid_item_id,
    });

  let rotationResult;

  try {
    rotationResult =
      reencryptSecretIfNeeded(
        encryptedSecret,
        {
          associatedData,
        },
      );
  } catch (
    error
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "Unable to rotate the Plaid access-token encryption key.",

      code:
        "encryption-error",

      operation,

      cause:
        error,
    });
  }

  if (
    !rotationResult.wasRotated
  ) {
    return {
      rotated:
        false,

      keyVersion:
        encryptedSecret.keyVersion,
    };
  }

  await updatePlaidItemRow(
    normalizedLookup,
    {
      access_token_ciphertext:
        base64ToPostgresBytea(
          rotationResult.encryptedSecret.ciphertext,
        ),

      access_token_iv:
        base64ToPostgresBytea(
          rotationResult.encryptedSecret.iv,
        ),

      access_token_auth_tag:
        base64ToPostgresBytea(
          rotationResult.encryptedSecret.authTag,
        ),

      encryption_key_version:
        rotationResult.encryptedSecret.keyVersion,

      token_fingerprint:
        rotationResult.encryptedSecret.fingerprint,
    },
    operation,
  );

  return {
    rotated:
      true,

    keyVersion:
      rotationResult.encryptedSecret.keyVersion,
  };
}

/**
 * Updates non-secret Plaid Item metadata.
 */
export async function updatePlaidItemMetadata(
  lookup:
    PlaidItemLookup,
  updates:
    UpdatePlaidItemMetadataInput,
): Promise<PlaidItemMetadata> {
  const operation =
    "updatePlaidItemMetadata";

  const normalizedLookup =
    normalizeLookup(
      lookup,
      operation,
    );

  const updateRow:
    PlaidItemUpdateRow = {};

  if (
    updates.institutionId !==
    undefined
  ) {
    updateRow.institution_id =
      normalizeOptionalText(
        updates.institutionId ??
        undefined,
      ) ??
      null;
  }

  if (
    updates.availableProducts !==
    undefined
  ) {
    updateRow.available_products =
      deduplicateStrings(
        updates.availableProducts,
      );
  }

  if (
    updates.billedProducts !==
    undefined
  ) {
    updateRow.billed_products =
      deduplicateStrings(
        updates.billedProducts,
      );
  }

  if (
    updates.consentedProducts !==
    undefined
  ) {
    updateRow.consented_products =
      deduplicateStrings(
        updates.consentedProducts,
      );
  }

  if (
    updates.consentExpirationTime !==
    undefined
  ) {
    updateRow.consent_expiration_time =
      normalizeOptionalIsoDate(
        updates.consentExpirationTime ??
        undefined,
        "consentExpirationTime",
        operation,
      );
  }

  if (
    updates.updateType !==
    undefined
  ) {
    updateRow.update_type =
      normalizeOptionalText(
        updates.updateType ??
        undefined,
      ) ??
      null;
  }

  if (
    updates.linkSessionId !==
    undefined
  ) {
    updateRow.link_session_id =
      normalizeOptionalText(
        updates.linkSessionId ??
        undefined,
      ) ??
      null;
  }

  if (
    updates.lastVerifiedAt !==
    undefined
  ) {
    updateRow.last_verified_at =
      normalizeOptionalIsoDate(
        updates.lastVerifiedAt ??
        undefined,
        "lastVerifiedAt",
        operation,
      );
  }

  if (
    updates.revokedAt !==
    undefined
  ) {
    updateRow.revoked_at =
      normalizeOptionalIsoDate(
        updates.revokedAt ??
        undefined,
        "revokedAt",
        operation,
      );
  }

  if (
    Object.keys(
      updateRow,
    ).length ===
    0
  ) {
    return getRequiredPlaidItemMetadata(
      normalizedLookup,
    );
  }

  const updatedRow =
    await updatePlaidItemRow(
      normalizedLookup,
      updateRow,
      operation,
    );

  return mapPlaidItemMetadata(
    updatedRow,
    await listPlaidSelectedAccounts(
      normalizedLookup,
    ),
  );
}

/**
 * Marks a Plaid Item as successfully verified.
 */
export async function markPlaidItemVerified(
  lookup:
    PlaidItemLookup,
  verifiedAt =
    new Date().toISOString(),
) {
  return updatePlaidItemMetadata(
    lookup,
    {
      lastVerifiedAt:
        verifiedAt,

      revokedAt:
        null,
    },
  );
}

/**
 * Marks a Plaid Item revoked while retaining encrypted records for audit and
 * controlled recovery. Normal disconnect flows may later delete it.
 */
export async function markPlaidItemRevoked(
  lookup:
    PlaidItemLookup,
  revokedAt =
    new Date().toISOString(),
) {
  return updatePlaidItemMetadata(
    lookup,
    {
      revokedAt,
    },
  );
}

/**
 * Replaces the normalized Plaid account selection for one Item.
 */
export async function replacePlaidSelectedAccounts(
  lookup:
    PlaidItemLookup,
  accounts:
    PlaidSelectedAccountInput[],
  knownPlaidItemDatabaseId?:
    string,
): Promise<PlaidSelectedAccountData[]> {
  const operation =
    "replacePlaidSelectedAccounts";

  const normalizedLookup =
    normalizeLookup(
      lookup,
      operation,
    );

  const normalizedAccounts =
    normalizeSelectedAccounts(
      accounts,
      operation,
    );

  const itemRow =
    knownPlaidItemDatabaseId
      ? {
          id:
            knownPlaidItemDatabaseId,
        }
      : await getRequiredPlaidItemRow(
          normalizedLookup,
          operation,
        );

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          PLAID_ITEM_ACCOUNTS_TABLE,
        )
        .delete()
        .eq(
          "plaid_item_id",
          itemRow.id,
        )
        .eq(
          "connection_id",
          normalizedLookup.connectionId,
        )
        .eq(
          "workspace_id",
          normalizedLookup.owner.workspaceId,
        )
        .eq(
          "user_id",
          normalizedLookup.owner.userId,
        );

    if (
      deleteError
    ) {
      throw mapSupabaseError({
        error:
          deleteError,

        operation,
      });
    }

    if (
      normalizedAccounts.length ===
      0
    ) {
      await updateSelectedAccountsSnapshot(
        normalizedLookup,
        [],
        operation,
      );

      return [];
    }

    const rows =
      normalizedAccounts.map(
        (
          account,
        ) => ({
          plaid_item_id:
            itemRow.id,

          connection_id:
            normalizedLookup.connectionId,

          workspace_id:
            normalizedLookup.owner.workspaceId,

          user_id:
            normalizedLookup.owner.userId,

          provider_account_id:
            account.providerAccountId,

          account_name:
            account.name ??
            null,

          account_mask:
            account.mask ??
            null,

          account_type:
            account.type ??
            null,

          account_subtype:
            account.subtype ??
            null,

          is_selected:
            account.isSelected,

          is_active:
            account.isActive,
        }),
      );

    const {
      data,
      error,
    } =
      await supabase
        .from(
          PLAID_ITEM_ACCOUNTS_TABLE,
        )
        .insert(
          rows,
        )
        .select(
          "*",
        )
        .returns<
          PlaidItemAccountRow[]
        >();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
        duplicateMessage:
          "The Plaid account selection contains duplicate provider account IDs.",
      });
    }

    await updateSelectedAccountsSnapshot(
      normalizedLookup,
      normalizedAccounts,
      operation,
    );

    return (
      data ??
      []
    ).map(
      mapPlaidItemAccountRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to replace the Plaid account selection.",
    );
  }
}

/**
 * Lists normalized selected accounts for one owned Plaid Item.
 */
export async function listPlaidSelectedAccounts({
  connectionId,
  owner,
}: PlaidItemLookup): Promise<
  PlaidSelectedAccountData[]
> {
  const operation =
    "listPlaidSelectedAccounts";

  const lookup =
    normalizeLookup(
      {
        connectionId,
        owner,
      },
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          PLAID_ITEM_ACCOUNTS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "connection_id",
          lookup.connectionId,
        )
        .eq(
          "workspace_id",
          lookup.owner.workspaceId,
        )
        .eq(
          "user_id",
          lookup.owner.userId,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        )
        .returns<
          PlaidItemAccountRow[]
        >();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return (
      data ??
      []
    ).map(
      mapPlaidItemAccountRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to list the Plaid selected accounts.",
    );
  }
}

/**
 * Deletes one encrypted Plaid Item and its normalized selected accounts.
 *
 * Database foreign keys cascade account-row deletion.
 */
export async function deletePlaidItem({
  connectionId,
  owner,
}: PlaidItemLookup) {
  const operation =
    "deletePlaidItem";

  const lookup =
    normalizeLookup(
      {
        connectionId,
        owner,
      },
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          PLAID_ITEMS_TABLE,
        )
        .delete()
        .eq(
          "connection_id",
          lookup.connectionId,
        )
        .eq(
          "workspace_id",
          lookup.owner.workspaceId,
        )
        .eq(
          "user_id",
          lookup.owner.userId,
        )
        .select(
          "id, plaid_item_id",
        )
        .maybeSingle<{
          id: string;
          plaid_item_id: string;
        }>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    if (
      !data
    ) {
      throw new PlaidItemRepositoryError({
        message:
          "The Plaid Item could not be found or is not owned by this user and workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return {
      deleted:
        true as const,

      plaidItemDatabaseId:
        data.id,

      plaidItemId:
        data.plaid_item_id,
    };
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to delete the Plaid Item.",
    );
  }
}

async function getRequiredPlaidItemMetadata(
  lookup:
    PlaidItemLookup,
) {
  const metadata =
    await getPlaidItemMetadataByConnectionId(
      lookup,
    );

  if (
    !metadata
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "The Plaid Item could not be found.",

      code:
        "not-found",

      operation:
        "getRequiredPlaidItemMetadata",
    });
  }

  return metadata;
}

async function getPlaidItemRowByConnectionId(
  lookup:
    PlaidItemLookup,
  operation:
    string,
) {
  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        PLAID_ITEMS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "connection_id",
        lookup.connectionId,
      )
      .eq(
        "workspace_id",
        lookup.owner.workspaceId,
      )
      .eq(
        "user_id",
        lookup.owner.userId,
      )
      .maybeSingle<PlaidItemRow>();

  if (
    error
  ) {
    throw mapSupabaseError({
      error,
      operation,
    });
  }

  return data ??
    null;
}

async function getRequiredPlaidItemRow(
  lookup:
    PlaidItemLookup,
  operation:
    string,
) {
  const row =
    await getPlaidItemRowByConnectionId(
      lookup,
      operation,
    );

  if (
    !row
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "The Plaid Item could not be found or is not owned by this user and workspace.",

      code:
        "not-found",

      operation,
    });
  }

  return row;
}

async function updatePlaidItemRow(
  lookup:
    PlaidItemLookup,
  updates:
    PlaidItemUpdateRow,
  operation:
    string,
) {
  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          PLAID_ITEMS_TABLE,
        )
        .update(
          updates,
        )
        .eq(
          "connection_id",
          lookup.connectionId,
        )
        .eq(
          "workspace_id",
          lookup.owner.workspaceId,
        )
        .eq(
          "user_id",
          lookup.owner.userId,
        )
        .select(
          "*",
        )
        .maybeSingle<PlaidItemRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    if (
      !data
    ) {
      throw new PlaidItemRepositoryError({
        message:
          "The Plaid Item could not be found or is not owned by this user and workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return data;
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to update the Plaid Item.",
    );
  }
}

async function updateSelectedAccountsSnapshot(
  lookup:
    PlaidItemLookup,
  accounts:
    ReturnType<
      typeof normalizeSelectedAccounts
    >,
  operation:
    string,
) {
  const snapshot =
    accounts.map(
      (
        account,
      ) => ({
        provider_account_id:
          account.providerAccountId,

        name:
          account.name ??
          null,

        mask:
          account.mask ??
          null,

        type:
          account.type ??
          null,

        subtype:
          account.subtype ??
          null,

        is_selected:
          account.isSelected,

        is_active:
          account.isActive,
      }),
    );

  await updatePlaidItemRow(
    lookup,
    {
      selected_accounts:
        snapshot,
    },
    operation,
  );
}

function decryptPlaidAccessToken(
  row:
    PlaidItemRow,
  operation:
    string,
) {
  const encryptedSecret =
    mapRowToEncryptedSecret(
      row,
      operation,
    );

  const associatedData =
    createPlaidTokenAssociatedData({
      connectionId:
        row.connection_id,

      workspaceId:
        row.workspace_id,

      userId:
        row.user_id,

      plaidItemId:
        row.plaid_item_id,
    });

  try {
    return decryptSecret(
      encryptedSecret,
      {
        associatedData,
      },
    );
  } catch (
    error
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "Unable to decrypt the Plaid access token.",

      code:
        "encryption-error",

      operation,

      cause:
        error,
    });
  }
}

function mapRowToEncryptedSecret(
  row:
    PlaidItemRow,
  operation:
    string,
): EncryptedSecret {
  try {
    return {
      ciphertext:
        postgresByteaToBase64(
          row.access_token_ciphertext,
        ),

      iv:
        postgresByteaToBase64(
          row.access_token_iv,
        ),

      authTag:
        postgresByteaToBase64(
          row.access_token_auth_tag,
        ),

      keyVersion:
        row.encryption_key_version,

      fingerprint:
        row.token_fingerprint,

      algorithm:
        "aes-256-gcm",

      encoding:
        "base64",
    };
  } catch (
    error
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "The stored Plaid access-token encryption data is invalid.",

      code:
        "encryption-error",

      operation,

      cause:
        error,
    });
  }
}

function mapPlaidItemMetadata(
  row:
    PlaidItemRow,
  accounts:
    PlaidSelectedAccountData[],
): PlaidItemMetadata {
  return {
    id:
      row.id,

    connectionId:
      row.connection_id,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    plaidItemId:
      row.plaid_item_id,

    institutionId:
      row.institution_id ??
      undefined,

    availableProducts:
      row.available_products ??
      [],

    billedProducts:
      row.billed_products ??
      [],

    consentedProducts:
      row.consented_products ??
      [],

    consentExpirationTime:
      row.consent_expiration_time ??
      undefined,

    updateType:
      row.update_type ??
      undefined,

    selectedAccounts:
      accounts,

    linkSessionId:
      row.link_session_id ??
      undefined,

    tokenFingerprint:
      row.token_fingerprint,

    encryptionKeyVersion:
      row.encryption_key_version,

    lastVerifiedAt:
      row.last_verified_at ??
      undefined,

    revokedAt:
      row.revoked_at ??
      undefined,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function mapPlaidItemAccountRow(
  row:
    PlaidItemAccountRow,
): PlaidSelectedAccountData {
  return {
    id:
      row.id,

    plaidItemDatabaseId:
      row.plaid_item_id,

    connectionId:
      row.connection_id,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    providerAccountId:
      row.provider_account_id,

    name:
      row.account_name ??
      undefined,

    mask:
      row.account_mask ??
      undefined,

    type:
      row.account_type ??
      undefined,

    subtype:
      row.account_subtype ??
      undefined,

    isSelected:
      row.is_selected,

    isActive:
      row.is_active,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function normalizeCreateInput(
  input:
    CreatePlaidItemInput,
  operation:
    string,
) {
  return {
    connectionId:
      requireNonEmptyString(
        input.connectionId,
        "connectionId",
        operation,
      ),

    workspaceId:
      requireNonEmptyString(
        input.workspaceId,
        "workspaceId",
        operation,
      ),

    userId:
      requireNonEmptyString(
        input.userId,
        "userId",
        operation,
      ),

    plaidItemId:
      requireNonEmptyString(
        input.plaidItemId,
        "plaidItemId",
        operation,
      ),

    accessToken:
      requireNonEmptyString(
        input.accessToken,
        "accessToken",
        operation,
      ),

    institutionId:
      normalizeOptionalText(
        input.institutionId,
      ),

    availableProducts:
      deduplicateStrings(
        input.availableProducts ??
        [],
      ),

    billedProducts:
      deduplicateStrings(
        input.billedProducts ??
        [],
      ),

    consentedProducts:
      deduplicateStrings(
        input.consentedProducts ??
        [],
      ),

    consentExpirationTime:
      normalizeOptionalIsoDate(
        input.consentExpirationTime,
        "consentExpirationTime",
        operation,
      ) ??
      undefined,

    updateType:
      normalizeOptionalText(
        input.updateType,
      ),

    selectedAccounts:
      normalizeSelectedAccounts(
        input.selectedAccounts ??
        [],
        operation,
      ),

    linkSessionId:
      normalizeOptionalText(
        input.linkSessionId,
      ),

    lastVerifiedAt:
      normalizeOptionalIsoDate(
        input.lastVerifiedAt,
        "lastVerifiedAt",
        operation,
      ) ??
      undefined,
  };
}

function normalizeSelectedAccounts(
  accounts:
    PlaidSelectedAccountInput[],
  operation:
    string,
) {
  const seenAccountIds =
    new Set<string>();

  return accounts.map(
    (
      account,
      index,
    ) => {
      const providerAccountId =
        requireNonEmptyString(
          account.providerAccountId,
          `accounts[${index}].providerAccountId`,
          operation,
        );

      if (
        seenAccountIds.has(
          providerAccountId,
        )
      ) {
        throw new PlaidItemRepositoryError({
          message:
            `Duplicate Plaid account ID "${providerAccountId}".`,

          code:
            "invalid-input",

          operation,
        });
      }

      seenAccountIds.add(
        providerAccountId,
      );

      return {
        providerAccountId,

        name:
          normalizeOptionalText(
            account.name,
          ),

        mask:
          normalizeOptionalText(
            account.mask,
          ),

        type:
          normalizeOptionalText(
            account.type,
          ),

        subtype:
          normalizeOptionalText(
            account.subtype,
          ),

        isSelected:
          account.isSelected ??
          true,

        isActive:
          account.isActive ??
          true,
      };
    },
  );
}

function normalizeLookup(
  lookup:
    PlaidItemLookup,
  operation:
    string,
): PlaidItemLookup {
  return {
    connectionId:
      requireNonEmptyString(
        lookup.connectionId,
        "connectionId",
        operation,
      ),

    owner:
      normalizeOwner(
        lookup.owner,
        operation,
      ),
  };
}

function normalizeOwner(
  owner:
    FinancialConnectionOwner,
  operation:
    string,
): FinancialConnectionOwner {
  return {
    workspaceId:
      requireNonEmptyString(
        owner.workspaceId,
        "workspaceId",
        operation,
      ),

    userId:
      requireNonEmptyString(
        owner.userId,
        "userId",
        operation,
      ),
  };
}

function createPlaidTokenAssociatedData({
  connectionId,
  workspaceId,
  userId,
  plaidItemId,
}: {
  connectionId:
    string;

  workspaceId:
    string;

  userId:
    string;

  plaidItemId:
    string;
}) {
  return [
    "provider:plaid",

    `connection:${connectionId}`,

    `workspace:${workspaceId}`,

    `user:${userId}`,

    `item:${plaidItemId}`,
  ].join(
    "|",
  );
}

function base64ToPostgresBytea(
  value:
    string,
) {
  const buffer =
    Buffer.from(
      value,
      "base64",
    );

  if (
    buffer.length ===
    0
  ) {
    throw new PlaidItemRepositoryError({
      message:
        "Encrypted byte data cannot be empty.",

      code:
        "encryption-error",

      operation:
        "base64ToPostgresBytea",
    });
  }

  return `\\x${buffer.toString(
    "hex",
  )}`;
}

function postgresByteaToBase64(
  value:
    unknown,
) {
  if (
    Buffer.isBuffer(
      value,
    )
  ) {
    return value.toString(
      "base64",
    );
  }

  if (
    value instanceof
    Uint8Array
  ) {
    return Buffer.from(
      value,
    ).toString(
      "base64",
    );
  }

  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      "Unsupported PostgreSQL bytea value.",
    );
  }

  const normalizedValue =
    value.trim();

  if (
    normalizedValue.startsWith(
      "\\x",
    )
  ) {
    return Buffer.from(
      normalizedValue.slice(
        2,
      ),
      "hex",
    ).toString(
      "base64",
    );
  }

  if (
    normalizedValue.startsWith(
      "\\\\x",
    )
  ) {
    return Buffer.from(
      normalizedValue.slice(
        3,
      ),
      "hex",
    ).toString(
      "base64",
    );
  }

  try {
    const decodedBase64 =
      Buffer.from(
        normalizedValue,
        "base64",
      );

    if (
      decodedBase64.length >
      0
    ) {
      return decodedBase64.toString(
        "base64",
      );
    }
  } catch {
    // Continue to UTF-8 fallback.
  }

  return Buffer.from(
    normalizedValue,
    "utf8",
  ).toString(
    "base64",
  );
}

function normalizeOptionalIsoDate(
  value:
    string | undefined,
  fieldName:
    string,
  operation:
    string,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  if (
    !normalizedValue
  ) {
    return null;
  }

  const date =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new PlaidItemRepositoryError({
      message:
        `${fieldName} must be a valid date.`,

      code:
        "invalid-input",

      operation,
    });
  }

  return date.toISOString();
}

function requireNonEmptyString(
  value:
    string,
  fieldName:
    string,
  operation:
    string,
) {
  const normalizedValue =
    value?.trim();

  if (
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new PlaidItemRepositoryError({
    message:
      `${fieldName} is required.`,

    code:
      "invalid-input",

    operation,
  });
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function deduplicateStrings(
  values:
    string[],
) {
  return [
    ...new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];
}

function getSupabaseAdminClient() {
  if (
    cachedSupabaseAdminClient
  ) {
    return cachedSupabaseAdminClient;
  }

  const supabaseUrl =
    requireEnvironmentVariable(
      SUPABASE_URL_ENV_NAME,
    );

  const serviceRoleKey =
    requireEnvironmentVariable(
      SUPABASE_SERVICE_ROLE_KEY_ENV_NAME,
    );

  cachedSupabaseAdminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false,
        },

        global: {
          headers: {
            "X-Client-Info":
              "case-budget-plaid-items-repository",
          },
        },
      },
    );

  return cachedSupabaseAdminClient;
}

function requireEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    value
  ) {
    return value;
  }

  throw new PlaidItemRepositoryError({
    message:
      `Missing required environment variable ${variableName}.`,

    code:
      "configuration-error",

    operation:
      "getSupabaseAdminClient",
  });
}

function mapSupabaseError({
  error,
  operation,
  duplicateMessage,
}: {
  error: {
    code?: string;
    message: string;
    details?: string;
    hint?: string;
  };

  operation:
    string;

  duplicateMessage?:
    string;
}) {
  if (
    error.code ===
    "23505"
  ) {
    return new PlaidItemRepositoryError({
      message:
        duplicateMessage ??
        "A duplicate Plaid Item record already exists.",

      code:
        "duplicate-item",

      operation,

      causeCode:
        error.code,

      cause:
        error,
    });
  }

  return new PlaidItemRepositoryError({
    message:
      error.message ||
      "The database operation failed.",

    code:
      "database-error",

    operation,

    causeCode:
      error.code,

    cause:
      error,
  });
}

function normalizeRepositoryError(
  error:
    unknown,
  operation:
    string,
  fallbackMessage:
    string,
) {
  if (
    error instanceof
    PlaidItemRepositoryError
  ) {
    return error;
  }

  return new PlaidItemRepositoryError({
    message:
      fallbackMessage,

    code:
      "unknown",

    operation,

    cause:
      error,
  });
}

async function deletePlaidItemRecordBestEffort({
  plaidItemDatabaseId,
  connectionId,
  owner,
}: {
  plaidItemDatabaseId:
    string;

  connectionId:
    string;

  owner:
    FinancialConnectionOwner;
}) {
  try {
    const supabase =
      getSupabaseAdminClient();

    await supabase
      .from(
        PLAID_ITEMS_TABLE,
      )
      .delete()
      .eq(
        "id",
        plaidItemDatabaseId,
      )
      .eq(
        "connection_id",
        connectionId,
      )
      .eq(
        "workspace_id",
        owner.workspaceId,
      )
      .eq(
        "user_id",
        owner.userId,
      );
  } catch {
    // Best-effort cleanup after a partial create failure.
  }
}

/**
 * Clears the cached Supabase service-role client.
 *
 * Intended for automated tests that replace environment variables.
 */
export function resetPlaidItemsRepositoryForTesting() {
  if (
    process.env.NODE_ENV !==
    "test"
  ) {
    throw new Error(
      "resetPlaidItemsRepositoryForTesting can only be used when NODE_ENV is test.",
    );
  }

  cachedSupabaseAdminClient =
    null;
}
