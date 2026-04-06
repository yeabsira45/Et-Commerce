"use client";

import { ListingSearch } from "@/components/ListingSearch";

export default function PropertyPage() {
  return (
    <div className="container pageGrid">
      <ListingSearch title="Real Estate" initialCategory="Real Estate" />
    </div>
  );
}
