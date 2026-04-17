import type { MutableRefObject } from "react";

export type AtomicListingFormResetHandlers = {
  setDetails: (value: Record<string, string>) => void;
  setPrice: (value: string) => void;
  setDescription: (value: string) => void;
  setCondition: (value: "NEW" | "USED") => void;
  setSubmitError: (value: string) => void;
  setSubmitSuccess: (value: string) => void;
  clearDetectionPrefillToken: () => void;
};

/**
 * Single entry point: clears all listing form slices used on the sell/details step
 * (details, summary inputs, submit noise, detection prefill token).
 */
export function runAtomicListingFormReset(h: AtomicListingFormResetHandlers) {
  h.clearDetectionPrefillToken();
  h.setSubmitError("");
  h.setSubmitSuccess("");
  h.setDetails({});
  h.setPrice("");
  h.setDescription("");
  h.setCondition("USED");
}

export type DetectionPrefillTokenRef = MutableRefObject<string>;
