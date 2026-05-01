type SavedSearchQuery = {
  q?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  condition?: "NEW" | "USED";
  priceMin?: number;
  priceMax?: number;
};

type ListingCandidate = {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  city: string;
  area: string;
  condition: "NEW" | "USED";
  price: number | null;
  createdAt: Date;
};

export function normalizeSavedSearchQuery(input: unknown): SavedSearchQuery {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const obj = input as Record<string, unknown>;
  const cleanText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const parseNum = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const condition = cleanText(obj.condition);
  return {
    q: cleanText(obj.q) || undefined,
    category: cleanText(obj.category) || undefined,
    subcategory: cleanText(obj.subcategory) || undefined,
    location: cleanText(obj.location) || undefined,
    condition: condition === "NEW" ? "NEW" : condition === "USED" ? "USED" : undefined,
    priceMin: parseNum(obj.priceMin),
    priceMax: parseNum(obj.priceMax),
  };
}

export function matchesSavedSearchQuery(listing: ListingCandidate, query: SavedSearchQuery): boolean {
  if (query.category && listing.category !== query.category) return false;
  if (query.subcategory && listing.subcategory !== query.subcategory) return false;
  if (query.condition && listing.condition !== query.condition) return false;
  if (query.priceMin !== undefined && (listing.price === null || listing.price < query.priceMin)) return false;
  if (query.priceMax !== undefined && (listing.price === null || listing.price > query.priceMax)) return false;
  if (query.location) {
    const locationNeedle = query.location.toLowerCase();
    const where = `${listing.city} ${listing.area}`.toLowerCase();
    if (!where.includes(locationNeedle)) return false;
  }
  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = `${listing.title} ${listing.description || ""} ${listing.category} ${listing.subcategory || ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}
