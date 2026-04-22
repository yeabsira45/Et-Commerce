"use client";

import { ListingSearch } from "@/components/ListingSearch";

export default function SearchPage({
  searchParams,
}: {
  searchParams?: { category?: string; q?: string; subcategory?: string };
}) {
  const initialCategory = searchParams?.category?.trim() || undefined;
  const initialQuery = searchParams?.q?.trim() || undefined;
  const initialSubcategory = searchParams?.subcategory?.trim() || undefined;

  return (
    <div className="container pageGrid">
      <ListingSearch
        title="Search results"
        initialCategory={initialCategory}
        initialQuery={initialQuery}
        initialSubcategory={initialSubcategory}
      />
    </div>
  );
}
