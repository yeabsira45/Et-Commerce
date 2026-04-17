"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/components/AppContext";
import { formatEtbPrice } from "@/lib/format";
import { getListingPricingLabel } from "@/lib/listingPricing";

type SavedListing = {
  id: string;
  title: string;
  price?: number | null;
  city: string;
  area: string;
  details?: Record<string, string>;
  images: { url: string }[];
};

function buildSummary(details?: Record<string, string>): string {
  if (!details) return "";
  const entries = Object.entries(details).filter(
    ([key, value]) =>
      key !== "Description" &&
      key !== "Price (ETB)" &&
      key !== "_listingDetailsSchemaVersion" &&
      String(value || "").trim() !== ""
  );
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" • ");
}

export default function SavedListingsPage() {
  const { user, savedItems, toggleSave } = useAppContext();
  const [navigatingListingId, setNavigatingListingId] = useState<string | null>(null);
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedIds = useMemo(() => savedItems.map((item) => item.id), [savedItems]);

  const loadSavedListings = useCallback(async () => {
    setError(null);
    if (user) {
      setLoading(true);
      try {
        const res = await fetch("/api/saved", { cache: "no-store" });
        if (!res.ok) {
          setListings([]);
          setError("We could not load your saved items right now. Please try again.");
          return;
        }
        const payload = (await res.json()) as { items?: SavedListing[] };
        setListings(Array.isArray(payload.items) ? payload.items : []);
      } catch {
        setListings([]);
        setError("We could not load your saved items right now. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (savedIds.length === 0) {
      setListings([]);
      return;
    }

    setListings(
      savedItems.map((item) => ({
        id: item.id,
        title: item.title,
        price: null,
        city: "",
        area: "",
        details: undefined,
        images: [],
      }))
    );
  }, [savedIds, savedItems, user]);

  useEffect(() => {
    void loadSavedListings();
  }, [loadSavedListings]);

  return (
    <div className="container pageGrid">
      <section className="searchSection">
        <h2 className="searchTitle">Saved items</h2>
        {loading ? (
          <div className="productGrid" style={{ marginTop: 16 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={`saved-skeleton-${index}`} className="productCard productCardSkeleton" aria-hidden="true">
                <div className="productImgWrapper productSkeletonBlock productSkeletonImage" />
                <div className="productBody">
                  <div className="productSkeletonLine productSkeletonLineLg" />
                  <div className="productSkeletonLine productSkeletonLineSm" />
                  <div className="productSkeletonLine" />
                  <div className="productSkeletonButton" />
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!loading && error ? (
          <div className="uiStateCard uiStateCardError" style={{ marginTop: 16 }}>
            <h3 className="uiStateTitle">Saved items unavailable</h3>
            <p className="uiStateText">{error}</p>
            <button className="uiStateAction" type="button" onClick={() => void loadSavedListings()}>
              Retry
            </button>
          </div>
        ) : null}
        {!loading && !error && listings.length === 0 ? (
          <div className="uiStateCard" style={{ marginTop: 16 }}>
            <h3 className="uiStateTitle">Nothing saved yet</h3>
            <p className="uiStateText">
              {user
                ? "Tap Save on any listing and it will show up here for quick access."
                : "Save interesting listings while browsing and they will appear here during this session."}
            </p>
          </div>
        ) : null}

        <div className="productGrid" style={{ marginTop: 16 }}>
          {listings.map((item) => {
            const imageUrl = item.images?.[0]?.url || "/errorpage.svg";
            const summary = buildSummary(item.details);
            const isNavigating = navigatingListingId === item.id;
            return (
              <article key={item.id} className={`productCard ${isNavigating ? "productCardPending" : ""}`}>
                {isNavigating ? (
                  <div className="productCardLoadingOverlay" aria-hidden="true">
                    <span className="productCardLoadingSpinner" />
                  </div>
                ) : null}
                <div className="productImgWrapper">
                  <Link href={`/item/${item.id}`} onClick={() => setNavigatingListingId(item.id)}>
                    <Image src={imageUrl} alt={item.title} width={400} height={320} className="productImg" />
                  </Link>
                </div>
                <div className="productBody">
                  <div className="productPrice">{formatEtbPrice(item.price)}</div>
                  {item.details ? (
                    <div className="productMeta">
                      <span className="productPricingBadge">{getListingPricingLabel(item.details)}</span>
                    </div>
                  ) : null}
                  <h3 className="productTitle">
                    <Link href={`/item/${item.id}`} onClick={() => setNavigatingListingId(item.id)}>
                      {item.title}
                    </Link>
                  </h3>
                  <div className="productMeta">
                    <span className="productLocation">
                      {[item.city, item.area].filter(Boolean).join(", ") || "Location unavailable"}
                    </span>
                  </div>
                  {summary ? <p className="modalSub">{summary}</p> : null}
                  <button type="button" className="itemSecondaryBtn" onClick={() => toggleSave({ id: item.id, title: item.title })}>
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
