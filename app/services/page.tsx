import { ListingSearch } from "@/components/ListingSearch";
import { CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY } from "@/lib/categories";

const ALLOWED = new Set(["Services", CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Construction & Repair"]);

export default function ServicesPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const raw = searchParams?.category;
  const category =
    raw && ALLOWED.has(raw)
      ? raw === "Construction & Repair"
        ? CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY
        : raw
      : "Services";

  return (
    <div className="container pageGrid">
      <ListingSearch title={category} initialCategory={category} />
    </div>
  );
}
