/**
 * ================================================================
 * CASE Trades
 * Organization Type Definitions
 * ---------------------------------------------------------------
 * Single source of truth for:
 *
 * • Organization Membership
 * • Organization Access
 * • Organization Permissions
 * • Subscription State
 * • Discord Access
 * • Organization Switcher
 *
 * Every helper under /lib/orgs should import these types.
 * ================================================================
 */

export type OrganizationRole =
  | "owner"
  | "admin"
  | "analyst"
  | "member"
  | null;

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired"
  | "inactive"
  | "master_admin"
  | null;

export type DiscordAccessStatus =
  | "active"
  | "inactive"
  | "pending"
  | "removed"
  | "master_admin"
  | null;

/**
 * ================================================================
 * Organization Membership
 * ================================================================
 */

export type UserOrganizationAccess = {
  /**
   * Organization
   */
  organization_id: string;
  organization_slug: string;
  organization_name: string;

  /**
   * Membership
   */
  role: OrganizationRole;
  active: boolean;

  /**
   * Subscription
   */
  subscription_status: SubscriptionStatus;
  plan_id: string | null;
  has_active_subscription: boolean;

  /**
   * Discord
   */
  discord_status: DiscordAccessStatus;
  discord_role_id: string | null;
  has_discord_access: boolean;

  /**
   * Global Admin
   */
  is_master_admin: boolean;
};

/**
 * ================================================================
 * Organization Summary
 * Used by organization switchers and dropdowns.
 * ================================================================
 */

export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  active?: boolean;
};

/**
 * ================================================================
 * Organization Selector Item
 * Used in sidebar/navbar switchers.
 * ================================================================
 */

export type OrganizationSwitcherItem = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;

  role: OrganizationRole;

  active: boolean;

  has_active_subscription: boolean;

  has_discord_access: boolean;

  is_master_admin?: boolean;
};

/**
 * ================================================================
 * Permission Helpers
 * ================================================================
 */

export type OrganizationPermission =
  | "view"
  | "signals"
  | "journal"
  | "billing"
  | "members"
  | "settings"
  | "analytics"
  | "admin";

/**
 * ================================================================
 * Feature Access Result
 * ================================================================
 */

export type OrgFeatureAccessReason =
  | "ALLOWED"
  | "NO_ORGANIZATION_ACCESS"
  | "NO_ACTIVE_SUBSCRIPTION"
  | "NO_DISCORD_ACCESS";

export type OrgFeatureAccessResult = {
  allowed: boolean;
  reason: OrgFeatureAccessReason;
  access: UserOrganizationAccess | null;
};

/**
 * ================================================================
 * Organization Query Options
 * Used throughout the application.
 * ================================================================
 */

export type OrganizationLookup = {
  userId: string;

  organizationId?: string;

  organizationSlug?: string;
};

/**
 * ================================================================
 * Organization Feature Lookup Options
 * Used by feature permission helpers.
 * ================================================================
 */

export type OrganizationFeatureLookup = OrganizationLookup & {
  /**
   * Most organization features require Discord access.
   * Billing, profile, and some admin pages may bypass this.
   */
  requireDiscord?: boolean;
};