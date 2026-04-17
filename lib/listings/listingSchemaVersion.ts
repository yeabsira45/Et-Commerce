/** Bump when persisted `details` shape / normalization rules change materially (migration / compatibility). */
export const LISTING_DETAILS_SCHEMA_VERSION = 1;

export const LISTING_DETAILS_SCHEMA_VERSION_KEY = "_listingDetailsSchemaVersion";

export function stampListingDetailsSchemaVersion(details: Record<string, string>): Record<string, string> {
  return { ...details, [LISTING_DETAILS_SCHEMA_VERSION_KEY]: String(LISTING_DETAILS_SCHEMA_VERSION) };
}

/** Strip internal metadata before UI or legacy consumers. */
export function stripListingDetailsSchemaVersion(details: Record<string, string>): Record<string, string> {
  const next = { ...details };
  delete next[LISTING_DETAILS_SCHEMA_VERSION_KEY];
  return next;
}
