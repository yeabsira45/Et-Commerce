/**
 * **Single Prisma entry point** for listing rows that include `details`.
 * Do not call `prisma.listing.create` / `update` with raw `details` JSON elsewhere.
 */
import type { $Enums } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logListingAudit } from "@/lib/listings/listingAuditLog";
import {
  mergeStrictListingDetails,
  normalizeAndStampListingDetailsForPersist,
} from "@/lib/listings/listingWritePipeline";
import { parseStrictFlatListingDetails } from "@/lib/listings/listingDetailsStrict";
import { validateListingDetailsForPublish } from "@/lib/listings/listingValidation";

export class ListingPersistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingPersistError";
  }
}

export type ListingDetailsPrepResult =
  | { ok: true; details: Record<string, string> }
  | { ok: false; error: string };

export function prepareListingDetailsForCreate(
  category: string,
  subcategory: string | null | undefined,
  rawDetails: unknown,
  description: string
): ListingDetailsPrepResult {
  const parsed = parseStrictFlatListingDetails(rawDetails);
  if (!parsed.ok) return parsed;
  const publishError = validateListingDetailsForPublish(category, subcategory, parsed.value, description);
  if (publishError) return { ok: false, error: publishError };
  return normalizeAndStampListingDetailsForPersist(category, subcategory, parsed.value);
}

/**
 * Validates optional patch **before** merge, then merges + validates full merged row + normalizes.
 */
export function prepareListingDetailsForPatch(args: {
  existingDetails: unknown;
  patchDetails: unknown | undefined;
  category: string;
  subcategory: string | null | undefined;
  descriptionForValidation: string;
}): ListingDetailsPrepResult {
  if (args.patchDetails !== undefined) {
    const patchOnly = parseStrictFlatListingDetails(args.patchDetails);
    if (!patchOnly.ok) return patchOnly;
  }
  const merged = mergeStrictListingDetails(
    args.existingDetails,
    args.patchDetails !== undefined ? args.patchDetails : {}
  );
  if (!merged.ok) return { ok: false, error: merged.error };
  const publishError = validateListingDetailsForPublish(
    args.category,
    args.subcategory,
    merged.value,
    args.descriptionForValidation
  );
  if (publishError) return { ok: false, error: publishError };
  return normalizeAndStampListingDetailsForPersist(args.category, args.subcategory, merged.value);
}

export type ListingCreateRepositoryArgs = {
  title: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  price: number | null;
  condition: $Enums.ListingCondition;
  city: string;
  area: string;
  vendorId: string;
  ownerId: string;
  rawDetails: unknown;
  images: { uploadId: string; sortOrder: number }[];
};

export async function listingRepositoryCreate(args: ListingCreateRepositoryArgs) {
  const prep = prepareListingDetailsForCreate(
    args.category,
    args.subcategory,
    args.rawDetails,
    String(args.description ?? "")
  );
  if (!prep.ok) throw new ListingPersistError(prep.error);
  logListingAudit("listing.repository.create", { category: args.category, title: args.title });
  return prisma.listing.create({
    data: {
      title: args.title,
      category: args.category,
      subcategory: args.subcategory,
      description: args.description,
      price: args.price ?? undefined,
      condition: args.condition,
      city: args.city,
      area: args.area,
      details: prep.details,
      vendorId: args.vendorId,
      ownerId: args.ownerId,
      images: { create: args.images },
    },
    include: { images: true, vendor: true },
  });
}

export type ListingPatchRepositoryArgs = {
  id: string;
  existing: {
    category: string;
    subcategory: string | null;
    description: string | null;
    details: unknown;
  };
  title?: string;
  description?: string | null;
  price?: number;
  status?: $Enums.ListingStatus;
  condition?: $Enums.ListingCondition;
  category?: string;
  subcategory?: string | null;
  rawDetailsPatch?: unknown;
};

export async function listingRepositoryPatchListing(args: ListingPatchRepositoryArgs) {
  const {
    id,
    existing,
    title,
    description,
    price,
    status,
    condition,
    category: nextCategoryArg,
    subcategory: nextSubArg,
    rawDetailsPatch,
  } = args;

  const nextCategory = nextCategoryArg ?? existing.category;
  const nextSubcategory = nextSubArg !== undefined ? nextSubArg : existing.subcategory;

  const touchesDetailsShape =
    rawDetailsPatch !== undefined || nextCategoryArg !== undefined || nextSubArg !== undefined;

  let normalizedDetails: Record<string, string> | undefined;
  if (touchesDetailsShape) {
    const descForValidation =
      description !== undefined ? String(description ?? "") : (existing.description ?? "") || "";
    const prep = prepareListingDetailsForPatch({
      existingDetails: existing.details,
      patchDetails: rawDetailsPatch,
      category: nextCategory,
      subcategory: nextSubcategory,
      descriptionForValidation: descForValidation,
    });
    if (!prep.ok) throw new ListingPersistError(prep.error);
    normalizedDetails = prep.details;
  }

  logListingAudit("listing.repository.patch", { id, touchesDetails: touchesDetailsShape });

  return prisma.listing.update({
    where: { id },
    data: {
      title: title ?? undefined,
      description: description === undefined ? undefined : description,
      price: price !== undefined ? (Number.isNaN(price) ? undefined : price) : undefined,
      status: status ?? undefined,
      condition: condition ?? undefined,
      category: nextCategoryArg ?? undefined,
      subcategory: nextSubArg === undefined ? undefined : nextSubArg,
      details: touchesDetailsShape ? normalizedDetails : undefined,
    },
    include: { images: true, vendor: true },
  });
}
