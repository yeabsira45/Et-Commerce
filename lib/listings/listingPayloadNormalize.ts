import { finalizeListingDetailsForSubmit } from "@/lib/listings/finalizeListingDetails";
import { LISTING_DETAILS_SCHEMA_VERSION_KEY } from "@/lib/listings/listingSchemaVersion";

/** Coerce unknown JSON `details` into a normalized string map for persistence. */
export function normalizeListingDetailsPayload(
  category: string,
  subcategory: string | null | undefined,
  details: unknown
): Record<string, string> | null {
  if (details === null || details === undefined) return null;
  if (typeof details !== "object" || Array.isArray(details)) return null;
  const raw = details as Record<string, unknown>;
  const stringMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === LISTING_DETAILS_SCHEMA_VERSION_KEY) continue;
    if (v === undefined || v === null) continue;
    stringMap[k] = String(v);
  }
  return finalizeListingDetailsForSubmit(stringMap, category, subcategory || "");
}
