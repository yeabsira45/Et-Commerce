"use client";

import { ListingSearch } from "@/components/ListingSearch";

export default function PhonesTabletsPage() {
  return (
    <div className="container pageGrid">
      <ListingSearch title="Mobile Devices" initialCategory="Mobile Devices" />
    </div>
  );
}
