/** Whether Battery Health (%) applies for the current mobile listing row. */
export function brandShowsBatteryHealthForMobile(details: Record<string, string>): boolean {
  const brand = details["Brand"] || "";
  const custom = (details["Custom Brand"] || "").toLowerCase();
  const model = (details["Model"] || "").toLowerCase();
  const customModel = (details["Custom Model"] || "").toLowerCase();
  const brandLower = brand.toLowerCase();
  if (brand === "Apple") return true;
  return (
    brandLower.includes("apple") ||
    brandLower.includes("iphone") ||
    custom.includes("apple") ||
    custom.includes("iphone") ||
    model.includes("iphone") ||
    customModel.includes("iphone")
  );
}
