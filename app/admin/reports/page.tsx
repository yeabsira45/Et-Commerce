"use client";

import React, { useEffect, useState } from "react";
import { useAppContext } from "@/components/AppContext";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  reporter?: { username: string; email: string };
};

type ModerationListing = {
  id: string;
  title: string;
  category: string;
  subcategory?: string | null;
  city: string;
  area: string;
  createdAt: string;
  owner?: { id: string; username: string; email: string };
};

export default function ReportsAdminPage() {
  const { user } = useAppContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingListings, setPendingListings] = useState<ModerationListing[]>([]);

  useEffect(() => {
    async function load() {
      const [reportsRes, moderationRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/admin/listings/moderation"),
      ]);
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
      if (moderationRes.ok) {
        const data = await moderationRes.json();
        setPendingListings(data.listings || []);
      }
    }
    if (user?.role === "ADMIN") {
      load();
    }
  }, [user]);

  async function resolveReport(reportId: string) {
    await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", reportId }),
    });
    const res = await fetch("/api/reports");
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
    }
  }

  async function deleteListing(reportId: string, listingId: string) {
    await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_listing", reportId, targetId: listingId }),
    });
    const res = await fetch("/api/reports");
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
    }
  }

  async function banUser(reportId: string, userId: string) {
    const reason = window.prompt("Ban reason?");
    await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban_user", reportId, targetId: userId, reason }),
    });
    const res = await fetch("/api/reports");
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
    }
  }

  async function moderateListing(listingId: string, action: "approve" | "reject") {
    const reason = action === "reject" ? window.prompt("Rejection reason?") || "" : "";
    const res = await fetch(`/api/admin/listings/${listingId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) return;
    const [reportsRes, moderationRes] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/admin/listings/moderation"),
    ]);
    if (reportsRes.ok) {
      const data = await reportsRes.json();
      setReports(data.reports || []);
    }
    if (moderationRes.ok) {
      const data = await moderationRes.json();
      setPendingListings(data.listings || []);
    }
  }

  if (!user) {
    return (
      <div className="container pageGrid">
        <p>Please sign in as admin to view reports.</p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="container pageGrid">
        <p>Access denied.</p>
      </div>
    );
  }

  return (
    <div className="container pageGrid">
      <div className="card" style={{ padding: 20 }}>
        <h2>Pending Listing Moderation</h2>
        {pendingListings.length === 0 ? (
          <p>No pending listings.</p>
        ) : (
          <ul className="modalList" style={{ marginBottom: 20 }}>
            {pendingListings.map((listing) => (
              <li key={listing.id} className="modalListItem">
                <div className="modalThreadTitle">{listing.title}</div>
                <div className="modalThreadMeta">
                  {listing.category}
                  {listing.subcategory ? ` • ${listing.subcategory}` : ""} • {listing.city}, {listing.area}
                </div>
                <div className="modalThreadMeta">
                  Owner: {listing.owner?.username || "unknown"} ({listing.owner?.email || "n/a"})
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button type="button" className="modalSecondary" onClick={() => moderateListing(listing.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="modalSecondary" onClick={() => moderateListing(listing.id, "reject")}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2>Reports</h2>
        {reports.length === 0 ? (
          <p>No reports submitted yet.</p>
        ) : (
          <ul className="modalList">
            {reports.map((r) => (
              <li key={r.id} className="modalListItem">
                <div className="modalThreadTitle">
                  {r.targetType} • {r.targetId}
                </div>
                <div className="modalThreadMeta">{r.reason}</div>
                <div className="modalThreadMeta">
                  Reported by {r.reporter?.username || "unknown"} ({r.reporter?.email || "n/a"})
                </div>
                <div className="modalThreadMeta">
                  Status: {r.resolvedAt ? "Resolved" : "Unresolved"}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {!r.resolvedAt ? (
                    <button type="button" className="modalSecondary" onClick={() => resolveReport(r.id)}>
                      Mark resolved
                    </button>
                  ) : null}
                  {r.targetType === "listing" ? (
                    <button
                      type="button"
                      className="modalSecondary"
                      onClick={() => deleteListing(r.id, r.targetId)}
                    >
                      Delete listing
                    </button>
                  ) : null}
                  {r.targetType === "user" ? (
                    <button
                      type="button"
                      className="modalSecondary"
                      onClick={() => banUser(r.id, r.targetId)}
                    >
                      Ban user
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
