/** In-memory admin mock state for demo session (resets on server restart). */

import { ADMIN_MOCK_LISTINGS, ADMIN_MOCK_USERS, type AdminMockListing, type AdminMockUser } from "@/lib/adminMock";

const mockUserOverrides = new Map<string, Partial<Pick<AdminMockUser, "username" | "email">>>();

const bannedMockUserIds = new Set<string>();
const deletedMockUserIds = new Set<string>();
const deletedMockListingIds = new Set<string>();
const mockListingOverrides = new Map<string, Partial<AdminMockListing>>();

export function setMockUserBanned(userId: string, banned: boolean): boolean {
  if (userId === "demo-user") return false;
  if (banned) bannedMockUserIds.add(userId);
  else bannedMockUserIds.delete(userId);
  return true;
}

export function isMockUserBanned(userId: string): boolean {
  return bannedMockUserIds.has(userId);
}

export function deleteMockUser(userId: string): boolean {
  if (userId === "demo-user") return false;
  deletedMockUserIds.add(userId);
  return true;
}

export function isMockUserDeleted(userId: string): boolean {
  return deletedMockUserIds.has(userId);
}

export function getResolvedAdminMockListings(): AdminMockListing[] {
  return ADMIN_MOCK_LISTINGS.filter((l) => !deletedMockListingIds.has(l.id)).map((l) => ({
    ...l,
    ...mockListingOverrides.get(l.id),
  }));
}

export function deleteAdminMockListing(id: string): boolean {
  if (!ADMIN_MOCK_LISTINGS.some((l) => l.id === id)) return false;
  deletedMockListingIds.add(id);
  return true;
}

export function patchAdminMockListing(id: string, patch: Partial<AdminMockListing>): AdminMockListing | null {
  if (!ADMIN_MOCK_LISTINGS.some((l) => l.id === id) || deletedMockListingIds.has(id)) return null;
  mockListingOverrides.set(id, { ...mockListingOverrides.get(id), ...patch });
  return getResolvedAdminMockListings().find((l) => l.id === id) || null;
}

export function resolveMockUserForSnapshot(u: AdminMockUser) {
  const o = mockUserOverrides.get(u.id);
  return {
    ...u,
    username: (o?.username ?? u.username).trim() || u.username,
    email: (o?.email ?? u.email).trim().toLowerCase() || u.email,
  };
}

export function patchAdminMockUser(id: string, username: string, email: string): boolean {
  if (!ADMIN_MOCK_USERS.some((u) => u.id === id)) return false;
  mockUserOverrides.set(id, { username: username.trim(), email: email.trim().toLowerCase() });
  return true;
}
