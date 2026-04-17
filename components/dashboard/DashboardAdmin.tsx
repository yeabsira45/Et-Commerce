"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { formatEtbPrice, normalizePriceInput } from "@/lib/format";
import { canBanUsers, canModifyListing } from "@/lib/dashboardPermissions";
import type { UserProfile } from "@/components/AppContext";
import { dashboardToast } from "@/lib/dashboardToastCopy";
import { validateImageFile } from "@/lib/imageUploadValidation";

type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  banned: boolean;
  vendor?: { id?: string; storeName?: string; slug?: string; city?: string; phone?: string } | null;
};

type AdminListingRow = {
  id: string;
  title: string;
  status: string;
  price?: number | string | null;
  city: string;
  area: string;
  ownerId?: string;
  images?: { url: string }[];
};

function priceNum(p: AdminListingRow["price"]): number | null {
  if (p === null || p === undefined || p === "") return null;
  if (typeof p === "number" && !Number.isNaN(p)) return p;
  const n = Number(String(p).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

type UserSort = "username" | "email";
type ListingSort = "title" | "price_desc";

const PAGE_SIZE = 8;

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  idPrefix,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  idPrefix: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="adminPagination" role="navigation" aria-label={`${idPrefix} pages`}>
      <button type="button" className="modalSecondary" disabled={page <= 1} onClick={onPrev}>
        Previous
      </button>
      <span className="adminPaginationMeta" aria-current="page">
        Page {page} of {totalPages}
      </span>
      <button type="button" className="modalSecondary" disabled={page >= totalPages} onClick={onNext}>
        Next
      </button>
    </div>
  );
}

export function DashboardAdmin({ user }: { user: UserProfile }) {
  const showToast = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editListingId, setEditListingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [imageDropActive, setImageDropActive] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [listingQuery, setListingQuery] = useState("");
  const [userSort, setUserSort] = useState<UserSort>("username");
  const [listingSort, setListingSort] = useState<ListingSort>("title");
  const [userPage, setUserPage] = useState(1);
  const [listingPage, setListingPage] = useState(1);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserUsername, setEditUserUsername] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");

  const listingTitleRef = useRef<HTMLInputElement>(null);
  const userNameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/snapshot");
    if (!res.ok) {
      setLoading(false);
      showToast(dashboardToast.adminLoadFailed, "error");
      return;
    }
    const data = await res.json();
    setUsers(data.users || []);
    setListings(data.listings || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setUserPage(1);
  }, [userQuery, userSort]);

  useEffect(() => {
    setListingPage(1);
  }, [listingQuery, listingSort]);

  useEffect(() => {
    if (!editListingId) return;
    const t = window.requestAnimationFrame(() => listingTitleRef.current?.focus());
    return () => window.cancelAnimationFrame(t);
  }, [editListingId]);

  useEffect(() => {
    if (!editUserId) return;
    const t = window.requestAnimationFrame(() => userNameRef.current?.focus());
    return () => window.cancelAnimationFrame(t);
  }, [editUserId]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    let rows = !q
      ? users
      : users.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.vendor?.storeName || "").toLowerCase().includes(q)
        );
    rows = [...rows].sort((a, b) => {
      if (userSort === "email") return a.email.localeCompare(b.email);
      return a.username.localeCompare(b.username);
    });
    return rows;
  }, [users, userQuery, userSort]);

  const filteredListings = useMemo(() => {
    const q = listingQuery.trim().toLowerCase();
    let rows = !q
      ? listings
      : listings.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q) ||
            l.area.toLowerCase().includes(q) ||
            (l.ownerId || "").toLowerCase().includes(q)
        );
    rows = [...rows].sort((a, b) => {
      if (listingSort === "price_desc") {
        const pa = priceNum(a.price) ?? 0;
        const pb = priceNum(b.price) ?? 0;
        return pb - pa;
      }
      return a.title.localeCompare(b.title);
    });
    return rows;
  }, [listings, listingQuery, listingSort]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const listingTotalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));

  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, userPage]);

  const pagedListings = useMemo(() => {
    const start = (listingPage - 1) * PAGE_SIZE;
    return filteredListings.slice(start, start + PAGE_SIZE);
  }, [filteredListings, listingPage]);

  useEffect(() => {
    if (userPage > userTotalPages) setUserPage(userTotalPages);
  }, [userPage, userTotalPages]);

  useEffect(() => {
    if (listingPage > listingTotalPages) setListingPage(listingTotalPages);
  }, [listingPage, listingTotalPages]);

  async function applyImageFile(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    try {
      const form = new FormData();
      form.append("files", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        showToast(dashboardToast.imageReadFailed, "error");
        return;
      }
      const uploadPayload = (await uploadRes.json().catch(() => ({}))) as { urls?: string[] };
      const nextUrl = uploadPayload.urls?.[0];
      if (!nextUrl) {
        showToast(dashboardToast.imageReadFailed, "error");
        return;
      }
      setEditImageUrl(nextUrl);
      showToast("Image uploaded.");
    } catch {
      showToast(dashboardToast.imageReadFailed, "error");
    }
  }

  if (!canBanUsers(user.role)) return null;

  async function toggleBan(target: AdminUserRow) {
    if (!canBanUsers(user.role)) return;
    const next = !target.banned;
    if (next) {
      if (!window.confirm(`Are you sure you want to ban ${target.username}?`)) return;
    } else {
      if (!window.confirm(`Unban ${target.username}?`)) return;
    }
    const res = await fetch(`/api/admin/users/${target.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: next }),
    });
    if (!res.ok) {
      showToast(dashboardToast.adminBanFailed, "error");
      return;
    }
    showToast(next ? dashboardToast.userBanned : dashboardToast.userUnbanned);
    await load();
  }

  async function deleteUser(target: AdminUserRow) {
    if (!window.confirm(`Are you sure you want to delete user "${target.username}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${target.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || dashboardToast.userDeleteFailed, "error");
      return;
    }
    showToast(dashboardToast.userDeleted);
    await load();
  }

  async function saveUser(targetId: string) {
    const res = await fetch(`/api/admin/users/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: editUserUsername, email: editUserEmail }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || dashboardToast.userUpdateFailed, "error");
      return;
    }
    showToast(dashboardToast.userUpdated);
    setEditUserId(null);
    await load();
  }

  async function saveListing(id: string) {
    const row = listings.find((l) => l.id === id);
    const ownerId = row?.ownerId || "";
    if (!canModifyListing(user.id, user.role, ownerId)) {
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
    setEditListingId(null);
    await load();
  }

  async function deleteListing(id: string) {
    const row = listings.find((l) => l.id === id);
    if (!canModifyListing(user.id, user.role, row?.ownerId || user.id)) {
      showToast(dashboardToast.listingNoPermission, "error");
      return;
    }
    if (!window.confirm(`Delete listing "${row?.title || id}" permanently?`)) return;
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(dashboardToast.listingDeleteFailed, "error");
      return;
    }
    showToast(dashboardToast.listingDeleted);
    await load();
  }

  const usersFiltering = userQuery.trim().length > 0;
  const listingsFiltering = listingQuery.trim().length > 0;

  if (loading) {
    return <p className="modalSub">Loading admin data…</p>;
  }

  return (
    <div>
      <h2>Admin</h2>
      <p className="modalSub">
        Super Admin view. Search, sort, and pagination help at scale.
      </p>

      <h3 className="sellCardTitle" style={{ marginTop: 24, fontSize: "1.05rem" }}>
        Users
      </h3>
      <div className={`adminToolbar ${usersFiltering ? "adminToolbarActive" : ""}`}>
        {usersFiltering ? (
          <span className="adminFilterBadge" aria-live="polite">
            Filtering
          </span>
        ) : null}
        <input
          className="modalInput"
          placeholder="Search users by name, email, store…"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          aria-label="Filter users"
        />
        <select className="modalInput adminToolbarSelect" value={userSort} onChange={(e) => setUserSort(e.target.value as UserSort)}>
          <option value="username">Sort: username A–Z</option>
          <option value="email">Sort: email A–Z</option>
        </select>
      </div>
      <PaginationBar
        idPrefix="Users"
        page={userPage}
        totalPages={userTotalPages}
        onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
        onNext={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
      />
      {pagedUsers.map((u) => (
        <div key={u.id} className="adminUserRow">
          {editUserId === u.id ? (
            <div style={{ display: "grid", gap: 8, width: "100%" }}>
              <input
                ref={userNameRef}
                className="modalInput"
                value={editUserUsername}
                onChange={(e) => setEditUserUsername(e.target.value)}
                aria-label="Username"
              />
              <input
                className="modalInput"
                type="email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                aria-label="Email"
              />
              <div className="adminRowActions">
                <button type="button" className="modalPrimary" onClick={() => saveUser(u.id)}>
                  Save
                </button>
                <button
                  type="button"
                  className="modalSecondary"
                  onClick={() => {
                    setEditUserId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="modalThreadTitle">
                  {u.username}{" "}
                  <span className={`adminBadge ${u.banned ? "adminBadgeBanned" : ""}`}>{u.banned ? "Banned" : u.role}</span>
                </div>
                <div className="modalThreadMeta">{u.email}</div>
                {u.vendor?.storeName ? <div className="modalThreadMeta">{u.vendor.storeName}</div> : null}
              </div>
              <div className="adminRowActions">
                <button
                  type="button"
                  className="modalSecondary"
                  onClick={() => {
                    setEditUserId(u.id);
                    setEditUserUsername(u.username);
                    setEditUserEmail(u.email);
                  }}
                >
                  Edit
                </button>
                <button type="button" className="modalSecondary" onClick={() => toggleBan(u)}>
                  {u.banned ? "Unban" : "Ban"}
                </button>
                <button type="button" className="modalSecondary" onClick={() => deleteUser(u)}>
                  Delete user
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <h3 className="sellCardTitle" style={{ marginTop: 28, fontSize: "1.05rem" }}>
        All listings
      </h3>
      <div className={`adminToolbar ${listingsFiltering ? "adminToolbarActive" : ""}`}>
        {listingsFiltering ? (
          <span className="adminFilterBadge" aria-live="polite">
            Filtering
          </span>
        ) : null}
        <input
          className="modalInput"
          placeholder="Search listings by title, city, owner…"
          value={listingQuery}
          onChange={(e) => setListingQuery(e.target.value)}
          aria-label="Filter listings"
        />
        <select
          className="modalInput adminToolbarSelect"
          value={listingSort}
          onChange={(e) => setListingSort(e.target.value as ListingSort)}
        >
          <option value="title">Sort: title A–Z</option>
          <option value="price_desc">Sort: price high → low</option>
        </select>
      </div>
      <PaginationBar
        idPrefix="Listings"
        page={listingPage}
        totalPages={listingTotalPages}
        onPrev={() => setListingPage((p) => Math.max(1, p - 1))}
        onNext={() => setListingPage((p) => Math.min(listingTotalPages, p + 1))}
      />
      {pagedListings.map((listing) => {
        const thumb = listing.images?.[0]?.url;
        const p = priceNum(listing.price);
        return (
          <div key={listing.id} className="adminListingRow">
            {editListingId === listing.id ? (
              <div style={{ display: "grid", gap: 8, width: "100%" }}>
                <input
                  ref={listingTitleRef}
                  className="modalInput"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  aria-label="Listing title"
                />
                <input className="modalInput" value={editPrice} onChange={(e) => setEditPrice(normalizePriceInput(e.target.value))} />
                <select className="modalInput" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="SOLD">Sold</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <input
                  className="modalInput"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="Primary image URL"
                />
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
                  <span className="modalThreadMeta">Drop image or choose file</span>
                  <label className="modalUploadBtn" style={{ marginTop: 8 }}>
                    Choose file
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
                  <button type="button" className="modalPrimary" onClick={() => saveListing(listing.id)}>
                    Save
                  </button>
                  <button type="button" className="modalSecondary" onClick={() => setEditListingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="listingThumb" width={48} height={48} />
                  ) : (
                    <div className="listingThumbPlaceholder" />
                  )}
                  <div>
                    <div className="modalThreadTitle">{listing.title}</div>
                    <div className="modalThreadMeta">
                      {listing.city}, {listing.area} — {listing.status} — owner {listing.ownerId || "—"}
                    </div>
                    <div className="modalThreadMeta">{formatEtbPrice(p)}</div>
                  </div>
                </div>
                <div className="adminRowActions">
                  <button
                    type="button"
                    className="modalSecondary"
                    onClick={() => {
                      setEditListingId(listing.id);
                      setEditTitle(listing.title);
                      setEditPrice(p != null ? String(p) : "");
                      setEditStatus(listing.status);
                      setEditImageUrl(listing.images?.[0]?.url || "");
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="modalSecondary" onClick={() => deleteListing(listing.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
