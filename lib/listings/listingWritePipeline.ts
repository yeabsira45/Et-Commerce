/**
 * Single pipeline for persisting `Listing.details`: strict parse → normalize → schema version stamp.
 * All HTTP and future bulk writers should use these helpers instead of ad-hoc Prisma JSON.
 */
import { LISTING_DETAILS_SCHEMA_VERSION_KEY, stampListingDetailsSchemaVersion } from "@/lib/listings/listingSchemaVersion";
import { parseStrictFlatListingDetails, type StrictParseResult } from "@/lib/listings/listingDetailsStrict";
import { normalizeListingDetailsPayload } from "@/lib/listings/listingPayloadNormalize";

export type PersistableListingDetailsResult =
  | { ok: true; details: Record<string, string> }
  | { ok: false; error: string };

function stripSchemaMetaForNormalize(flat: Record<string, string>): Record<string, string> {
  const next = { ...flat };
  delete next[LISTING_DETAILS_SCHEMA_VERSION_KEY];
  return next;
}

/** Normalize + stamp (caller should validate `flat` before persist rules). */
export function normalizeAndStampListingDetailsForPersist(
  category: string,
  subcategory: string | null | undefined,
  flatDetails: Record<string, string>
): PersistableListingDetailsResult {
  const cleaned = stripSchemaMetaForNormalize(flatDetails);
  const n = normalizeListingDetailsPayload(category, subcategory, cleaned);
  if (n === null) {
    return { ok: false, error: "Invalid listing details payload." };
  }
  return { ok: true, details: stampListingDetailsSchemaVersion(n) };
}

export function buildPersistableListingDetailsFromRaw(
  category: string,
  subcategory: string | null | undefined,
  rawDetails: unknown
): PersistableListingDetailsResult {
  const parsed = parseStrictFlatListingDetails(rawDetails);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  return normalizeAndStampListingDetailsForPersist(category, subcategory, parsed.value);
}

export function mergeStrictListingDetails(
  base: unknown,
  patch: unknown
): StrictParseResult<Record<string, string>> {
  const b = parseStrictFlatListingDetails(base);
  if (!b.ok) return b;
  const p = parseStrictFlatListingDetails(patch);
  if (!p.ok) return p;
  return { ok: true, value: { ...b.value, ...p.value } };
}

export function buildPersistableMergedListingDetailsFromRaw(
  category: string,
  subcategory: string | null | undefined,
  existingDetails: unknown,
  patchDetails: unknown
): PersistableListingDetailsResult {
  const merged = mergeStrictListingDetails(existingDetails, patchDetails);
  if (!merged.ok) {
    return { ok: false, error: merged.error };
  }
  return normalizeAndStampListingDetailsForPersist(category, subcategory, merged.value);
}
