"use client";

import type { UserProfile, VendorProfile } from "@/components/AppContext";

export type StoredVendorAccount = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  password: string;
  storeName: string;
  slug: string;
  city: string;
  subcity: string;
  area?: string;
  phone: string;
  avatarId?: string;
  role: "vendor";
  createdAt: number;
};

const VENDORS_KEY = "vendors";

function isBrowser() {
  return typeof window !== "undefined";
}

function readVendors(): StoredVendorAccount[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(VENDORS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeVendors(vendors: StoredVendorAccount[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function deriveStoreName(fullName: string, storeName?: string) {
  const trimmed = storeName?.trim();
  if (trimmed) return trimmed;
  return `${fullName.trim()}'s Store`;
}

function nextUniqueSlug(baseName: string, vendors: StoredVendorAccount[]) {
  const base = slugify(baseName) || "vendor";
  const existing = new Set(vendors.map((item) => item.slug));
  if (!existing.has(base)) return base;
  let index = 1;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

export function createLocalVendorAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  storeName?: string;
  city: string;
  subcity: string;
  area?: string;
  phone: string;
  avatarId?: string;
}) {
  const vendors = readVendors();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = payload.phone.trim();

  if (vendors.some((item) => item.email === normalizedEmail)) {
    throw new Error("Email already exists");
  }
  if (vendors.some((item) => item.phone === normalizedPhone)) {
    throw new Error("Phone number already exists");
  }

  const id = Date.now().toString();
  const userId = `local-user-${id}`;
  const storeName = deriveStoreName(payload.fullName, payload.storeName);
  const slug = nextUniqueSlug(storeName, vendors);

  const vendor: StoredVendorAccount = {
    id: `local-vendor-${id}`,
    userId,
    fullName: payload.fullName.trim(),
    email: normalizedEmail,
    password: payload.password,
    storeName,
    slug,
    city: payload.city,
    subcity: payload.subcity,
    area: payload.area?.trim() || "",
    phone: normalizedPhone,
    avatarId: payload.avatarId,
    role: "vendor",
    createdAt: Date.now(),
  };

  vendors.push(vendor);
  writeVendors(vendors);
  return vendor;
}

export function findLocalVendorAccount(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  return readVendors().find(
    (item) =>
      (
        item.email === normalizedIdentifier ||
        item.phone.toLowerCase() === normalizedIdentifier ||
        item.fullName.trim().toLowerCase() === normalizedIdentifier
      ) &&
      item.password === password
  ) || null;
}

export function updateLocalVendorAvatar(userId: string, avatarId?: string) {
  const vendors = readVendors();
  const nextVendors = vendors.map((vendor) =>
    vendor.userId === userId ? { ...vendor, avatarId } : vendor
  );
  writeVendors(nextVendors);
}

export function toUserProfile(vendor: StoredVendorAccount): UserProfile {
  const vendorProfile: VendorProfile = {
    id: vendor.id,
    storeName: vendor.storeName,
    slug: vendor.slug,
    city: vendor.city,
    area: vendor.subcity,
    street: vendor.area || "",
    phone: vendor.phone,
    fullName: vendor.fullName,
    profileImageId: vendor.avatarId,
  };

  return {
    id: vendor.userId,
    username: vendor.fullName,
    email: vendor.email,
    role: "VENDOR",
    fullName: vendor.fullName,
    profileImageId: vendor.avatarId,
    vendor: vendorProfile,
  };
}
