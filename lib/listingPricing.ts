/** Display label for listing pricing (Fixed vs Negotiable). Supports legacy detail keys. */
export function getListingPricingLabel(details: Record<string, string | undefined> | null | undefined): string {
  const d = details || {};
  if (d.pricing_type === "Negotiable") return "Negotiable";
  if (d.pricing_type === "Fixed") return "Fixed";
  if (d["Price Type"] === "Negotiable") return "Negotiable";
  if (d["Negotiable?"] === "Yes") return "Negotiable";
  if (d["Price Type"] === "Fixed Price") return "Fixed";
  return "Fixed";
}
