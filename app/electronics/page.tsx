import { ListingSearch } from "@/components/ListingSearch";

const ALLOWED = new Set(["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"]);

export default function ElectronicsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const category = searchParams?.category && ALLOWED.has(searchParams.category) ? searchParams.category : undefined;

  return (
    <div className="container pageGrid">
      <ListingSearch title={category || "Electronics"} initialCategory={category} />
    </div>
  );
}
