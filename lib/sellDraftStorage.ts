/** Fields persisted in localStorage as `sellDraft` — no unknown/legacy keys. */
export type StorableSellDraft = {
  title: string;
  category: string;
  city: string;
  area: string;
  subcity?: string;
  subcategory?: string;
  images: string[];
  constructionItem?: string;
  detectedHints?: {
    brand?: string;
    model?: string;
    constructionItem?: string;
  };
};

function sanitizeHints(raw: unknown): StorableSellDraft["detectedHints"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const h = raw as Record<string, unknown>;
  return {
    brand: typeof h.brand === "string" ? h.brand : undefined,
    model: typeof h.model === "string" ? h.model : undefined,
    constructionItem: typeof h.constructionItem === "string" ? h.constructionItem : undefined,
  };
}

/** Strip any extra keys from parsed JSON so stale attributes never round-trip. */
export function normalizeSellDraftForStorage(input: Partial<StorableSellDraft> | null | undefined): StorableSellDraft {
  if (!input || typeof input !== "object") {
    return {
      title: "",
      category: "",
      city: "",
      area: "",
      images: [],
    };
  }
  return {
    title: typeof input.title === "string" ? input.title : "",
    category: typeof input.category === "string" ? input.category : "",
    city: typeof input.city === "string" ? input.city : "",
    area: typeof input.area === "string" ? input.area : "",
    subcity: typeof input.subcity === "string" ? input.subcity : undefined,
    subcategory: typeof input.subcategory === "string" ? input.subcategory : undefined,
    images: Array.isArray(input.images) ? input.images.filter((x): x is string => typeof x === "string") : [],
    constructionItem: typeof input.constructionItem === "string" ? input.constructionItem : undefined,
    detectedHints: sanitizeHints(input.detectedHints),
  };
}
