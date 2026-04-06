"use client";

import React, { useMemo, useState } from "react";
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
  const countries = useMemo(() => ["All Ethiopia", "Addis Ababa", "Oromia", "Amhara"], []);

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
            <CategoryHoverNav categories={categories} />
          </aside>

          <main className="mainCol">
            <div className="section">
              <h2>Recommended for you</h2>
              <div className="tileGrid">
                {[
                  "Security & Surveillance",
                  "Vehicle Parts & Accessories",
                  "Cars",
                  "Plumbing & Water Systems",
                  "Electrical Equipment",
                  "TV & Video Equipment",
                ].map((title) => (
                  <div key={title} className="tile">
                    <div className="tileImg" aria-hidden="true" />
                    <div className="tileBody">{title}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>Trending ads</h2>
              <div className="trendingRow">
                {["Wooden doors", "Parking sensors", "Realme phone"].map((title) => (
                  <div key={title} className="trendTile">
                    <div className="trendImg">
                      <div className="badge">3+ years on ET-Commerce</div>
                    </div>
                    <div className="tileBody">{title}</div>
                  </div>
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
