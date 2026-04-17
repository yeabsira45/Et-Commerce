"use client";

import { useCallback, useMemo, useRef } from "react";
import type { StorableSellDraft } from "@/lib/sellDraftStorage";
import type { ListingDetectionModelDeps } from "@/lib/listings/listingDetectionPrefill";
import {
  clearListingUndoStack,
  discardTopListingUndoFrame,
  finalizeListingDetailsForSubmit,
  peekListingUndoFrame,
  popListingUndoFrame,
  pushListingUndoFrame,
  runListingDetectionPrefill,
  validateListingDetailsForPublish,
} from "@/lib/listings/listingEngine";

/**
 * Thin client hook around listing engine primitives (detection, validation, finalize, undo).
 * Optional: migrate sell/edit screens to this to keep component code smaller and usage consistent.
 */
export function useListingFormEngine(deps: ListingDetectionModelDeps) {
  const detectionAppliedTokenRef = useRef("");

  const setDetectionAppliedToken = useCallback((token: string) => {
    detectionAppliedTokenRef.current = token;
  }, []);

  const runDetectionPrefill = useCallback(
    (input: { draft: StorableSellDraft | null; subCategory: string; previousDetails: Record<string, string> }) => {
      return runListingDetectionPrefill(
        { ...input, appliedToken: detectionAppliedTokenRef.current },
        deps
      );
    },
    [deps]
  );

  return useMemo(
    () => ({
      runDetectionPrefill,
      setDetectionAppliedToken,
      validateForPublish: validateListingDetailsForPublish,
      finalizeForSubmit: finalizeListingDetailsForSubmit,
      pushUndo: pushListingUndoFrame,
      popUndo: popListingUndoFrame,
      peekUndo: peekListingUndoFrame,
      discardUndoTop: discardTopListingUndoFrame,
      clearUndoStack: clearListingUndoStack,
    }),
    [runDetectionPrefill, setDetectionAppliedToken]
  );
}
