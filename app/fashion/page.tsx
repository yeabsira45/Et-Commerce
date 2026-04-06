"use client";

import { ListingSearch } from "@/components/ListingSearch";

export default function FashionPage() {
  return (
    <div className="container pageGrid">
      <ListingSearch title="Clothing & Fashion" initialCategory="Clothing & Fashion" />
    </div>
  );
}
