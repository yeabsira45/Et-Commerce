/**
 * Persisted `Listing.details` is intentionally a **flat string map** (Prisma JSON object of scalars).
 * Nested objects/arrays are rejected at write time via `parseStrictFlatListingDetails`.
 *
 * For list-like data (features, accessories), use comma-separated strings or prefixed keys
 * (e.g. `Feature 1`, `Accessory Type`) unless a future version introduces an allowlisted nested shape.
 */
export const LISTING_DETAILS_PERSISTENCE_IS_FLAT_ONLY = true as const;
