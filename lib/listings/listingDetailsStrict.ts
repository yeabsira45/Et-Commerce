/**
 * Strict JSON → flat string map for listing `details` writes.
 * Rejects arrays, non-objects, and nested structures (objects/arrays as values).
 */
export type StrictParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseStrictFlatListingDetails(input: unknown): StrictParseResult<Record<string, string>> {
  if (input === null || input === undefined) {
    return { ok: true, value: {} };
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Listing details must be a JSON object." };
  }
  const raw = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string" || k.trim() === "") {
      return { ok: false, error: "Listing details contains an invalid field name." };
    }
    if (v === undefined) continue;
    if (v === null) {
      out[k] = "";
      continue;
    }
    if (typeof v === "object") {
      return { ok: false, error: `Listing details must be flat strings: invalid value for "${k}".` };
    }
    out[k] = String(v);
  }
  return { ok: true, value: out };
}
