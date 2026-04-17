/**
 * Central schema metadata for listing fields (extensible per category).
 * Validation implementations consume this + `LISTING_VALIDATION` for consistent messaging.
 */
import { LISTING_VALIDATION } from "@/lib/listingValidationMessages";
import { parseStorageString } from "@/lib/listings/storageFormat";

export type ElectronicsStorageRequirement = "internal" | "main" | "none";

export type ElectronicsSubFieldSchema = {
  /** Which built-in storage validation applies for this subcategory */
  storage: ElectronicsStorageRequirement;
  /** Laptop / desktop PC fields */
  pcCompute?: boolean;
};

export const ELECTRONICS_SUBCATEGORY_FIELD_SCHEMA: Record<string, ElectronicsSubFieldSchema> = {
  Smartphones: { storage: "internal" },
  "Feature Phones": { storage: "internal" },
  Tablets: { storage: "main" },
  Laptops: { storage: "main", pcCompute: true },
  "Desktop Computers": { storage: "main", pcCompute: true },
  "Computer Accessories": { storage: "none" },
};

export function getElectronicsSubSchema(subcategory: string): ElectronicsSubFieldSchema | undefined {
  return ELECTRONICS_SUBCATEGORY_FIELD_SCHEMA[subcategory];
}

function splitList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Electronics-only validation driven by schema + shared messages. */
export function validateElectronicsDetailsFromSchema(subcategory: string, details: Record<string, string>): string | null {
  const schema = getElectronicsSubSchema(subcategory);
  if (schema?.storage === "internal") {
    const numeric = (details["Internal Storage Value"] || parseStorageString(details["Internal Storage"]).value || "").trim();
    if (!numeric) return LISTING_VALIDATION.internalStorageRequired;
  }
  if (schema?.storage === "main") {
    const numeric = (details["Storage Value"] || parseStorageString(details["Storage"]).value || "").trim();
    if (!numeric) return LISTING_VALIDATION.storageRequired;
  }

  if (schema?.pcCompute) {
    const os = (details["Operating System"] || "").trim();
    if (!os) return LISTING_VALIDATION.operatingSystemRequired;
    if (os === "Other" && !(details["Computer OS Other"] || "").trim()) {
      return LISTING_VALIDATION.operatingSystemOtherRequired;
    }
    const gpuV = (details["GPU Vendor"] || "").trim();
    const legacyGpu = (details["Graphics (GPU)"] || "").trim();
    if (!gpuV && !legacyGpu) return LISTING_VALIDATION.gpuSelectionRequired;
    if (gpuV === "Other" && !(details["GPU Other Name"] || "").trim() && !legacyGpu) {
      return LISTING_VALIDATION.gpuOtherRequired;
    }
  }

  if (subcategory === "Computer Accessories" && splitList(details["Accessory Type"]).length === 0) {
    return LISTING_VALIDATION.computerAccessoryTypesRequired;
  }

  return null;
}
