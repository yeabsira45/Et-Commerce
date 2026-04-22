"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/components/AppContext";
import { useToast } from "@/components/ToastProvider";
import { formatEtbPrice, normalizePriceInput } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { canModifyListing } from "@/lib/dashboardPermissions";
import { dashboardToast } from "@/lib/dashboardToastCopy";
import { validateImageFile } from "@/lib/imageUploadValidation";

export type DashListing = {
  id: string;
  title: string;
  status: string;
  moderationState?: "PENDING" | "APPROVED" | "REJECTED";
  moderationReason?: string | null;
  price?: number | string | null;
  city: string;
  area: string;
  ownerId?: string;
  images?: { url: string }[];
};

function priceToNumber(price: DashListing["price"]): number | null {
  if (price === null || price === undefined || price === "") return null;
  if (typeof price === "number" && !Number.isNaN(price)) return price;
  const n = Number(String(price).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

function moderationCopy(listing: DashListing): string | null {
  if (listing.moderationState === "PENDING") return "Pending review";
  if (listing.moderationState === "REJECTED") {
    return listing.moderationReason ? `Rejected - ${listing.moderationReason}` : "Rejected";
  }
  if (listing.moderationState === "APPROVED") return "Approved";
  return null;
}

export function DashboardMyListings() {
  const { user } = useAppContext();
  const showToast = useToast();
  const [listings, setListings] = useState<DashListing[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [imageDropActive, setImageDropActive] = useState(false);
  const editTitleRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/vendors/me/listings");
    if (!res.ok) {
      showToast(dashboardToast.listingsLoadFailed, "error");
      return;
    }
    const data = await res.json();
    setListings(data.listings || []);
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editingId) return;
    const t = window.requestAnimationFrame(() => editTitleRef.current?.focus());
    return () => window.cancelAnimationFrame(t);
  }, [editingId]);

  async function applyImageFile(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    const form = new FormData();
    form.append("files", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
    if (!uploadRes.ok) {
      showToast(dashboardToast.imageReadFailed, "error");
      return;
    }
    const uploadPayload = (await uploadRes.json().catch(() => ({}))) as { uploads?: Array<{ id: string; url: string }> };
    const nextUrl = uploadPayload.uploads?.[0]?.url;
    if (!nextUrl) {
      showToast(dashboardToast.imageReadFailed, "error");
      return;
    }
    setEditImageUrl(nextUrl);
    showToast("Image uploaded.");
  }

  if (!user) return null;

  const u = user;
  const vendorHref = u.vendor?.slug ? `/vendor/${u.vendor.slug}` : "/vendor/register";
  const vendorName = u.vendor?.storeName || u.fullName || u.username;
  const vendorImageUrl = u.vendor?.profileImageUrl;

  async function removeListing(id: string) {
    const ownerId = listings.find((l) => l.id === id)?.ownerId || u.id;
    if (!canModifyListing(u.id, u.role, ownerId)) {
      showToast(dashboardToast.listingNoPermission, "error");
      return;
    }
    if (!window.confirm("Delete this listing permanently?")) return;
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(dashboardToast.listingDeleteFailed, "error");
      return;
    }
    showToast(dashboardToast.listingDeleted);
    await load();
  }

  async function saveEdit(id: string) {
    const ownerId = listings.find((l) => l.id === id)?.ownerId || u.id;
    if (!canModifyListing(u.id, u.role, ownerId)) {
      showToast(dashboardToast.listingNoPermission, "error");
      return;
    }
    const images = editImageUrl.trim() ? [{ url: editImageUrl.trim() }] : undefined;
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        price: editPrice,
        status: editStatus,
        ...(images ? { images } : {}),
      }),
    });
    if (!res.ok) {
      showToast(dashboardToast.listingUpdateFailed, "error");
      return;
    }
    showToast(dashboardToast.listingUpdated);
    setEditingId(null);
    await load();
  }

  return (
    <div>
      <h2>My Listings</h2>
      <Link href={vendorHref} className="dashboardVendorBlock">
        <Avatar name={vendorName} imageUrl={vendorImageUrl} size={40} className="dashboardVendorAvatar" />
        <div>
          <div className="modalThreadTitle">{vendorName}</div>
          <div className="modalThreadMeta">Your public store profile</div>
        </div>
      </Link>
      {listings.length === 0 ? (
        <p className="modalSub" style={{ marginTop: 16 }}>
          No listings yet. Create one from the Sell page.
        </p>
      ) : (
        <ul className="modalList" style={{ marginTop: 16 }}>
          {listings.map((listing) => {
            const thumb = listing.images?.[0]?.url;
            const p = priceToNumber(listing.price);
            const moderationText = moderationCopy(listing);
            return (
              <li key={listing.id} className="modalListItem">
                {editingId === listing.id ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input
                      ref={editTitleRef}
                      className="modalInput"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      aria-label="Listing title"
                    />
                    <input
                      className="modalInput"
                      value={editPrice}
                      onChange={(e) => setEditPrice(normalizePriceInput(e.target.value))}
                      placeholder="Price (ETB)"
                    />
                    <select className="modalInput" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="SOLD">Sold</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                    <label className="sellField">
                      <span className="sellFieldLabel">Primary image URL (optional)</span>
                      <input
                        className="modalInput"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="https://... or upload below"
                      />
                    </label>
                    <div
                      className={`listingImageDropZone ${imageDropActive ? "listingImageDropZoneActive" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setImageDropActive(true);
                      }}
                      onDragLeave={() => setImageDropActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setImageDropActive(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file?.type.startsWith("image/")) void applyImageFile(file);
                      }}
                    >
                      <span className="modalThreadMeta">Drop an image here or choose one from your device</span>
                      <label className="modalUploadBtn" style={{ marginTop: 8 }}>
                        Choose image file
                        <input
                          type="file"
                          accept="image/*"
                          className="srOnly"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void applyImageFile(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className="adminRowActions">
                      <button type="button" className="modalPrimary" onClick={() => saveEdit(listing.id)}>
                        Save
                      </button>
                      <button type="button" className="modalSecondary" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="dashboardListingRow">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="listingThumb" width={48} height={48} />
                      ) : (
                        <div className="listingThumbPlaceholder" aria-hidden />
                      )}
                      <div className="dashboardListingCopy">
                        <div className="modalThreadTitle">{listing.title}</div>
                        <div className="modalThreadMeta">
                          {listing.city}, {listing.area} — {listing.status}
                        </div>
                        {moderationText ? (
                          <div className="modalThreadMeta">
                            <strong>{moderationText}</strong>
                          </div>
                        ) : null}
                        <div className="modalThreadMeta">{formatEtbPrice(p)}</div>
                      </div>
                    </div>
                    <div className="adminRowActions" style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="modalSecondary"
                        onClick={() => {
                          setEditingId(listing.id);
                          setEditTitle(listing.title);
                          setEditPrice(p != null ? String(p) : "");
                          setEditStatus(listing.status);
                          setEditImageUrl(listing.images?.[0]?.url || "");
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="modalSecondary" onClick={() => removeListing(listing.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
