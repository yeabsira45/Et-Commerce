"use client";

import { ListingSearch } from "@/components/ListingSearch";

export default function VehiclesPage() {
  return (
    <div className="container pageGrid">
      <ListingSearch title="Vehicles" initialCategory="Vehicles" />
    </div>
  );
}
