import { ListingSearch } from "@/components/ListingSearch";

export default function PropertiesPage() {
  return (
    <div className="container pageGrid">
      <ListingSearch title="Real Estate" initialCategory="Real Estate" />
    </div>
  );
}
