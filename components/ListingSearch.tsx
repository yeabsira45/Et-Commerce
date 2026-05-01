"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { categories } from "./categories";
import { formatEtbPrice, normalizePriceInput } from "@/lib/format";
import { getListingPricingLabel } from "@/lib/listingPricing";
import { BEAUTY_GENDER_OPTIONS, BEAUTY_SUBCATEGORIES, getBeautyBrands, getBeautyProductTypes } from "@/lib/beauty";
import { Avatar } from "@/components/Avatar";
import { useAppContext } from "@/components/AppContext";
import { useToast } from "@/components/ToastProvider";
import { SearchableSelect } from "@/components/form/SearchableSelect";

type Listing = {
  id: string;
  title: string;
  price?: number | null;
  city: string;
  area: string;
  condition: "NEW" | "USED";
  details?: Record<string, string>;
  images: { url: string }[];
  vendorId?: string | null;
  vendor?: {
    id?: string;
    userId?: string;
    slug?: string;
    storeName?: string;
    fullName?: string;
    phone?: string;
    city?: string;
    area?: string;
    profileImageUrl?: string;
  } | null;
};

type Props = {
  initialCategory?: string;
  initialQuery?: string;
  initialSubcategory?: string;
  title?: string;
  query?: string;
  onQueryChange?: (value: string) => void;
};

export function ListingSearch({ initialCategory, initialQuery, initialSubcategory, title, query, onQueryChange }: Props) {
  const { user, savedItems, toggleSave } = useAppContext();
  const showToast = useToast();
  const [navigatingListingId, setNavigatingListingId] = useState<string | null>(null);
  const [internalQuery, setInternalQuery] = useState(initialQuery || "");
  const [category, setCategory] = useState(initialCategory || "");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [fuels, setFuels] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState<string[]>([]);
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [beautySubcategory, setBeautySubcategory] = useState("");
  const [forcedSubcategory, setForcedSubcategory] = useState(initialSubcategory || "");
  const [beautyBrands, setBeautyBrands] = useState<string[]>([]);
  const [beautyTypes, setBeautyTypes] = useState<string[]>([]);
  const [beautyGenders, setBeautyGenders] = useState<string[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingAlert, setSavingAlert] = useState(false);

  // Autocomplete states
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<Array<{ id: string; title: string; category: string; subcategory: string }>>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query === undefined) {
      setInternalQuery(initialQuery || "");
    }
  }, [initialQuery, query]);

  useEffect(() => {
    setForcedSubcategory(initialSubcategory || "");
  }, [initialSubcategory]);

  const categorySelectOptions = useMemo(
    () => [{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.name, label: c.name }))],
    [],
  );

  const conditionSelectOptions = useMemo(
    () => [
      { value: "", label: "Any condition" },
      { value: "NEW", label: "New" },
      { value: "USED", label: "Used" },
    ],
    [],
  );

  const beautySubcategorySelectOptions = useMemo(
    () => [{ value: "", label: "All beauty types" }, ...BEAUTY_SUBCATEGORIES.map((item) => ({ value: item, label: item }))],
    [],
  );

  const hasActiveFilters = Boolean(
    category ||
      priceMin ||
      priceMax ||
      location ||
      condition ||
      brands.length ||
      fuels.length ||
      transmissions.length ||
      jobTypes.length ||
      bedrooms.length ||
      sizeMin ||
      sizeMax ||
      salaryMin ||
      salaryMax ||
      beautySubcategory ||
      beautyBrands.length ||
      beautyTypes.length ||
      beautyGenders.length
  );

  // Autocomplete effect with debounce
  useEffect(() => {
    if (autocompleteQuery.length < 1) {
      setAutocompleteResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        const response = await fetch(`/api/listings/autocomplete?q=${encodeURIComponent(autocompleteQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setAutocompleteResults(data);
          setShowDropdown(data.length > 0);
        } else {
          setAutocompleteResults([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error("Autocomplete fetch error:", error);
        setAutocompleteResults([]);
        setShowDropdown(false);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [autocompleteQuery]);

  // Click outside to hide dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteWrapRef.current && !autocompleteWrapRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    const effectiveQuery = (query !== undefined ? query : internalQuery).trim();
    if (category) params.set("category", category);
    if (effectiveQuery) params.set("q", effectiveQuery);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (location) params.set("location", location);
    if (condition) params.set("condition", condition);
    if (brands.length) params.set("brands", brands.join(","));
    if (fuels.length) params.set("fuels", fuels.join(","));
    if (transmissions.length) params.set("transmissions", transmissions.join(","));
    if (jobTypes.length) params.set("jobTypes", jobTypes.join(","));
    if (bedrooms.length) params.set("bedrooms", bedrooms.join(","));
    if (sizeMin) params.set("sizeMin", sizeMin);
    if (sizeMax) params.set("sizeMax", sizeMax);
    if (salaryMin) params.set("salaryMin", salaryMin);
    if (salaryMax) params.set("salaryMax", salaryMax);
    if (beautySubcategory) params.set("beautySubcategory", beautySubcategory);
    if (forcedSubcategory) params.set("subcategory", forcedSubcategory);
    if (beautyBrands.length) params.set("beautyBrands", beautyBrands.join(","));
    if (beautyTypes.length) params.set("beautyTypes", beautyTypes.join(","));
    if (beautyGenders.length) params.set("beautyGenders", beautyGenders.join(","));

    try {
      const res = await fetch(`/api/listings/search?${params.toString()}`);
      if (!res.ok) {
        setResults([]);
        setError("We could not load listings right now. Please try again.");
        return;
      }
      const data = await res.json();
      setResults(data.listings || []);
    } catch {
      setResults([]);
      setError("We could not load listings right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    beautyBrands,
    beautyGenders,
    beautySubcategory,
    forcedSubcategory,
    beautyTypes,
    bedrooms,
    brands,
    category,
    condition,
    fuels,
    jobTypes,
    location,
    priceMax,
    priceMin,
    salaryMax,
    salaryMin,
    sizeMax,
    sizeMin,
    transmissions,
    query,
    internalQuery,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      runSearch();
    }, 250);
    return () => clearTimeout(t);
  }, [runSearch]);

  useEffect(() => {
    setBrands([]);
    setFuels([]);
    setTransmissions([]);
    setJobTypes([]);
    setBedrooms([]);
    setSizeMin("");
    setSizeMax("");
    setSalaryMin("");
    setSalaryMax("");
    setBeautySubcategory("");
    setBeautyBrands([]);
    setBeautyTypes([]);
    setBeautyGenders([]);
  }, [category]);

  const activeQuery = query !== undefined ? query : internalQuery;

  const buildSavedSearchPayload = useCallback(() => {
    const payload: Record<string, string | number> = {};
    const effectiveQuery = (query !== undefined ? query : internalQuery).trim();
    if (effectiveQuery) payload.q = effectiveQuery;
    if (category) payload.category = category;
    if (forcedSubcategory) payload.subcategory = forcedSubcategory;
    if (location) payload.location = location;
    if (condition) payload.condition = condition;
    if (priceMin) payload.priceMin = Number(priceMin.replace(/[^\d.]/g, ""));
    if (priceMax) payload.priceMax = Number(priceMax.replace(/[^\d.]/g, ""));
    return payload;
  }, [category, condition, forcedSubcategory, internalQuery, location, priceMax, priceMin, query]);

  const saveCurrentSearchAlert = useCallback(async () => {
    if (!user) {
      showToast("Sign in to save search alerts.", "warning");
      return;
    }
    setSavingAlert(true);
    try {
      const queryPayload = buildSavedSearchPayload();
      const hasAnyFilter = Object.keys(queryPayload).length > 0;
      if (!hasAnyFilter) {
        showToast("Add at least one filter before saving an alert.", "warning");
        return;
      }
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category ? `${category} alert` : "Saved alert",
          query: queryPayload,
        }),
      });
      if (!res.ok) {
        showToast("Could not save alert. Please retry.", "warning");
        return;
      }
      showToast("Search alert saved. You'll be notified on matching new listings.", "success");
    } catch {
      showToast("Could not save alert. Please retry.", "warning");
    } finally {
      setSavingAlert(false);
    }
  }, [buildSavedSearchPayload, category, showToast, user]);

  const filtered = results.filter((item) =>
    item.title.toLowerCase().includes(activeQuery.trim().toLowerCase())
  );

  return (
    <section className="searchSection">
      {title ? <h2 className="searchTitle">{title}</h2> : null}
      <div className="searchFilters searchFiltersPrimary">
        <div ref={autocompleteWrapRef} className="searchAutocompleteWrap">
          <input
            ref={inputRef}
            className="searchInput"
            placeholder="Search listings..."
            value={activeQuery}
            onChange={(e) => {
              const value = e.target.value;
              if (onQueryChange) {
                onQueryChange(value);
              } else {
                setInternalQuery(value);
              }
              setAutocompleteQuery(value);
              if (value.length === 0) {
                setShowDropdown(false);
              }
            }}
          />
          {showDropdown && (
            <div className="autocompleteDropdown">
              {autocompleteLoading ? (
                <div className="autocompleteItem">Searching...</div>
              ) : (
                autocompleteResults.map((item) => (
                  <div
                    key={item.id}
                    className="autocompleteItem"
                    onClick={() => {
                      router.push(`/item/${item.id}`);
                      setShowDropdown(false);
                    }}
                  >
                    <div className="autocompleteTitle">{item.title}</div>
                    <div className="autocompleteCategory">{item.category} - {item.subcategory}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="searchListingSelect">
          <SearchableSelect label="Category" value={category} placeholder="All categories" options={categorySelectOptions} onChange={setCategory} />
        </div>
        <input
          className="searchInput"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="searchInput"
          placeholder="Min price"
          value={priceMin}
          onChange={(e) => setPriceMin(normalizePriceInput(e.target.value))}
        />
        <input
          className="searchInput"
          placeholder="Max price"
          value={priceMax}
          onChange={(e) => setPriceMax(normalizePriceInput(e.target.value))}
        />
        <button className="searchGo searchActionBtn" type="button" onClick={runSearch}>
          Search
        </button>
        <button className="itemSecondaryBtn searchActionBtn searchAlertBtn" type="button" onClick={() => void saveCurrentSearchAlert()} disabled={savingAlert}>
          {savingAlert ? "Saving..." : "Save Alert"}
        </button>
      </div>
      {category === "Vehicles" ? (
        <div className="searchFilters" style={{ marginTop: 10 }}>
          <MultiToggle label="Fuel" options={["Petrol", "Diesel", "Hybrid", "Electric"]} values={fuels} onChange={setFuels} />
          <MultiToggle label="Transmission" options={["Automatic", "Manual", "CVT"]} values={transmissions} onChange={setTransmissions} />
        </div>
      ) : null}
      {category === "Jobs & Employment" || category === "Job Seekers (CVs)" ? (
        <div className="searchFilters" style={{ marginTop: 10 }}>
          <MultiToggle label="Job Type" options={["Full-Time", "Part-Time", "Remote", "Contract", "Internship"]} values={jobTypes} onChange={setJobTypes} />
          <input className="searchInput" placeholder="Min salary" value={salaryMin} onChange={(e) => setSalaryMin(normalizePriceInput(e.target.value))} />
          <input className="searchInput" placeholder="Max salary" value={salaryMax} onChange={(e) => setSalaryMax(normalizePriceInput(e.target.value))} />
        </div>
      ) : null}
      {category === "Real Estate" ? (
        <div className="searchFilters" style={{ marginTop: 10 }}>
          <MultiToggle label="Bedrooms" options={["1", "2", "3", "4", "5+"]} values={bedrooms} onChange={setBedrooms} />
          <input className="searchInput" placeholder="Min size (sqm)" value={sizeMin} onChange={(e) => setSizeMin(normalizePriceInput(e.target.value))} />
          <input className="searchInput" placeholder="Max size (sqm)" value={sizeMax} onChange={(e) => setSizeMax(normalizePriceInput(e.target.value))} />
        </div>
      ) : null}
      {["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"].includes(category) ? (
        <div className="searchFilters" style={{ marginTop: 10 }}>
          <MultiToggle label="Brand" options={["Apple", "Samsung", "Xiaomi", "Lenovo", "HP", "Dell", "Sony", "LG", "Tecno", "Infinix"]} values={brands} onChange={setBrands} />
          <div className="searchListingSelect">
            <SearchableSelect label="Condition" value={condition} placeholder="Any condition" options={conditionSelectOptions} onChange={setCondition} />
          </div>
        </div>
      ) : null}
      {category === "Beauty & Personal Care" ? (
        <div className="searchFilters" style={{ marginTop: 10 }}>
          <div className="searchListingSelect">
            <SearchableSelect
              label="Beauty type"
              value={beautySubcategory}
              placeholder="All beauty types"
              options={beautySubcategorySelectOptions}
              onChange={(value) => {
                setBeautySubcategory(value);
                setBeautyBrands([]);
                setBeautyTypes([]);
              }}
            />
          </div>
          <MultiToggle label="Brand" options={getBeautyBrands(beautySubcategory || "Skincare").filter((item) => item !== "Other")} values={beautyBrands} onChange={setBeautyBrands} />
          <MultiToggle label="Product Type" options={getBeautyProductTypes(beautySubcategory || "Skincare").filter((item) => item !== "Other")} values={beautyTypes} onChange={setBeautyTypes} />
          <MultiToggle label="Gender" options={BEAUTY_GENDER_OPTIONS} values={beautyGenders} onChange={setBeautyGenders} />
        </div>
      ) : null}

      <div className="productGrid" style={{ marginTop: 16 }}>
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <article key={`search-skeleton-${index}`} className="productCard productCardSkeleton" aria-hidden="true">
                <div className="productImgWrapper productSkeletonBlock productSkeletonImage" />
                <div className="productBody">
                  <div className="productSkeletonLine productSkeletonLineLg" />
                  <div className="productSkeletonLine productSkeletonLineSm" />
                  <div className="productSkeletonLine" />
                  <div className="productSkeletonLine productSkeletonLineSm" />
                  <div className="productSkeletonButton" />
                </div>
              </article>
            ))
          : null}
        {!loading && error ? (
          <div className="uiStateCard uiStateCardError">
            <h3 className="uiStateTitle">Search unavailable</h3>
            <p className="uiStateText">{error}</p>
            <button className="uiStateAction" type="button" onClick={() => void runSearch()}>
              Retry search
            </button>
          </div>
        ) : null}
        {!loading && !error && filtered.length === 0 ? (
          <div className="uiStateCard">
            <h3 className="uiStateTitle">{hasActiveFilters || activeQuery.trim() ? "No listings matched" : "No listings yet"}</h3>
            <p className="uiStateText">
              {hasActiveFilters || activeQuery.trim()
                ? "Try widening your filters, changing the location, or using a shorter search phrase."
                : "Listings will appear here as sellers start posting in this category."}
            </p>
          </div>
        ) : null}
        {filtered.map((item) => {
          const imageUrl = item.images?.[0]?.url || "/errorpage.svg";
          const vendorName =
            item.vendor?.storeName || item.vendor?.fullName || "Marketplace Vendor";
          const vendorProfileHref = item.vendor?.slug ? `/vendor/${item.vendor.slug}` : null;
          const vendorImageUrl = item.vendor?.profileImageUrl || null;
          const isSaved = savedItems.some((saved) => saved.id === item.id);
          const isNavigating = navigatingListingId === item.id;
          return (
            <article key={item.id} className={`productCard ${isNavigating ? "productCardPending" : ""}`}>
              {isNavigating ? (
                <div className="productCardLoadingOverlay" aria-hidden="true">
                  <span className="productCardLoadingSpinner" />
                </div>
              ) : null}
              <Link href={`/item/${item.id}`} className="productCardLink" onClick={() => setNavigatingListingId(item.id)}>
                <div className="productImgWrapper">
                  <ListingCardImage src={imageUrl} alt={item.title} />
                </div>
                <div className="productBody">
                  <div className="productPrice">{formatEtbPrice(item.price)}</div>
                  <div className="productMeta">
                    <span className="productPricingBadge">{getListingPricingLabel(item.details)}</span>
                  </div>
                  <h3 className="productTitle">
                    {item.title}
                  </h3>
                  <div className="productVendorRow">
                    {vendorProfileHref ? (
                      <span
                        className="productVendorLink"
                        role="link"
                        tabIndex={0}
                        aria-label={`View ${vendorName} profile`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void router.push(vendorProfileHref);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            void router.push(vendorProfileHref);
                          }
                        }}
                      >
                        <Avatar name={vendorName} imageUrl={vendorImageUrl} size={34} className="productVendorAvatar" />
                        <span className="productVendorName">{vendorName}</span>
                      </span>
                    ) : (
                      <div className="productVendorLink">
                        <Avatar name={vendorName} imageUrl={vendorImageUrl} size={34} className="productVendorAvatar" />
                        <span className="productVendorName">{vendorName}</span>
                      </div>
                    )}
                  </div>
                  <div className="productMeta">
                    <span className="productLocation">
                      {item.city}, {item.area}
                    </span>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                className="itemSecondaryBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  const wasSaved = isSaved;
                  toggleSave({ id: item.id, title: item.title });
                  showToast(wasSaved ? "Removed from bookmarks." : "Saved to bookmarks.", "success");
                }}
              >
                {isSaved ? "Saved" : "Save"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ListingCardImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`productImageFrame ${loaded ? "isLoaded" : ""}`}>
      {!loaded ? <span className="productImageSkeleton" aria-hidden="true" /> : null}
      <Image src={src} alt={alt} width={400} height={320} className="productImg" onLoad={() => setLoaded(true)} />
    </div>
  );
}

function MultiToggle({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <div className="searchTitle" style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={active ? "modalPrimary" : "modalSecondary"}
              onClick={() =>
                onChange(active ? values.filter((value) => value !== option) : [...values, option])
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
