import { ListingSearch } from "@/components/ListingSearch";

const ALLOWED = new Set(["Jobs & Employment", "Job Seekers (CVs)"]);

export default function JobsSeekingWorkCvsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const category = searchParams?.category && ALLOWED.has(searchParams.category) ? searchParams.category : "Jobs & Employment";

  return (
    <div className="container pageGrid">
      <ListingSearch title={category} initialCategory={category} />
    </div>
  );
}
