export function formatPriceValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.]/g, ""));

  if (!Number.isFinite(numeric)) return String(value);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
  }).format(numeric);
}

export function formatEtbPrice(value: string | number | null | undefined) {
  const formatted = formatPriceValue(value);
  return formatted ? `ETB ${formatted}` : "Negotiable";
}

export function normalizePriceInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const [whole, decimal] = cleaned.split(".");
  const formattedWhole = formatPriceValue(whole);
  return decimal !== undefined ? `${formattedWhole}.${decimal.slice(0, 2)}` : formattedWhole;
}
