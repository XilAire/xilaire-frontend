import { getUserOrganizations } from "./getUserOrganizations";

import type {
  OrganizationLookup,
  UserOrganizationAccess,
} from "./types";

/**
 * ================================================================
 * Returns the user's access for a single organization.
 *
 * Lookup priority:
 *
 * 1. organizationId
 * 2. organizationSlug
 * 3. First accessible organization
 *
 * This helper is intentionally lightweight and delegates all
 * organization loading to getUserOrganizations().
 * ================================================================
 */

export async function getActiveOrgAccess({
  userId,
  organizationId,
  organizationSlug,
}: OrganizationLookup): Promise<UserOrganizationAccess | null> {
  const organizations = await getUserOrganizations(userId);

  if (!organizations.length) {
    return null;
  }

  if (organizationId) {
    const organization = organizations.find(
      (organization) => organization.organization_id === organizationId
    );

    return organization ?? null;
  }

  if (organizationSlug) {
    const organization = organizations.find(
      (organization) => organization.organization_slug === organizationSlug
    );

    return organization ?? null;
  }

  /**
   * Default Organization
   *
   * The first organization returned should eventually become
   * the user's selected organization until we implement the
   * organization switcher.
   */
  return organizations[0];
}