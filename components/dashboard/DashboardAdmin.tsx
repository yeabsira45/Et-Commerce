"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  moderationState?: string;
  moderationReason?: string | null;
  price?: number | string | null;
  city: string;
  area: string;
  ownerId?: string;
  images?: { url: string }[];
};
type VerificationVendor = {
  id: string;
  storeName: string;
  slug: string;
  userId: string;
  phoneVerificationStatus: string;
  idVerificationStatus: string;
  addressVerificationStatus: string;
  trustScore: number;
  verificationSubmittedAt?: string | null;
  verificationReviewedAt?: string | null;
  verificationNotes?: string | null;
  user?: { username?: string; email?: string } | null;
};
type FraudSignal = {
  id: string;
  userId: string;
  type: string;
  severity: number;
  notes?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  user?: { username?: string; email?: string; vendor?: { storeName?: string; slug?: string } | null } | null;
};
type AdminAuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  createdAt: string;
  actor?: { username?: string; email?: string } | null;
};
type FeedbackEntry = {
  id: string;
  type: "BUG" | "FEATURE" | "GENERAL";
  message: string;
  createdAt: string;
  user?: { id: string; username: string; email: string } | null;
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
type AdminPageMeta = { page: number; pageSize: number; total: number; totalPages: number };

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
  const [verificationQueue, setVerificationQueue] = useState<VerificationVendor[]>([]);
  const [fraudSignals, setFraudSignals] = useState<FraudSignal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [userMeta, setUserMeta] = useState<AdminPageMeta>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
  const [listingMeta, setListingMeta] = useState<AdminPageMeta>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
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
    const params = new URLSearchParams();
    params.set("userPage", String(userPage));
    params.set("listingPage", String(listingPage));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("userSort", userSort);
    params.set("listingSort", listingSort);
    if (userQuery.trim()) params.set("userQuery", userQuery.trim());
    if (listingQuery.trim()) params.set("listingQuery", listingQuery.trim());

    const [snapshotRes, verificationRes, fraudRes, auditRes, feedbackRes] = await Promise.all([
      fetch(`/api/admin/snapshot?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/admin/verification", { cache: "no-store" }),
      fetch("/api/admin/fraud-signals?unresolvedOnly=true", { cache: "no-store" }),
      fetch("/api/admin/audit-logs", { cache: "no-store" }),
      fetch("/api/admin/feedback?page=1&pageSize=20", { cache: "no-store" }),
    ]);
    if (!snapshotRes.ok) {
      setLoading(false);
      showToast(dashboardToast.adminLoadFailed, "error");
      return;
    }
    const data = await snapshotRes.json();
    setUsers(data.users || []);
    setListings(data.listings || []);
    setUserMeta(data.userMeta || { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
    setListingMeta(data.listingMeta || { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
    if (verificationRes.ok) {
      const verificationData = await verificationRes.json();
      setVerificationQueue(verificationData.vendors || []);
    } else {
      setVerificationQueue([]);
    }
    if (fraudRes.ok) {
      const fraudData = await fraudRes.json();
      setFraudSignals(fraudData.signals || []);
    } else {
      setFraudSignals([]);
    }
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      setAuditLogs(auditData.logs || []);
    } else {
      setAuditLogs([]);
    }
    if (feedbackRes.ok) {
      const feedbackData = await feedbackRes.json();
      setFeedbackEntries(feedbackData.entries || []);
    } else {
      setFeedbackEntries([]);
    }
    setLoading(false);
  }, [listingPage, listingQuery, listingSort, showToast, userPage, userQuery, userSort]);

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
      const uploadPayload = (await uploadRes.json().catch(() => ({}))) as { uploads?: Array<{ id: string; url: string }> };
      const nextUrl = uploadPayload.uploads?.[0]?.url;
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

  async function moderateListing(id: string, action: "approve" | "reject") {
    const row = listings.find((l) => l.id === id);
    if (!row) return;
    let reason = "";
    if (action === "reject") {
      reason = window.prompt(`Reason for rejecting "${row.title}"?`)?.trim() || "";
      if (!reason) {
        showToast("Rejection reason is required.", "warning");
        return;
      }
    }
    const res = await fetch(`/api/admin/listings/${id}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "Could not update moderation state.", "error");
      return;
    }
    showToast(action === "approve" ? "Listing is now live." : "Listing rejected.");
    await load();
  }

  async function reviewVerification(vendorId: string, field: "phone" | "id" | "address", status: "VERIFIED" | "REJECTED" | "PENDING") {
    const note = status === "REJECTED" ? window.prompt("Reason for rejection? (optional)") || "" : "";
    const res = await fetch("/api/admin/verification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, field, status, note }),
    });
    if (!res.ok) {
      showToast("Could not update verification.", "error");
      return;
    }
    showToast("Verification updated.");
    await load();
  }

  async function resolveFraudSignal(signalId: string, resolve: boolean) {
    const note = resolve ? window.prompt("Resolution note? (optional)") || "" : "";
    const res = await fetch("/api/admin/fraud-signals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalId, action: resolve ? "resolve" : "reopen", note }),
    });
    if (!res.ok) {
      showToast("Could not update fraud signal.", "error");
      return;
    }
    showToast(resolve ? "Fraud signal resolved." : "Fraud signal reopened.");
    await load();
  }

  async function deleteFeedback(id: string) {
    if (!window.confirm("Delete this feedback entry?")) return;
    const res = await fetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Could not delete feedback.", "error");
      return;
    }
    showToast("Feedback deleted.");
    await load();
  }

  async function checkEmailHealth() {
    const res = await fetch("/api/test-email", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) {
      const payload = (await res?.json().catch(() => ({}))) as { error?: string };
      showToast(payload.error || "SMTP check failed.", "error");
      return;
    }
    showToast("SMTP check passed.");
  }

  const usersFiltering = userQuery.trim().length > 0;
  const listingsFiltering = listingQuery.trim().length > 0;

  if (loading) {
    return <p className="modalSub">Loading admin data…</p>;
  }

  return (
    <div className="adminDashboard">
      <h2 className="adminDashboardTitle">Admin</h2>
      <p className="modalSub adminDashboardSub">
        Super Admin view. Search, sort, and pagination help at scale.
      </p>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
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
        totalPages={userMeta.totalPages}
        onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
        onNext={() => setUserPage((p) => Math.min(userMeta.totalPages, p + 1))}
      />
      {users.map((u) => (
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
      </section>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
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
        totalPages={listingMeta.totalPages}
        onPrev={() => setListingPage((p) => Math.max(1, p - 1))}
        onNext={() => setListingPage((p) => Math.min(listingMeta.totalPages, p + 1))}
      />
      {listings.map((listing) => {
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
                    <div className="modalThreadMeta">
                      <span className={`adminBadge ${listing.moderationState === "APPROVED" ? "adminBadgeLive" : listing.moderationState === "REJECTED" ? "adminBadgeRejected" : "adminBadgePending"}`}>
                        {listing.moderationState || "PENDING"}
                      </span>
                      {listing.moderationReason ? ` Reason: ${listing.moderationReason}` : ""}
                    </div>
                    <div className="modalThreadMeta">{formatEtbPrice(p)}</div>
                  </div>
                </div>
                <div className="adminRowActions">
                  {listing.moderationState !== "APPROVED" ? (
                    <button type="button" className="modalPrimary" onClick={() => void moderateListing(listing.id, "approve")}>
                      Publish Live
                    </button>
                  ) : null}
                  {listing.moderationState !== "REJECTED" ? (
                    <button type="button" className="modalSecondary" onClick={() => void moderateListing(listing.id, "reject")}>
                      Reject
                    </button>
                  ) : null}
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
      </section>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
        Vendor verification queue
      </h3>
      {verificationQueue.length === 0 ? <p className="modalSub">No pending verification requests.</p> : null}
      {verificationQueue.map((vendor) => (
        <div key={vendor.id} className="adminListingRow">
          <div>
            <div className="modalThreadTitle">
              {vendor.storeName} <span className="adminBadge">Trust {vendor.trustScore}</span>
            </div>
            <div className="modalThreadMeta">
              @{vendor.slug} • {vendor.user?.username || "unknown"} ({vendor.user?.email || "n/a"})
            </div>
            <div className="modalThreadMeta">
              Phone: {vendor.phoneVerificationStatus} • ID: {vendor.idVerificationStatus} • Address: {vendor.addressVerificationStatus}
            </div>
            {vendor.verificationNotes ? <div className="modalThreadMeta">{vendor.verificationNotes}</div> : null}
          </div>
          <div className="adminRowActions" style={{ flexWrap: "wrap" }}>
            <button type="button" className="modalSecondary" onClick={() => reviewVerification(vendor.id, "phone", "VERIFIED")}>Verify phone</button>
            <button type="button" className="modalSecondary" onClick={() => reviewVerification(vendor.id, "id", "VERIFIED")}>Verify ID</button>
            <button type="button" className="modalSecondary" onClick={() => reviewVerification(vendor.id, "address", "VERIFIED")}>Verify address</button>
            <button type="button" className="modalSecondary" onClick={() => reviewVerification(vendor.id, "id", "REJECTED")}>Reject ID</button>
          </div>
        </div>
      ))}
      </section>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
        Fraud signals
      </h3>
      {fraudSignals.length === 0 ? <p className="modalSub">No active fraud signals.</p> : null}
      {fraudSignals.map((signal) => (
        <div key={signal.id} className="adminListingRow">
          <div>
            <div className="modalThreadTitle">
              {signal.type} <span className="adminBadge">Severity {signal.severity}</span>
            </div>
            <div className="modalThreadMeta">
              User: {signal.user?.username || signal.userId} ({signal.user?.email || "n/a"}) • {new Date(signal.createdAt).toLocaleString()}
            </div>
            {signal.notes ? <div className="modalThreadMeta">{signal.notes}</div> : null}
            {signal.resolutionNote ? <div className="modalThreadMeta">Resolution: {signal.resolutionNote}</div> : null}
          </div>
          <div className="adminRowActions">
            {signal.resolvedAt ? (
              <button type="button" className="modalSecondary" onClick={() => resolveFraudSignal(signal.id, false)}>Reopen</button>
            ) : (
              <button type="button" className="modalSecondary" onClick={() => resolveFraudSignal(signal.id, true)}>Resolve</button>
            )}
          </div>
        </div>
      ))}
      </section>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
        Delivery health
      </h3>
      <div className="adminRowActions">
        <button type="button" className="modalSecondary" onClick={() => void checkEmailHealth()}>
          Run SMTP test
        </button>
      </div>
      </section>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
        Admin audit log
      </h3>
      {auditLogs.length === 0 ? <p className="modalSub">No admin actions logged yet.</p> : null}
      {auditLogs.slice(0, 40).map((log) => (
        <div key={log.id} className="adminUserRow">
          <div>
            <div className="modalThreadTitle">{log.action}</div>
            <div className="modalThreadMeta">
              {log.targetType}
              {log.targetId ? ` • ${log.targetId}` : ""} • by {log.actor?.username || log.actor?.email || "admin"} • {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
      </section>

      <section className="adminSection">
      <h3 className="sellCardTitle adminSectionTitle">
        User feedback inbox
      </h3>
      {feedbackEntries.length === 0 ? <p className="modalSub">No feedback submissions yet.</p> : null}
      {feedbackEntries.map((entry) => (
        <div key={entry.id} className="adminUserRow">
          <div>
            <div className="modalThreadTitle">
              {entry.type} <span className="adminBadge">{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
            <div className="modalThreadMeta">
              {entry.user ? `${entry.user.username} (${entry.user.email})` : "Anonymous"}
            </div>
            <div className="modalThreadMeta" style={{ whiteSpace: "pre-wrap" }}>
              {entry.message}
            </div>
          </div>
          <div className="adminRowActions">
            <button type="button" className="modalSecondary" onClick={() => void deleteFeedback(entry.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
      </section>
    </div>
  );
}
