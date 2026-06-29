// apps/xilaire-platform/lib/entitlements/interpretEntitlementResult.ts

type EnforcementResult = {
  allowed: boolean
  enforcement: "normal" | "grace" | "overage"
  remaining_after: number
}

export type EntitlementDecision = {
  allowed: boolean
  severity: "ok" | "warning" | "overage" | "blocked"
  message?: string
  remaining_after?: number
}

export function interpretEntitlementResult(
  result: EnforcementResult
): EntitlementDecision {
  switch (result.enforcement) {
    case "normal":
      return {
        allowed: true,
        severity: "ok",
        remaining_after: result.remaining_after,
      }

    case "grace":
      return {
        allowed: true,
        severity: "warning",
        message:
          "You are within your grace limit for this entitlement.",
        remaining_after: result.remaining_after,
      }

    case "overage":
      return {
        allowed: true,
        severity: "overage",
        message:
          "This action exceeds your entitlement and may incur overage charges.",
        remaining_after: result.remaining_after,
      }

    default:
      return {
        allowed: false,
        severity: "blocked",
        message: "Entitlement enforcement failed.",
      }
  }
}