import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;

  keyVersion: number;

  fingerprint: string;

  algorithm: "aes-256-gcm";
  encoding: "base64";
};

export type EncryptSecretOptions = {
  associatedData?: string;
};

export type DecryptSecretOptions = {
  associatedData?: string;
};

export type ReencryptSecretResult = {
  encryptedSecret: EncryptedSecret;
  wasRotated: boolean;
};

export type EncryptionConfigurationSummary = {
  activeKeyVersion: number;
  configuredKeyVersions: number[];
  algorithm: "aes-256-gcm";
  fingerprintAlgorithm: "hmac-sha256";
};

export type EncryptionErrorCode =
  | "invalid-plaintext"
  | "invalid-encrypted-secret"
  | "invalid-key-version"
  | "missing-active-key-version"
  | "missing-encryption-key"
  | "invalid-encryption-key"
  | "encryption-failed"
  | "decryption-failed"
  | "authentication-failed"
  | "fingerprint-mismatch";

export class EncryptionError extends Error {
  readonly code:
    EncryptionErrorCode;

  readonly keyVersion?:
    number;

  constructor({
    message,
    code,
    keyVersion,
    cause,
  }: {
    message:
      string;

    code:
      EncryptionErrorCode;

    keyVersion?:
      number;

    cause?:
      unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "EncryptionError";

    this.code =
      code;

    this.keyVersion =
      keyVersion;
  }
}

type EncryptionKeyRecord = {
  version: number;
  key: Buffer;
};

const ENCRYPTION_ALGORITHM =
  "aes-256-gcm";

const FINGERPRINT_ALGORITHM =
  "sha256";

const KEY_LENGTH_BYTES =
  32;

const IV_LENGTH_BYTES =
  12;

const AUTH_TAG_LENGTH_BYTES =
  16;

const MINIMUM_KEY_VERSION =
  1;

const ACTIVE_KEY_VERSION_ENV_NAME =
  "CASE_BUDGET_ACTIVE_KEY_VERSION";

const KEY_ENV_PREFIX =
  "CASE_BUDGET_TOKEN_ENCRYPTION_KEY_V";

const FINGERPRINT_CONTEXT =
  "CASE Budget provider token fingerprint v1";

const ASSOCIATED_DATA_PREFIX =
  "CASE Budget encrypted secret v1";

let cachedActiveKeyVersion:
  number | null = null;

const cachedKeys =
  new Map<
    number,
    Buffer
  >();

/**
 * Encrypts sensitive provider credentials with AES-256-GCM.
 *
 * The resulting values are Base64 encoded and safe to store in the database.
 * The encryption key is never returned or serialized.
 */
export function encryptSecret(
  plaintext:
    string,
  options: EncryptSecretOptions = {},
): EncryptedSecret {
  const normalizedPlaintext =
    requirePlaintext(
      plaintext,
    );

  const activeKey =
    getActiveEncryptionKey();

  const iv =
    randomBytes(
      IV_LENGTH_BYTES,
    );

  const associatedData =
    createAssociatedData({
      keyVersion:
        activeKey.version,

      customAssociatedData:
        options.associatedData,
    });

  try {
    const cipher =
      createCipheriv(
        ENCRYPTION_ALGORITHM,
        activeKey.key,
        iv,
        {
          authTagLength:
            AUTH_TAG_LENGTH_BYTES,
        },
      );

    cipher.setAAD(
      associatedData,
    );

    const ciphertext =
      Buffer.concat([
        cipher.update(
          normalizedPlaintext,
          "utf8",
        ),
        cipher.final(),
      ]);

    const authTag =
      cipher.getAuthTag();

    return {
      ciphertext:
        ciphertext.toString(
          "base64",
        ),

      iv:
        iv.toString(
          "base64",
        ),

      authTag:
        authTag.toString(
          "base64",
        ),

      keyVersion:
        activeKey.version,

      fingerprint:
        createSecretFingerprint(
          normalizedPlaintext,
          activeKey.version,
        ),

      algorithm:
        ENCRYPTION_ALGORITHM,

      encoding:
        "base64",
    };
  } catch (
    error
  ) {
    throw new EncryptionError({
      message:
        "Unable to encrypt the sensitive value.",

      code:
        "encryption-failed",

      keyVersion:
        activeKey.version,

      cause:
        error,
    });
  }
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 *
 * The key version stored with the record determines which configured key is
 * loaded, allowing old records to remain decryptable during key rotation.
 */
export function decryptSecret(
  encryptedSecret:
    EncryptedSecret,
  options: DecryptSecretOptions = {},
) {
  validateEncryptedSecret(
    encryptedSecret,
  );

  const encryptionKey =
    getEncryptionKey(
      encryptedSecret.keyVersion,
    );

  const ciphertext =
    decodeBase64Field({
      value:
        encryptedSecret.ciphertext,

      fieldName:
        "ciphertext",
    });

  const iv =
    decodeBase64Field({
      value:
        encryptedSecret.iv,

      fieldName:
        "iv",

      expectedLength:
        IV_LENGTH_BYTES,
    });

  const authTag =
    decodeBase64Field({
      value:
        encryptedSecret.authTag,

      fieldName:
        "authTag",

      expectedLength:
        AUTH_TAG_LENGTH_BYTES,
    });

  const associatedData =
    createAssociatedData({
      keyVersion:
        encryptedSecret.keyVersion,

      customAssociatedData:
        options.associatedData,
    });

  try {
    const decipher =
      createDecipheriv(
        ENCRYPTION_ALGORITHM,
        encryptionKey.key,
        iv,
        {
          authTagLength:
            AUTH_TAG_LENGTH_BYTES,
        },
      );

    decipher.setAAD(
      associatedData,
    );

    decipher.setAuthTag(
      authTag,
    );

    const plaintext =
      Buffer.concat([
        decipher.update(
          ciphertext,
        ),
        decipher.final(),
      ]).toString(
        "utf8",
      );

    if (
      !plaintext
    ) {
      throw new EncryptionError({
        message:
          "The decrypted sensitive value is empty.",

        code:
          "decryption-failed",

        keyVersion:
          encryptedSecret.keyVersion,
      });
    }

    if (
      encryptedSecret.fingerprint &&
      !verifySecretFingerprint(
        plaintext,
        encryptedSecret.fingerprint,
        encryptedSecret.keyVersion,
      )
    ) {
      throw new EncryptionError({
        message:
          "The decrypted value did not match its stored fingerprint.",

        code:
          "fingerprint-mismatch",

        keyVersion:
          encryptedSecret.keyVersion,
      });
    }

    return plaintext;
  } catch (
    error
  ) {
    if (
      error instanceof
      EncryptionError
    ) {
      throw error;
    }

    throw new EncryptionError({
      message:
        "Unable to decrypt the sensitive value or verify its authentication tag.",

      code:
        "authentication-failed",

      keyVersion:
        encryptedSecret.keyVersion,

      cause:
        error,
    });
  }
}

/**
 * Creates a non-reversible HMAC-SHA256 fingerprint.
 *
 * The fingerprint can be used for duplicate detection and diagnostics without
 * revealing the underlying secret.
 */
export function createSecretFingerprint(
  plaintext:
    string,
  keyVersion =
    getActiveKeyVersion(),
) {
  const normalizedPlaintext =
    requirePlaintext(
      plaintext,
    );

  const encryptionKey =
    getEncryptionKey(
      keyVersion,
    );

  return createHmac(
    FINGERPRINT_ALGORITHM,
    deriveFingerprintKey(
      encryptionKey.key,
    ),
  )
    .update(
      normalizedPlaintext,
      "utf8",
    )
    .digest(
      "hex",
    );
}

/**
 * Verifies a secret against a stored fingerprint using timing-safe comparison.
 */
export function verifySecretFingerprint(
  plaintext:
    string,
  expectedFingerprint:
    string,
  keyVersion:
    number,
) {
  const normalizedExpectedFingerprint =
    expectedFingerprint
      .trim()
      .toLowerCase();

  if (
    !/^[a-f0-9]{64}$/.test(
      normalizedExpectedFingerprint,
    )
  ) {
    return false;
  }

  const actualFingerprint =
    createSecretFingerprint(
      plaintext,
      keyVersion,
    );

  const expectedBuffer =
    Buffer.from(
      normalizedExpectedFingerprint,
      "hex",
    );

  const actualBuffer =
    Buffer.from(
      actualFingerprint,
      "hex",
    );

  if (
    expectedBuffer.length !==
    actualBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    actualBuffer,
  );
}

/**
 * Re-encrypts a secret with the currently active key when necessary.
 *
 * Use this during reads or maintenance jobs to gradually rotate old secrets.
 */
export function reencryptSecretIfNeeded(
  encryptedSecret:
    EncryptedSecret,
  options: EncryptSecretOptions &
    DecryptSecretOptions = {},
): ReencryptSecretResult {
  validateEncryptedSecret(
    encryptedSecret,
  );

  const activeKeyVersion =
    getActiveKeyVersion();

  if (
    encryptedSecret.keyVersion ===
    activeKeyVersion
  ) {
    return {
      encryptedSecret,
      wasRotated:
        false,
    };
  }

  const plaintext =
    decryptSecret(
      encryptedSecret,
      options,
    );

  return {
    encryptedSecret:
      encryptSecret(
        plaintext,
        options,
      ),

    wasRotated:
      true,
  };
}

/**
 * Returns true when the record uses an older key than the active key.
 */
export function secretNeedsRotation(
  encryptedSecret:
    Pick<
      EncryptedSecret,
      "keyVersion"
    >,
) {
  return (
    encryptedSecret.keyVersion !==
    getActiveKeyVersion()
  );
}

/**
 * Returns a safe configuration summary without exposing key material.
 */
export function getEncryptionConfigurationSummary():
  EncryptionConfigurationSummary {
  return {
    activeKeyVersion:
      getActiveKeyVersion(),

    configuredKeyVersions:
      getConfiguredKeyVersions(),

    algorithm:
      ENCRYPTION_ALGORITHM,

    fingerprintAlgorithm:
      "hmac-sha256",
  };
}

/**
 * Returns true when the active encryption key is present and valid.
 */
export function isEncryptionConfigured() {
  try {
    getActiveEncryptionKey();

    return true;
  } catch {
    return false;
  }
}

/**
 * Clears cached environment configuration.
 *
 * Intended for automated tests that replace process.env values.
 */
export function resetEncryptionConfigurationForTesting() {
  if (
    process.env.NODE_ENV !==
    "test"
  ) {
    throw new Error(
      "resetEncryptionConfigurationForTesting can only be used when NODE_ENV is test.",
    );
  }

  cachedActiveKeyVersion =
    null;

  cachedKeys.clear();
}

function getActiveEncryptionKey():
  EncryptionKeyRecord {
  return getEncryptionKey(
    getActiveKeyVersion(),
  );
}

function getActiveKeyVersion() {
  if (
    cachedActiveKeyVersion !==
    null
  ) {
    return cachedActiveKeyVersion;
  }

  const rawVersion =
    process.env[
      ACTIVE_KEY_VERSION_ENV_NAME
    ]?.trim();

  if (
    !rawVersion
  ) {
    throw new EncryptionError({
      message:
        `Missing required environment variable ${ACTIVE_KEY_VERSION_ENV_NAME}.`,

      code:
        "missing-active-key-version",
    });
  }

  if (
    !/^\d+$/.test(
      rawVersion,
    )
  ) {
    throw new EncryptionError({
      message:
        `${ACTIVE_KEY_VERSION_ENV_NAME} must be a positive integer.`,

      code:
        "invalid-key-version",
    });
  }

  const version =
    Number(
      rawVersion,
    );

  if (
    !Number.isSafeInteger(
      version,
    ) ||
    version <
      MINIMUM_KEY_VERSION
  ) {
    throw new EncryptionError({
      message:
        `${ACTIVE_KEY_VERSION_ENV_NAME} must be a positive safe integer.`,

      code:
        "invalid-key-version",
    });
  }

  cachedActiveKeyVersion =
    version;

  return version;
}

function getEncryptionKey(
  version:
    number,
): EncryptionKeyRecord {
  if (
    !Number.isSafeInteger(
      version,
    ) ||
    version <
      MINIMUM_KEY_VERSION
  ) {
    throw new EncryptionError({
      message:
        "Encryption key version must be a positive safe integer.",

      code:
        "invalid-key-version",

      keyVersion:
        version,
    });
  }

  const cachedKey =
    cachedKeys.get(
      version,
    );

  if (
    cachedKey
  ) {
    return {
      version,
      key:
        cachedKey,
    };
  }

  const environmentVariableName =
    `${KEY_ENV_PREFIX}${version}`;

  const encodedKey =
    process.env[
      environmentVariableName
    ]?.trim();

  if (
    !encodedKey
  ) {
    throw new EncryptionError({
      message:
        `Missing encryption key ${environmentVariableName}.`,

      code:
        "missing-encryption-key",

      keyVersion:
        version,
    });
  }

  let key:
    Buffer;

  try {
    key =
      Buffer.from(
        encodedKey,
        "base64",
      );
  } catch (
    error
  ) {
    throw new EncryptionError({
      message:
        `${environmentVariableName} is not valid Base64.`,

      code:
        "invalid-encryption-key",

      keyVersion:
        version,

      cause:
        error,
    });
  }

  if (
    key.length !==
    KEY_LENGTH_BYTES
  ) {
    throw new EncryptionError({
      message:
        `${environmentVariableName} must decode to exactly ${KEY_LENGTH_BYTES} bytes.`,

      code:
        "invalid-encryption-key",

      keyVersion:
        version,
    });
  }

  cachedKeys.set(
    version,
    key,
  );

  return {
    version,
    key,
  };
}

function getConfiguredKeyVersions() {
  return Object.keys(
    process.env,
  )
    .filter(
      (
        environmentVariableName,
      ) =>
        environmentVariableName.startsWith(
          KEY_ENV_PREFIX,
        ),
    )
    .map(
      (
        environmentVariableName,
      ) =>
        environmentVariableName.slice(
          KEY_ENV_PREFIX.length,
        ),
    )
    .filter(
      (
        versionValue,
      ) =>
        /^\d+$/.test(
          versionValue,
        ),
    )
    .map(
      Number,
    )
    .filter(
      (
        version,
      ) =>
        Number.isSafeInteger(
          version,
        ) &&
        version >=
          MINIMUM_KEY_VERSION &&
        Boolean(
          process.env[
            `${KEY_ENV_PREFIX}${version}`
          ]?.trim(),
        ),
    )
    .sort(
      (
        firstVersion,
        secondVersion,
      ) =>
        firstVersion -
        secondVersion,
    );
}

function createAssociatedData({
  keyVersion,
  customAssociatedData,
}: {
  keyVersion:
    number;

  customAssociatedData:
    string | undefined;
}) {
  const normalizedCustomData =
    customAssociatedData?.trim();

  const associatedDataValue =
    normalizedCustomData
      ? [
          ASSOCIATED_DATA_PREFIX,
          `key-version:${keyVersion}`,
          normalizedCustomData,
        ].join(
          "|",
        )
      : [
          ASSOCIATED_DATA_PREFIX,
          `key-version:${keyVersion}`,
        ].join(
          "|",
        );

  return Buffer.from(
    associatedDataValue,
    "utf8",
  );
}

function deriveFingerprintKey(
  encryptionKey:
    Buffer,
) {
  return createHmac(
    FINGERPRINT_ALGORITHM,
    encryptionKey,
  )
    .update(
      FINGERPRINT_CONTEXT,
      "utf8",
    )
    .digest();
}

function requirePlaintext(
  plaintext:
    string,
) {
  if (
    typeof plaintext !==
    "string"
  ) {
    throw new EncryptionError({
      message:
        "The sensitive value must be a string.",

      code:
        "invalid-plaintext",
    });
  }

  if (
    plaintext.length ===
    0
  ) {
    throw new EncryptionError({
      message:
        "The sensitive value cannot be empty.",

      code:
        "invalid-plaintext",
    });
  }

  return plaintext;
}

function validateEncryptedSecret(
  value:
    EncryptedSecret,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    throw new EncryptionError({
      message:
        "Encrypted secret data is required.",

      code:
        "invalid-encrypted-secret",
    });
  }

  if (
    value.algorithm !==
    ENCRYPTION_ALGORITHM
  ) {
    throw new EncryptionError({
      message:
        `Unsupported encryption algorithm "${value.algorithm}".`,

      code:
        "invalid-encrypted-secret",

      keyVersion:
        value.keyVersion,
    });
  }

  if (
    value.encoding !==
    "base64"
  ) {
    throw new EncryptionError({
      message:
        `Unsupported encrypted-secret encoding "${value.encoding}".`,

      code:
        "invalid-encrypted-secret",

      keyVersion:
        value.keyVersion,
    });
  }

  if (
    !Number.isSafeInteger(
      value.keyVersion,
    ) ||
    value.keyVersion <
      MINIMUM_KEY_VERSION
  ) {
    throw new EncryptionError({
      message:
        "Encrypted secret contains an invalid key version.",

      code:
        "invalid-key-version",

      keyVersion:
        value.keyVersion,
    });
  }

  if (
    typeof value.ciphertext !==
      "string" ||
    !value.ciphertext.trim()
  ) {
    throw new EncryptionError({
      message:
        "Encrypted secret ciphertext is missing.",

      code:
        "invalid-encrypted-secret",

      keyVersion:
        value.keyVersion,
    });
  }

  if (
    typeof value.iv !==
      "string" ||
    !value.iv.trim()
  ) {
    throw new EncryptionError({
      message:
        "Encrypted secret IV is missing.",

      code:
        "invalid-encrypted-secret",

      keyVersion:
        value.keyVersion,
    });
  }

  if (
    typeof value.authTag !==
      "string" ||
    !value.authTag.trim()
  ) {
    throw new EncryptionError({
      message:
        "Encrypted secret authentication tag is missing.",

      code:
        "invalid-encrypted-secret",

      keyVersion:
        value.keyVersion,
    });
  }

  if (
    typeof value.fingerprint !==
      "string" ||
    !/^[a-f0-9]{64}$/i.test(
      value.fingerprint.trim(),
    )
  ) {
    throw new EncryptionError({
      message:
        "Encrypted secret fingerprint is invalid.",

      code:
        "invalid-encrypted-secret",

      keyVersion:
        value.keyVersion,
    });
  }
}

function decodeBase64Field({
  value,
  fieldName,
  expectedLength,
}: {
  value:
    string;

  fieldName:
    string;

  expectedLength?:
    number;
}) {
  let decodedValue:
    Buffer;

  try {
    decodedValue =
      Buffer.from(
        value,
        "base64",
      );
  } catch (
    error
  ) {
    throw new EncryptionError({
      message:
        `Encrypted secret ${fieldName} is not valid Base64.`,

      code:
        "invalid-encrypted-secret",

      cause:
        error,
    });
  }

  if (
    decodedValue.length ===
    0
  ) {
    throw new EncryptionError({
      message:
        `Encrypted secret ${fieldName} cannot be empty.`,

      code:
        "invalid-encrypted-secret",
    });
  }

  if (
    expectedLength !==
      undefined &&
    decodedValue.length !==
      expectedLength
  ) {
    throw new EncryptionError({
      message:
        `Encrypted secret ${fieldName} must decode to exactly ${expectedLength} bytes.`,

      code:
        "invalid-encrypted-secret",
    });
  }

  return decodedValue;
}
