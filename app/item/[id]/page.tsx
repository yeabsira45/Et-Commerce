"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "@/components/AppContext";
import { AuthModal } from "@/components/AuthModal";
import { useToast } from "@/components/ToastProvider";
import { formatEtbPrice } from "@/lib/format";
import { getListingPricingLabel } from "@/lib/listingPricing";
import { LISTING_DETAILS_SCHEMA_VERSION_KEY } from "@/lib/listings/listingSchemaVersion";
import { Avatar } from "@/components/Avatar";

type Listing = {
  id: string;
  title: string;
  price?: number | null;
  city: string;
  area: string;
  description?: string | null;
  category?: string;
  subcategory?: string | null;
  details?: Record<string, string>;
  images: { url: string }[];
  vendor?: {
    storeName: string;
    phone: string;
    city: string;
    area: string;
    street?: string | null;
    slug?: string;
    userId?: string;
    fullName?: string;
    profileImageUrl?: string;
  };
  vendorRating?: number;
  vendorReviewCount?: number;
};

type Spec = {
  label: string;
  value: string;
  icon: SpecIconKind;
};

type SpecIconKind =
  | "tag"
  | "layers"
  | "spark"
  | "ram"
  | "storage"
  | "monitor"
  | "shield"
  | "battery"
  | "clock"
  | "camera"
  | "palette"
  | "grid"
  | "sliders"
  | "signal"
  | "plug"
  | "chip"
  | "gpu"
  | "car"
  | "calendar"
  | "wand"
  | "door"
  | "seat"
  | "engine"
  | "horse"
  | "road"
  | "fuel"
  | "gear"
  | "speed"
  | "map"
  | "id"
  | "document"
  | "sofa"
  | "truck"
  | "coins"
  | "handshake"
  | "phone"
  | "tv"
  | "laptop"
  | "dot";

export default function ItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { startChat, user, savedItems, toggleSave } = useAppContext();
  const showToast = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const lightboxCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const lightboxContentRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        const res = await fetch(`/api/listings/${params.id}`);
        if (!res.ok) {
          setListing(null);
          setLoadError(res.status === 404 ? "This listing is no longer available." : "We could not load this listing right now.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setListing(data.listing);
        setContactRevealed(false);
        setActiveImageIndex(0);
      } catch {
        setListing(null);
        setLoadError("We could not load this listing right now.");
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleShare() {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: listing?.title || "ET-Commerce listing",
      text: listing ? `${listing.title} in ${listing.city}, ${listing.area}` : "Check out this listing on ET-Commerce.",
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast("Listing link copied.", "success");
    } catch {
      showToast("We could not share this listing right now.", "error");
    }
  }

  const sellerMeta = useMemo(() => {
    if (!listing?.vendor) return null;
    const v = listing.vendor;
    const backendPhone = (v.phone || "").trim();
    return {
      fullName: v.fullName || v.storeName || "Vendor",
      profileImageUrl: v.profileImageUrl,
      storeName: v.storeName || "Vendor Store",
      city: (v.city || "").trim() || listing.city,
      phone: backendPhone,
    };
  }, [listing]);

  /** Must run every render — never after an early return (Rules of Hooks). */
  useEffect(() => {
    if (!fullscreenOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFullscreenOpen(false);
        return;
      }
      if (e.key === "Tab" && lightboxContentRef.current) {
        const focusable = lightboxContentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (!listing) return;
      const n = listing.images?.length ? listing.images.length : 1;
      if (n <= 1) return;
      if (e.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev + 1) % n);
      } else if (e.key === "ArrowLeft") {
        setActiveImageIndex((prev) => (prev - 1 + n) % n);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreenOpen, listing]);

  useEffect(() => {
    if (!fullscreenOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      lightboxCloseBtnRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [fullscreenOpen]);

  if (loading) {
    return (
      <div className="container pageLoader" role="status" aria-live="polite" aria-label="Loading listing">
        <div className="pageLoaderCard pageLoaderCardWide">
          <div className="pageLoaderSpinner" aria-hidden="true" />
          <div className="pageLoaderText">Loading listing details...</div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container pageGrid">
        <div className="uiStateCard uiStateCardError">
          <h1 className="uiStateTitle">Listing unavailable</h1>
          <p className="uiStateText">{loadError || "This item could not be found."}</p>
          <div className="uiStateActions">
            <button type="button" className="uiStateAction" onClick={() => router.refresh()}>
              Retry
            </button>
            <button type="button" className="uiStateAction uiStateActionSecondary" onClick={() => router.back()}>
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = listing.images?.[0]?.url || "/errorpage.svg";
  const galleryImages = listing.images?.length ? listing.images : [{ url: "/errorpage.svg" }];
  const safeImageIndex = Math.min(activeImageIndex, galleryImages.length - 1);
  const activeImageUrl = galleryImages[safeImageIndex]?.url || imageUrl;
  const specs = buildSpecs(listing);
  const sellerLabel = sellerMeta?.storeName || listing.vendor?.storeName || "Vendor";
  const sellerRating = `${(listing.vendorRating ?? 0).toFixed(1)} (${listing.vendorReviewCount ?? 0} reviews)`;
  const sellerProfileHref = listing.vendor?.slug ? `/vendor/${listing.vendor.slug}` : null;
  const sellerPhone = sellerMeta?.phone?.trim() || listing.vendor?.phone?.trim() || "";
  const isSaved = savedItems.some((item) => item.id === listing.id);

  function handleShowContact() {
    if (!user) {
      showToast("You must login or register first to contact this seller.", "warning");
      setAuthOpen(true);
      return;
    }
    if (!sellerPhone) {
      showToast("This vendor has not added a phone number yet.", "error");
      return;
    }
    if (!contactRevealed) {
      setContactRevealed(true);
      return;
    }
    window.location.href = `tel:${sellerPhone.replace(/\s+/g, "")}`;
  }

  function goToNextImage() {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  }

  function goToPreviousImage() {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }

  return (
    <div className="itemPage">
      <div className="container itemLayout">
        <div className="itemGallery">
          <div className="itemMainImage">
            <button
              type="button"
              className="itemMainImageTrigger"
              onClick={() => setFullscreenOpen(true)}
              aria-label="View image fullscreen"
            >
              <Image src={activeImageUrl} alt={listing.title} width={640} height={480} priority />
            </button>
            <button
              type="button"
              className="itemFullscreenBtn"
              onClick={() => setFullscreenOpen(true)}
              aria-label="View fullscreen"
            >
              View fullscreen
            </button>
          </div>
          {galleryImages.length > 1 ? (
            <div className="itemThumbRow">
              {galleryImages.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  className={`itemThumbBtn ${idx === safeImageIndex ? "isActive" : ""}`}
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`View image ${idx + 1}`}
                >
                  <Image src={img.url} alt={`${listing.title} ${idx + 1}`} width={120} height={90} className="itemThumbImg" />
                </button>
              ))}
            </div>
          ) : null}
          <h1 className="itemTitle">{listing.title}</h1>
          <div className="itemLocation">
            {listing.city}, {listing.area}
          </div>
          {listing.description ? <p>{listing.description}</p> : null}
          {specs.length > 0 ? (
            <div className="itemSpecs">
              <h3>Item specifications</h3>
              <ul>
                {specs.map((spec) => (
                  <li key={spec.label}>
                    <span className="itemSpecIcon" aria-hidden="true">
                      <SpecIcon kind={spec.icon} />
                    </span>
                    <span>
                      <strong>{spec.label}:</strong> {spec.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="itemSafety">
            <h3>Safety tips</h3>
            <ul>
              <li>Avoid paying in advance, even for delivery</li>
              <li>Meet with the seller at a safe public place</li>
              <li>Inspect the item and ensure it&apos;s exactly what you want</li>
              <li>Make sure that the packed item is the one you&apos;ve inspected</li>
              <li>Only pay if you&apos;re satisfied</li>
              <li>Contact admin@commerceet.com for any suspicious item/vendor</li>
            </ul>
          </div>
        </div>

        <aside className="itemSidebar">
          <div className="itemSidebarSection">
            {sellerProfileHref ? (
              <Link href={sellerProfileHref} className="itemSellerRow itemSellerLink">
                <Avatar name={sellerMeta?.fullName || sellerLabel} imageUrl={sellerMeta?.profileImageUrl} size={44} className="itemSellerAvatarImg" />
                <div className="itemSellerMeta">
                  <div className="itemSellerName">{sellerLabel}</div>
                  <div className="itemSellerRating">{sellerRating}</div>
                </div>
              </Link>
            ) : (
              <div className="itemSellerRow">
                <Avatar name={sellerMeta?.fullName || sellerLabel} imageUrl={sellerMeta?.profileImageUrl} size={44} className="itemSellerAvatarImg" />
                <div className="itemSellerMeta">
                  <div className="itemSellerName">{sellerLabel}</div>
                  <div className="itemSellerRating">{sellerRating}</div>
                </div>
              </div>
            )}
            <div className="itemPrice">{formatEtbPrice(listing.price)}</div>
            <div className="itemPricingType">{getListingPricingLabel(listing.details)}</div>
          </div>

          <div className="itemSidebarSection itemSidebarActions">
            <button
              className="itemSecondaryBtn"
              type="button"
              onClick={() => {
                const wasSaved = isSaved;
                toggleSave({ id: listing.id, title: listing.title });
                showToast(wasSaved ? "Removed from bookmarks." : "Saved to bookmarks.", "success");
              }}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
            <button className="itemSecondaryBtn" type="button" onClick={() => void handleShare()}>
              Share
            </button>
            <button
              className="itemPrimaryBtn"
              type="button"
              onClick={handleShowContact}
            >
              {contactRevealed && sellerPhone ? `Call ${sellerPhone}` : "Contact seller"}
            </button>
            {!user ? <p className="itemSidebarHint">Sign in to contact the seller.</p> : null}
            {contactRevealed ? (
              <div className="itemContactInline itemContactInlineProminent">
                <Avatar name={sellerMeta?.fullName || sellerLabel} imageUrl={sellerMeta?.profileImageUrl} size={54} />
                <div className="itemContactCopy itemContactCopyProminent">
                  <strong className="itemContactName">{sellerMeta?.fullName || sellerLabel}</strong>
                  <span className="itemContactLine">Store: {sellerMeta?.storeName || sellerLabel}</span>
                  <span className="itemContactLine">City: {sellerMeta?.city || listing.vendor?.city || listing.city}</span>
                  {sellerPhone ? (
                    <a className="itemContactPhone" href={`tel:${sellerPhone.replace(/\s+/g, "")}`}>
                      Phone: {sellerPhone}
                    </a>
                  ) : (
                    <span className="itemContactLine">Phone: not provided</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="itemChatBox itemSidebarSection">
            <textarea
              className="itemChatInput"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, is this still available?"
            />
            <button
              className="itemPrimaryBtn itemChatPrimaryBtn"
              type="button"
              onClick={async () => {
                if (!user) {
                  showToast("You must login or register first to contact this seller.", "warning");
                  setAuthOpen(true);
                  return;
                }
                const conversationId = await startChat(listing.id, message || "Hi, is this still available?");
                if (!conversationId) {
                  showToast("We could not start the conversation. Please try again.", "error");
                  return;
                }
                router.push(`/messages?conversation=${conversationId}`);
              }}
            >
              Message seller
            </button>
            <button
              className="itemSecondaryBtn"
              type="button"
              onClick={async () => {
                if (!user) {
                  showToast("You must login or register first to report a listing.", "warning");
                  setAuthOpen(true);
                  return;
                }
                const reason = window.prompt("Why are you reporting this listing?");
                if (!reason) return;
                setReporting(true);
                const response = await fetch("/api/reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ targetType: "listing", targetId: listing.id, reason }),
                });
                setReporting(false);
                if (!response.ok) {
                  const payload = (await response.json().catch(() => ({}))) as { error?: string };
                  showToast(payload.error || "Could not submit your report. Please try again.", "error");
                  return;
                }
                showToast("Report submitted.", "success");
              }}
              disabled={reporting}
            >
              {reporting ? "Reporting..." : "Report listing"}
            </button>
            {listing.vendor?.slug ? (
              <Link className="itemSecondaryBtn itemCenteredBtn" href={`/vendor/${listing.vendor.slug}`}>
                View Vendor&apos;s Profile
              </Link>
            ) : null}
          </div>
        </aside>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {fullscreenOpen ? (
        <div className="itemLightbox" role="dialog" aria-modal="true" aria-label="Fullscreen listing image">
          <button type="button" className="itemLightboxBackdrop" onClick={() => setFullscreenOpen(false)} aria-label="Close fullscreen image" />
          <div className="itemLightboxContent" ref={lightboxContentRef}>
            <button ref={lightboxCloseBtnRef} type="button" className="itemLightboxClose" onClick={() => setFullscreenOpen(false)} aria-label="Close">
              ×
            </button>
            {galleryImages.length > 1 ? (
              <button type="button" className="itemLightboxNav itemLightboxPrev" onClick={goToPreviousImage} aria-label="Previous image">
                ‹
              </button>
            ) : null}
            <div className="itemLightboxImageWrap">
              <Image src={activeImageUrl} alt={listing.title} width={1400} height={1000} className="itemLightboxImage" />
              <div className="itemLightboxWatermark" aria-hidden="true">
                {Array.from({ length: 30 }).map((_, idx) => (
                  <span key={`wm-full-${idx}`}>ET-Commerce</span>
                ))}
              </div>
            </div>
            {galleryImages.length > 1 ? (
              <button type="button" className="itemLightboxNav itemLightboxNext" onClick={goToNextImage} aria-label="Next image">
                ›
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildSpecs(listing: Listing): Spec[] {
  const details = { ...(listing.details || {}) } as Record<string, string>;
  if (details.Brand === "Other" && details["Custom Brand"]) {
    details.Brand = details["Custom Brand"];
  }
  if (details["Product Type"] === "Other" && details["Custom Product Type"]) {
    details["Product Type"] = details["Custom Product Type"];
  }

  const excluded = new Set([
    "Description",
    "Price (ETB)",
    "Custom Brand",
    "Custom Product Type",
    "Internal Storage Value",
    "Internal Storage Unit",
    "Storage Value",
    "Storage Unit",
    "GPU Vendor",
    "GPU Other Name",
    "Computer OS Other",
    "pricing_type",
    "Price Type",
    "Negotiable?",
    LISTING_DETAILS_SCHEMA_VERSION_KEY,
  ]);
  const entries = Object.entries(details).filter(
    ([key, value]) => !excluded.has(key) && value !== undefined && value !== null && String(value).trim() !== ""
  );
  if (entries.length === 0) return [];

  const category = listing.category || "";
  const subcategory = listing.subcategory || "";
  const orderByCategory: Record<string, string[]> = {
    Vehicles: ["Vehicle Make", "Model", "Year of Manufacture", "Trim", "Body Type", "Seats", "Engine Size (cc)", "Horsepower (hp)", "Drivetrain", "Fuel Type", "Transmission", "Top Speed", "Mileage", "Plate Number", "Registration status", "Color", "Interior Color", "Condition"],
    Electronics: [],
  };

  const orderBySubcategory: Record<string, string[]> = {
    Smartphones: ["Brand", "Model", "Condition", "RAM", "Internal Storage", "Screen Size", "Operating System", "Battery Capacity (mAh)", "Main Camera", "Selfie Camera", "Color"],
    "Feature Phones": ["Brand", "Model", "Condition", "RAM", "Internal Storage", "Screen Size", "Operating System", "Battery Capacity (mAh)", "Main Camera", "Selfie Camera", "Color"],
    Televisions: ["Brand", "Model", "Type", "Screen Size", "Display Tech", "Resolution", "Smart TV", "HDMI Ports"],
    Laptops: ["Brand", "Model", "Processor (CPU)", "Graphics (GPU)", "RAM", "Storage", "Screen Size", "Operating System", "Battery Capacity (mAh)", "Condition"],
    "Desktop Computers": ["Brand", "Model", "Processor (CPU)", "Graphics (GPU)", "RAM", "Storage", "Motherboard", "Power Supply (PSU)", "Case Type", "Operating System", "Condition"],
    Radio: ["Brand", "Model", "Type", "Connectivity", "Condition"],
  };

  const orderedKeys = new Set<string>();
  const ordered: Spec[] = [];

  const addKey = (key: string) => {
    const value = details[key];
    if (!String(value || "").trim()) return;
    orderedKeys.add(key);
    ordered.push({ label: key, value: String(value), icon: iconForSpec(key, category, subcategory) });
  };

  (orderByCategory[category] || []).forEach(addKey);
  (orderBySubcategory[subcategory] || []).forEach(addKey);
  entries.forEach(([key, value]) => {
    if (!orderedKeys.has(key)) ordered.push({ label: key, value: String(value), icon: iconForSpec(key, category, subcategory) });
  });

  return ordered;
}

function iconForSpec(label: string, category: string, subcategory: string): SpecIconKind {
  const iconMap: Record<string, SpecIconKind> = {
    Brand: "tag", Model: "layers", Condition: "spark", RAM: "ram", "Internal Storage": "storage", Storage: "storage", "Screen Size": "monitor", "Operating System": "shield", "Battery Capacity (mAh)": "battery", "Battery Life": "clock", "Main Camera": "camera", "Selfie Camera": "camera", Color: "palette", Resolution: "grid", Type: "sliders", "Display Tech": "signal", "Smart TV": "signal", "HDMI Ports": "plug", "Processor (CPU)": "chip", "Graphics (GPU)": "gpu", "Vehicle Make": "car", "Year of Manufacture": "calendar", Trim: "wand", "Body Type": "door", Seats: "seat", "Engine Size (cc)": "engine", "Horsepower (hp)": "horse", Drivetrain: "road", "Fuel Type": "fuel", Transmission: "gear", "Top Speed": "speed", Mileage: "map", "Plate Number": "id", "Registration status": "document", "Interior Color": "sofa", Delivery: "truck", "Delivery Charge": "coins", Negotiable: "handshake",
  };
  if (iconMap[label]) return iconMap[label];
  if (subcategory === "Smartphones" || subcategory === "Feature Phones") return "phone";
  if (subcategory === "Televisions") return "tv";
  if (subcategory === "Laptops") return "laptop";
  if (category === "Vehicles" || subcategory === "Cars") return "car";
  return "dot";
}

function SpecIcon({ kind }: { kind: SpecIconKind }) {
  const common = { viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "tag": return <svg {...common}><path d="M20 13 11 22 2 13V4h9l9 9Z" /><path d="M7 8h.01" /></svg>;
    case "layers": return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 11 8 4 8-4" /><path d="m4 15 8 4 8-4" /></svg>;
    case "spark": return <svg {...common}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /></svg>;
    case "ram": return <svg {...common}><rect x="4" y="7" width="16" height="10" rx="2" /><path d="M8 7v10M12 7v10M16 7v10M6 17v2M10 17v2M14 17v2M18 17v2" /></svg>;
    case "storage": return <svg {...common}><path d="M5 6h14v12H5z" /><path d="M8 10h8M8 14h5" /></svg>;
    case "monitor": return <svg {...common}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;
    case "shield": return <svg {...common}><path d="M12 3 5 6v5c0 5 3.4 8.4 7 10 3.6-1.6 7-5 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7L14.8 10" /></svg>;
    case "battery": return <svg {...common}><rect x="3" y="7" width="16" height="10" rx="2" /><path d="M21 10v4" /><path d="M7 10h5v4H7z" fill="currentColor" stroke="none" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>;
    case "camera": return <svg {...common}><path d="M4 8h4l2-2h4l2 2h4v10H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
    case "palette": return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M8.5 10.5h.01M15.5 10.5h.01M10 15h.01M14 16a2 2 0 0 0 0-4h-1" /></svg>;
    case "grid": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M10 4v16" /></svg>;
    case "sliders": return <svg {...common}><path d="M4 7h16M4 17h16M8 7v6M16 11v6" /></svg>;
    case "signal": return <svg {...common}><path d="M4 18a8 8 0 0 1 16 0" /><path d="M7 18a5 5 0 0 1 10 0" /><path d="M10 18a2 2 0 0 1 4 0" /></svg>;
    case "plug": return <svg {...common}><path d="M9 7v5M15 7v5M7 12h10" /><path d="M12 12v5a3 3 0 0 0 3 3" /></svg>;
    case "chip": return <svg {...common}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 15h4M1 9h4M1 15h4" /></svg>;
    case "gpu": return <svg {...common}><rect x="3" y="7" width="18" height="10" rx="2" /><circle cx="9" cy="12" r="2.5" /><path d="M16 10h2M16 14h2" /></svg>;
    case "car": return <svg {...common}><path d="M5 16 7 9h10l2 7" /><path d="M3 16h18" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>;
    case "calendar": return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
    case "wand": return <svg {...common}><path d="m4 20 8-8" /><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></svg>;
    case "door": return <svg {...common}><path d="M6 21V4l10-2v19" /><path d="M10 12h.01" /></svg>;
    case "seat": return <svg {...common}><path d="M8 6v6a3 3 0 0 0 3 3h5" /><path d="M7 14v4M16 15v3M5 18h14" /></svg>;
    case "engine": return <svg {...common}><path d="M4 10h10l2-2h4v8h-4l-2-2H4z" /><path d="M8 10v6" /></svg>;
    case "horse": return <svg {...common}><path d="M8 18v-4l2-2 2 1 3-2 2 2v5" /><path d="M9 8h4l2 3" /></svg>;
    case "road": return <svg {...common}><path d="M9 3 6 21" /><path d="M15 3 18 21" /><path d="M12 7v2M12 13v2M12 19v2" /></svg>;
    case "fuel": return <svg {...common}><path d="M6 20V6a2 2 0 0 1 2-2h5v16H6Z" /><path d="M13 8h2l3 3v6a2 2 0 0 1-4 0v-2" /></svg>;
    case "gear": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>;
    case "speed": return <svg {...common}><path d="M5 17a7 7 0 1 1 14 0" /><path d="m12 12 4-2" /></svg>;
    case "map": return <svg {...common}><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "id": return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 10h4M13 14h4" /></svg>;
    case "document": return <svg {...common}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>;
    case "sofa": return <svg {...common}><path d="M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5H5z" /><path d="M7 10V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 17v2M19 17v2" /></svg>;
    case "truck": return <svg {...common}><path d="M3 7h11v8H3z" /><path d="M14 10h3l3 3v2h-6" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>;
    case "coins": return <svg {...common}><ellipse cx="12" cy="7" rx="6" ry="3" /><path d="M6 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /></svg>;
    case "handshake": return <svg {...common}><path d="M8 11 5 8l-3 3 4 4" /><path d="M16 11l3-3 3 3-4 4" /><path d="m8 11 2 2a2 2 0 0 0 2.8 0L16 10" /></svg>;
    case "phone": return <svg {...common}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>;
    case "tv": return <svg {...common}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
    case "laptop": return <svg {...common}><rect x="6" y="5" width="12" height="9" rx="1.5" /><path d="M3 18h18" /></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="2.5" /></svg>;
  }
}
