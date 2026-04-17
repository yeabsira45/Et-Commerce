/**
 * Unified listing “engine” facade: validation, normalization, detection prefill, and undo helpers.
 *
 * **Persistence policy:** any write to `Listing.details` in Postgres must go through
 * `listingWritePipeline` (`buildPersistable*` / `normalizeAndStampListingDetailsForPersist`) so
 * strict parsing, normalization, and `_listingDetailsSchemaVersion` stay consistent. Do not pass
 * raw request JSON into Prisma for `details`.
 */
export { normalizeListingDetailsPayload } from "@/lib/listings/listingPayloadNormalize";
export { finalizeListingDetailsForSubmit } from "@/lib/listings/finalizeListingDetails";
export {
  validateListingDetailsForPublish,
  validateRealEstateResidentialDetails,
} from "@/lib/listings/listingValidation";
export { coerceJsonToStringDetails, mergeJsonDetailsPatch } from "@/lib/listings/listingDetailsMerge";
export { parseStrictFlatListingDetails } from "@/lib/listings/listingDetailsStrict";
export type { StrictParseResult } from "@/lib/listings/listingDetailsStrict";
export {
  LISTING_DETAILS_SCHEMA_VERSION,
  LISTING_DETAILS_SCHEMA_VERSION_KEY,
  stampListingDetailsSchemaVersion,
  stripListingDetailsSchemaVersion,
} from "@/lib/listings/listingSchemaVersion";
export {
  buildPersistableListingDetailsFromRaw,
  buildPersistableMergedListingDetailsFromRaw,
  mergeStrictListingDetails,
  normalizeAndStampListingDetailsForPersist,
} from "@/lib/listings/listingWritePipeline";
export type { PersistableListingDetailsResult } from "@/lib/listings/listingWritePipeline";
export { runListingDetectionPrefill } from "@/lib/listings/listingDetectionService";
export type { ListingDetectionPrefillRequest, ListingDetectionPrefillOutcome } from "@/lib/listings/listingDetectionService";
export {
  pushListingUndoFrame,
  peekListingUndoFrame,
  popListingUndoFrame,
  discardTopListingUndoFrame,
  clearListingUndoStack,
  parseUndoDraftJson,
  type ListingUndoFrame,
  type ListingUndoReason,
} from "@/lib/listings/listingUndoStack";
export {
  runAtomicListingFormReset,
  type AtomicListingFormResetHandlers,
} from "@/lib/listings/listingCategoryReset";
export { logListingAudit } from "@/lib/listings/listingAuditLog";
export { LISTING_DETAILS_PERSISTENCE_IS_FLAT_ONLY } from "@/lib/listings/listingDetailsSchemaPolicy";
export { mergeDetectionRespectingUserEditedKeys } from "@/lib/listings/listingDetectionGuards";
export { hydrateStoredListingDetails, readListingDetailsSchemaVersion } from "@/lib/listings/listingDetailsHydrate";
export {
  listingRepositoryCreate,
  listingRepositoryPatchListing,
  prepareListingDetailsForCreate,
  prepareListingDetailsForPatch,
  ListingPersistError,
} from "@/lib/listings/listingRepository";

import { buildPersistableMergedListingDetailsFromRaw } from "@/lib/listings/listingWritePipeline";

/** @deprecated Prefer `buildPersistableMergedListingDetailsFromRaw` (strict merge + stamp). */
export function normalizeMergedListingDetailsForPersist(
  category: string,
  subcategory: string | null | undefined,
  existingDetails: unknown,
  patchDetails: unknown
): Record<string, string> | undefined {
  const r = buildPersistableMergedListingDetailsFromRaw(category, subcategory, existingDetails, patchDetails);
  return r.ok ? r.details : undefined;
}
