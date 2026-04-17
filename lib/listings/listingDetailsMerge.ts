/**
 * Loose coercion for reads / legacy merge paths.
 * **Writes to Postgres** must use `parseStrictFlatListingDetails` + `listingWritePipeline` instead of merging unvalidated JSON.
 */
export function coerceJsonToStringDetails(json: unknown): Record<string, string> {
  if (json === null || json === undefined) return {};
  if (typeof json !== "object" || Array.isArray(json)) return {};
  const raw = json as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}

export function mergeJsonDetailsPatch(base: unknown, patch: unknown): Record<string, string> {
  return { ...coerceJsonToStringDetails(base), ...coerceJsonToStringDetails(patch) };
}
