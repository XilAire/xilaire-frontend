import { getActiveOrgAccess } from "./getActiveOrgAccess";
import { getUserOrganizations } from "./getUserOrganizations";

import type {
  OrganizationLookup,
  UserOrganizationAccess,
} from "./types";

/**
 * ================================================================
 * CASE Trades
 * Current Organization Helper
 * ---------------------------------------------------------------
 * This helper resolves the active organization for the current user.
 *
 * Lookup priority:
 *
 * 1. Explicit organizationId
 * 2. Explicit organizationSlug
 * 3. First accessible organization returned by getUserOrganizations()
 *
 * Used by:
 * • Sidebar
 * • Signals
 * • Journal
 * • Billing
 * • Admin pages
 * • Organization switcher
 * ================================================================
 */

export type CurrentOrganizationResult = {
  currentOrganization: UserOrganizationAccess | null;
  organizations: UserOrganizationAccess[];
};

export async function getCurrentOrganization({
  userId,
  organizationId,
  organizationSlug,
}: OrganizationLookup): Promise<CurrentOrganizationResult> {
  const organizations = await getUserOrganizations(userId);

  if (!organizations.length) {
    return {
      currentOrganization: null,
      organizations: [],
    };
  }

  const currentOrganization = await getActiveOrgAccess({
    userId,
    organizationId,
    organizationSlug,
  });

  return {
    currentOrganization: currentOrganization ?? organizations[0] ?? null,
    organizations,
  };
}