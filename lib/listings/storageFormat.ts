export function parseStorageString(value?: string): { value: string; unit: string } {
  const trimmed = (value || "").trim();
  if (!trimmed) return { value: "", unit: "" };
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)?$/);
  if (!match) return { value: "", unit: "" };
  return { value: match[1] || "", unit: match[2] || "" };
}

export function applyStorageFormatting(next: Record<string, string>, baseLabel: "Internal Storage" | "Storage") {
  const valueKey = `${baseLabel} Value`;
  const unitKey = `${baseLabel} Unit`;
  const numeric = (next[valueKey] || "").trim();
  let unit = (next[unitKey] || "").trim().toUpperCase();
  if (unit !== "TB") unit = "GB";
  next[unitKey] = unit;

  if (numeric) {
    next[baseLabel] = `${numeric} ${unit}`;
  } else if (!numeric && next[baseLabel]) {
    const parsed = parseStorageString(next[baseLabel]);
    const u = (parsed.unit || "").toUpperCase() === "TB" ? "TB" : "GB";
    next[baseLabel] = parsed.value && parsed.unit ? `${parsed.value} ${u}` : next[baseLabel];
  }
}
