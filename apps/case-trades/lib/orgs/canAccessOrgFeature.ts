import { getActiveOrgAccess } from "./getActiveOrgAccess";

import type {
  OrgFeatureAccessResult,
  OrganizationFeatureLookup,
  OrganizationLookup,
} from "./types";

/**
 * ================================================================
 * CASE Trades
 * Organization Feature Access Helper
 * ---------------------------------------------------------------
 * Centralized gatekeeper for organization-scoped features.
 *
 * Used by:
 * • Signals
 * • Journal
 * • Billing
 * • Members
 * • Settings
 * • Admin Pages
 * • Discord-gated areas
 * ================================================================
 */

export async function canAccessOrgFeature({
  userId,
  organizationId,
  organizationSlug,
  requireDiscord = true,
}: OrganizationFeatureLookup): Promise<OrgFeatureAccessResult> {
  const access = await getActiveOrgAccess({
    userId,
    organizationId,
    organizationSlug,
  });

  if (!access || access.active !== true) {
    return {
      allowed: false,
      reason: "NO_ORGANIZATION_ACCESS",
      access,
    };
  }

  if (access.is_master_admin) {
    return {
      allowed: true,
      reason: "ALLOWED",
      access,
    };
  }

  if (!access.has_active_subscription) {
    return {
      allowed: false,
      reason: "NO_ACTIVE_SUBSCRIPTION",
      access,
    };
  }

  if (requireDiscord && !access.has_discord_access) {
    return {
      allowed: false,
      reason: "NO_DISCORD_ACCESS",
      access,
    };
  }

  return {
    allowed: true,
    reason: "ALLOWED",
    access,
  };
}

/**
 * ================================================================
 * Signals Access
 * ---------------------------------------------------------------
 * Signals require:
 * • Active organization membership
 * • Active subscription
 * • Active Discord access
 * ================================================================
 */

export async function canViewOrganizationSignals({
  userId,
  organizationId,
  organizationSlug,
}: OrganizationLookup): Promise<OrgFeatureAccessResult> {
  return canAccessOrgFeature({
    userId,
    organizationId,
    organizationSlug,
    requireDiscord: true,
  });
}

/**
 * ================================================================
 * Journal Access
 * ---------------------------------------------------------------
 * Journal requires:
 * • Active organization membership
 * • Active subscription
 *
 * Discord is not required here by default because the journal is
 * an application feature, not a Discord-gated room.
 * ================================================================
 */

export async function canViewOrganizationJournal({
  userId,
  organizationId,
  organizationSlug,
}: OrganizationLookup): Promise<OrgFeatureAccessResult> {
  return canAccessOrgFeature({
    userId,
    organizationId,
    organizationSlug,
    requireDiscord: false,
  });
}

/**
 * ================================================================
 * Billing Access
 * ---------------------------------------------------------------
 * Billing requires:
 * • Active organization membership
 *
 * Role-based owner/admin checks should happen after this helper
 * returns ALLOWED.
 * ================================================================
 */

export async function canViewOrganizationBilling({
  userId,
  organizationId,
  organizationSlug,
}: OrganizationLookup): Promise<OrgFeatureAccessResult> {
  return canAccessOrgFeature({
    userId,
    organizationId,
    organizationSlug,
    requireDiscord: false,
  });
}