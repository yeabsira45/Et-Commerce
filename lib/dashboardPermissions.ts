/**
 * Front-end permission helpers. VENDOR = regular marketplace user ("USER" in product spec).
 * ADMIN = super admin.
 */

export type DashboardRole = "VENDOR" | "ADMIN";

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN";
}

/** Profile / settings target is the signed-in user unless admin overrides in admin UI. */
export function canEditOwnProfile(_viewerRole: DashboardRole | undefined): boolean {
  return true;
}

export function canAccessAdminTab(role: string | undefined | null): boolean {
  return isAdminRole(role);
}

export function canModifyListing(viewerId: string | undefined, viewerRole: string | undefined, ownerId: string | undefined): boolean {
  if (!viewerId || !ownerId) return false;
  if (isAdminRole(viewerRole)) return true;
  return viewerId === ownerId;
}

export function canBanUsers(role: string | undefined | null): boolean {
  return isAdminRole(role);
}

export function canDeleteAccount(viewerId: string | undefined, viewerRole: string | undefined, accountUserId: string | undefined): boolean {
  if (!viewerId || !accountUserId) return false;
  if (isAdminRole(viewerRole)) return true;
  return viewerId === accountUserId;
}
