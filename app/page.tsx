"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { categories } from "@/components/categories";
import { CategoryHoverNav } from "@/components/CategoryHoverNav";
import { ListingSearch } from "@/components/ListingSearch";
import "./home.css";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const countries = useMemo(() => ["All Ethiopia", "Addis Ababa", "Oromia", "Amhara"], []);
  const categoriesWithLiveCounts = useMemo(
    () =>
      categories.map((cat) => {
        const count = categoryCounts[cat.name] ?? 0;
        const countLabel = `${count.toLocaleString()} ${count === 1 ? "ad" : "ads"}`;
        return { ...cat, count: countLabel };
      }),
    [categoryCounts]
  );
  const recommendedTabs = useMemo(
    () => [
      {
        label: "Security & Surveillance",
        href: "/search?category=Commercial%20Equipment&subcategory=Industrial%20Equipment&q=Security%20%26%20Surveillance",
      },
      {
        label: "Vehicle Parts & Accessories",
        href: "/search?category=Vehicles&subcategory=Vehicle%20Accessories&q=Vehicle%20Parts%20%26%20Accessories",
      },
      { label: "Cars", href: "/search?category=Vehicles&subcategory=Cars&q=Cars" },
      {
        label: "Plumbing & Water Systems",
        href: "/search?category=Construction%2C%20Machineries%20and%20Repairs&subcategory=Tools%20%26%20Equipment&q=Plumbing%20%26%20Water%20Systems",
      },
      {
        label: "Electrical Equipment",
        href: "/search?category=Construction%2C%20Machineries%20and%20Repairs&subcategory=Tools%20%26%20Equipment&q=Electrical%20Equipment",
      },
      {
        label: "TV & Video Equipment",
        href: "/search?category=TV%20%26%20Audio%20Systems&subcategory=Televisions&q=TV%20%26%20Video%20Equipment",
      },
    ],
    []
  );
  const trendingTabs = useMemo(
    () => [
      {
        label: "Wooden doors",
        href: "/search?category=Home%2C%20Furniture%20%26%20Appliances&subcategory=Home%20Decor&q=Wooden%20doors",
      },
      { label: "Parking sensors", href: "/search?category=Vehicles&subcategory=Vehicle%20Accessories&q=Parking%20sensors" },
      { label: "Realme phone", href: "/search?category=Mobile%20Devices&subcategory=Smartphones&q=Realme%20phone" },
    ],
    []
  );

  useEffect(() => {
    let alive = true;
    async function loadCategoryCounts() {
      try {
        const res = await fetch("/api/categories/counts");
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { counts?: Record<string, number> };
        if (!alive) return;
        setCategoryCounts(data.counts || {});
      } catch {
        // keep fallback static labels if request fails
      }
    }
    void loadCategoryCounts();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1 className="heroTitle">What are you looking for?</h1>
          <div className="searchRow">
            <div className="searchBar" role="search">
              <select className="select" aria-label="Location">
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="searchInput"
                placeholder="I am looking for..."
                aria-label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="searchGo" aria-label="Search">
                <SearchIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pageGrid">
        <div className="container contentGrid">
          <aside className="card categoryCard">
            <CategoryHoverNav categories={categoriesWithLiveCounts} />
          </aside>

          <main className="mainCol">
            <div className="section">
              <h2>Recommended for you</h2>
              <div className="tileGrid">
                {recommendedTabs.map((tab) => (
                  <Link key={tab.label} className="tile tileLink" href={tab.href}>
                    <div className="tileImg" aria-hidden="true" />
                    <div className="tileBody">{tab.label}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>Trending ads</h2>
              <div className="trendingRow">
                {trendingTabs.map((tab) => (
                  <Link key={tab.label} className="trendTile tileLink" href={tab.href}>
                    <div className="trendImg">
                      <div className="badge">3+ years on ET-Commerce</div>
                    </div>
                    <div className="tileBody">{tab.label}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="section">
              <ListingSearch title="Browse listings" query={search} onQueryChange={setSearch} />
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
