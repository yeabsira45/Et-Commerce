/**
 * Title / category detection → structured field hints (pure functions).
 *
 * Reuse anywhere you have a draft-shaped object + current `details` map:
 * - Sell flow (create): see `app/sell/details/page.tsx`
 * - Edit listing (future): same call with `draft` built from API listing + stored `detectedHints` if you add them
 * - Server-side batch jobs: import `runListingDetectionPrefill` from `@/lib/listings/listingDetectionService` (no React)
 */
import type { StorableSellDraft } from "@/lib/sellDraftStorage";
import {
  buildListingDetectionPrefillToken,
  mergeDetectedHintsIntoListingDetails,
  shouldApplyListingDetectionPrefill,
  type ListingDetectionModelDeps,
} from "@/lib/listings/listingDetectionPrefill";

/**
 * Stateless “AI / title detection prefill” runner: no React dependency.
 * UI passes the last applied token so the same hints are not merged repeatedly.
 */
export type ListingDetectionPrefillRequest = {
  draft: StorableSellDraft | null;
  subCategory: string;
  previousDetails: Record<string, string>;
  appliedToken: string;
};

export type ListingDetectionPrefillOutcome =
  | { kind: "skip" }
  | { kind: "apply"; token: string; details: Record<string, string> };

export function runListingDetectionPrefill(
  req: ListingDetectionPrefillRequest,
  deps: ListingDetectionModelDeps
): ListingDetectionPrefillOutcome {
  const { draft, subCategory, previousDetails, appliedToken } = req;
  if (!shouldApplyListingDetectionPrefill(draft, subCategory)) {
    return { kind: "skip" };
  }
  const token = buildListingDetectionPrefillToken(draft, subCategory);
  if (token === appliedToken) {
    return { kind: "skip" };
  }
  const hints = draft.detectedHints;
  const details = mergeDetectedHintsIntoListingDetails(
    previousDetails,
    {
      category: draft.category,
      subcategory: subCategory,
      hints,
      constructionItem: draft.constructionItem,
      isElectronicsCategory: Boolean(
        ["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"].includes(draft.category)
      ),
    },
    deps
  );
  return { kind: "apply", token, details };
}
