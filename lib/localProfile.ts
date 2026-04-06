import type { UserProfile } from "@/components/AppContext";

export type StoredProfileMeta = {
  userId: string;
  email?: string;
  fullName: string;
  phone?: string;
  storeName?: string;
  city?: string;
  profileImageId?: string;
};

const USER_KEY = "marketplace.user";
const PROFILE_KEY = "marketplace.profileMeta";

function isBrowser() {
  return typeof window !== "undefined";
}

function readProfiles(): StoredProfileMeta[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeProfiles(profiles: StoredProfileMeta[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  window.dispatchEvent(new CustomEvent("local-profile:changed"));
}

export function saveProfileMeta(profile: StoredProfileMeta) {
  const profiles = readProfiles();
  const next = profiles.filter((item) => item.userId !== profile.userId && item.email !== profile.email);
  next.push(profile);
  writeProfiles(next);
}

export function getProfileMeta(userId?: string | null, email?: string | null) {
  if (!userId && !email) return null;
  return readProfiles().find((item) => item.userId === userId || (email && item.email === email)) || null;
}

export function persistUser(user: UserProfile) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function readPersistedUser(): UserProfile | null {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearPersistedUser() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_KEY);
}

export function enrichUserWithLocalProfile(user: UserProfile | null): UserProfile | null {
  if (!user) return null;
  const meta = getProfileMeta(user.id, user.email);
  if (!meta) return user;
  return {
    ...user,
    fullName: meta.fullName || user.fullName || user.username,
    profileImageId: meta.profileImageId || user.profileImageId,
    vendor: user.vendor
      ? {
          ...user.vendor,
          fullName: meta.fullName || user.vendor.fullName || user.username,
          profileImageId: meta.profileImageId || user.vendor.profileImageId,
          phone: meta.phone || user.vendor.phone,
          city: meta.city || user.vendor.city,
          storeName: meta.storeName || user.vendor.storeName,
        }
      : user.vendor,
    role: user.role,
  };
}
