import { coerceJsonToStringDetails } from "@/lib/listings/listingDetailsMerge";
import { normalizeListingDetailsPayload } from "@/lib/listings/listingPayloadNormalize";
import {
  LISTING_DETAILS_SCHEMA_VERSION,
  LISTING_DETAILS_SCHEMA_VERSION_KEY,
  stampListingDetailsSchemaVersion,
  stripListingDetailsSchemaVersion,
} from "@/lib/listings/listingSchemaVersion";

export function readListingDetailsSchemaVersion(flat: Record<string, string>): number | null {
  const raw = flat[LISTING_DETAILS_SCHEMA_VERSION_KEY];
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const n = Number(String(raw).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export type HydratedListingDetails = {
  /** Safe for API/UI; includes current schema version stamp when renormalized. */
  details: Record<string, string>;
  /** Stored version was missing or older than current engine version. */
  renormalized: boolean;
  /** Version read from storage before hydration (null if absent). */
  storedVersion: number | null;
};

/**
 * Read path: coerce legacy JSON, compare `_listingDetailsSchemaVersion`, re-run normalization if outdated.
 * Does not write to DB; callers may persist on next PATCH if desired.
 */
export function hydrateStoredListingDetails(
  category: string,
  subcategory: string | null | undefined,
  stored: unknown
): HydratedListingDetails {
  const loose = coerceJsonToStringDetails(stored);
  const storedVersion = readListingDetailsSchemaVersion(loose);
  if (storedVersion === LISTING_DETAILS_SCHEMA_VERSION) {
    return { details: loose, renormalized: false, storedVersion };
  }
  const withoutMeta = stripListingDetailsSchemaVersion(loose);
  const normalized = normalizeListingDetailsPayload(category, subcategory, withoutMeta);
  const next = normalized ?? withoutMeta;
  return {
    details: stampListingDetailsSchemaVersion(next),
    renormalized: true,
    storedVersion,
  };
}
