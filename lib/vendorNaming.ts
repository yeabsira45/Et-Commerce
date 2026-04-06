import { prisma } from "@/lib/prisma";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function deriveStoreName(fullName: string, storeName?: string | null) {
  const trimmedStoreName = storeName?.trim();
  if (trimmedStoreName) return trimmedStoreName;
  const trimmedFullName = fullName.trim();
  return trimmedFullName ? `${trimmedFullName}'s Store` : "Vendor Store";
}

export async function uniqueVendorSlug(baseInput: string, currentUserId?: string) {
  const base = slugify(baseInput) || `vendor-${Date.now()}`;
  let candidate = base;
  let counter = 0;

  while (
    await prisma.vendor.findFirst({
      where: {
        slug: candidate,
        ...(currentUserId ? { NOT: { userId: currentUserId } } : {}),
      },
    })
  ) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}

export async function uniqueUsername(baseInput: string, currentUserId?: string) {
  const base = baseInput.trim() || `vendor-${Date.now()}`;
  let candidate = base;
  let counter = 0;

  while (
    await prisma.user.findFirst({
      where: {
        username: candidate,
        ...(currentUserId ? { NOT: { id: currentUserId } } : {}),
      },
    })
  ) {
    counter += 1;
    candidate = `${base} ${counter}`;
  }

  return candidate;
}
