import {
  applyElectronicsNormalizationForSubmit,
  clampBatteryHealthPercent,
  stripSimCountIfNotPhone,
} from "@/lib/listings/electronicsListingProcessor";

/**
 * Final server-ready `details` object for listing create/update.
 * Shared by the sell UI and API normalization.
 */
export function finalizeListingDetailsForSubmit(
  details: Record<string, string>,
  category: string,
  subcategory: string
): Record<string, string> {
  const next = { ...details };
  if (!next.pricing_type || String(next.pricing_type).trim() === "") {
    if (next["Price Type"] === "Negotiable" || next["Negotiable?"] === "Yes") next.pricing_type = "Negotiable";
    else next.pricing_type = "Fixed";
  }
  delete next["Price Type"];
  delete next["Negotiable?"];

  if (category === "Real Estate") {
    delete next["Delivery Available"];
    delete next["Delivery Charged"];
    delete next["Delivery Charge"];
    if (subcategory === "Apartment or House for Sale") {
      next["Listing Type"] = "For Sale";
    }
    if (subcategory === "Apartment or House for Rent") {
      next["Listing Type"] = "For Rent";
    }
    if (next["Listing Type"] !== "For Rent") {
      delete next["Minimum Rental Period"];
    }
  }

  applyElectronicsNormalizationForSubmit(next, category, subcategory);

  if (category === "Vehicles" && (subcategory === "Cars" || subcategory === "SUVs & Crossovers")) {
    if (!next.Seats || String(next.Seats).trim() === "") next.Seats = "5";
  }

  clampBatteryHealthPercent(next);
  stripSimCountIfNotPhone(next, subcategory);

  return next;
}
