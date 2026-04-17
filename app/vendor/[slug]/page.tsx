"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/components/AppContext";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/ToastProvider";

type VendorData = {
  id: string;
  slug: string;
  storeName: string;
  city: string;
  area: string;
  street?: string | null;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  user?: { username?: string; email?: string; createdAt?: string };
  profileImageUrl?: string;
  listings: { id: string; title: string; city: string; area: string; images?: { url: string }[] }[];
};

export default function VendorProfilePage({ params }: { params: { slug: string } }) {
  const { user } = useAppContext();
  const showToast = useToast();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment?: string | null; createdAt: string; reviewer?: { username: string } }[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [newRating, setNewRating] = useState("5");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setVendorError(null);
      setLoadingVendor(true);
      try {
        const res = await fetch(`/api/vendors/${params.slug}`);
        if (!res.ok) {
          setVendor(null);
          setVendorError(res.status === 404 ? "This vendor profile could not be found." : "We could not load this vendor right now.");
          setLoadingVendor(false);
          return;
        }
        const data = await res.json();
        setVendor(data.vendor);
      } catch {
        setVendor(null);
        setVendorError("We could not load this vendor right now.");
      }
      setLoadingVendor(false);
    }
    void load();
  }, [params.slug]);

  useEffect(() => {
    async function loadReviews() {
      if (!vendor) return;
      const res = await fetch(`/api/reviews?vendorId=${vendor.id}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setAverageRating(data.average || 0);
        setReviewCount(data.count || 0);
      }
    }
    loadReviews();
  }, [vendor]);

  async function reportVendor() {
    if (!user) {
      showToast("You must login or register first to report this seller.", "warning");
      return;
    }
    const reason = window.prompt("Why are you reporting this vendor?");
    if (!reason) return;
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "user", targetId: vendor?.userId, reason }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      showToast(payload.error || "Could not submit your report. Please try again.", "error");
      return;
    }
    showToast("Report submitted.", "success");
  }

  async function handleShare() {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: vendor?.storeName || "ET-Commerce vendor",
      text: vendor ? `Browse ${vendor.storeName} on ET-Commerce.` : "Check out this seller on ET-Commerce.",
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast("Vendor link copied.", "success");
    } catch {
      showToast("We could not share this vendor right now.", "error");
    }
  }

  if (loadingVendor) {
    return (
      <div className="container pageLoader" role="status" aria-live="polite" aria-label="Loading vendor profile">
        <div className="pageLoaderCard pageLoaderCardWide">
          <div className="pageLoaderSpinner" aria-hidden="true" />
          <div className="pageLoaderText">Loading vendor profile...</div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container pageGrid">
        <div className="uiStateCard uiStateCardError">
          <h1 className="uiStateTitle">Vendor unavailable</h1>
          <p className="uiStateText">{vendorError || "This vendor profile could not be found."}</p>
        </div>
      </div>
    );
  }

  const displayName = vendor.user?.username || vendor.storeName;
  const profileImageUrl = vendor.profileImageUrl;

  return (
    <div className="container pageGrid">
      <div className="card vendorProfileCard">
        <div className="vendorHero">
          <Avatar name={displayName} imageUrl={profileImageUrl} size={88} className="vendorHeroAvatar" />
          <div>
            <h2>{vendor.storeName}</h2>
            <p className="modalSub">{displayName}</p>
            <p className="modalSub">
              Rating: {averageRating.toFixed(1)} - {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </p>
            <p className="modalSub">
              {vendor.city}, {vendor.area}
            </p>
            {vendor.street && user ? <p className="modalSub">Address: {vendor.street}</p> : null}
            {user ? <p className="modalSub">Store slug: {vendor.slug}</p> : null}
            {user ? <p className="modalSub">Phone: {vendor.phone}</p> : <p className="modalSub">Login to view seller contact details.</p>}
            {user && vendor.user?.email ? <p className="modalSub">Email: {vendor.user.email}</p> : null}
            {vendor.createdAt ? <p className="modalSub">Joined: {new Date(vendor.createdAt).toLocaleDateString()}</p> : null}
          </div>
        </div>
        <div className="uiStateActions" style={{ marginTop: 12 }}>
          <button type="button" className="modalSecondary" onClick={() => void handleShare()}>
            Share seller
          </button>
          <button type="button" className="modalSecondary" onClick={reportVendor}>
            Report user
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <h3>Leave a review</h3>
          {!user ? (
            <p className="modalSub">Sign in to leave a review.</p>
          ) : (
            <form
              className="modalForm"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setReviewError(null);
                const res = await fetch("/api/reviews", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ vendorId: vendor.id, rating: Number(newRating), comment: newComment.trim() || undefined }),
                });
                setSubmitting(false);
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  setReviewError(data.error || "Could not submit review.");
                  return;
                }
                setNewComment("");
                const refresh = await fetch(`/api/reviews?vendorId=${vendor.id}`);
                if (refresh.ok) {
                  const data = await refresh.json();
                  setReviews(data.reviews || []);
                  setAverageRating(data.average || 0);
                  setReviewCount(data.count || 0);
                }
              }}
            >
              <label className="modalField">
                <span className="modalLabel">Rating</span>
                <select className="modalInput" value={newRating} onChange={(e) => setNewRating(e.target.value)}>
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Okay</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Bad</option>
                </select>
              </label>
              <label className="modalField">
                <span className="modalLabel">Comment (optional)</span>
                <input className="modalInput" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Share your experience" />
              </label>
              {reviewError ? <p className="modalError">{reviewError}</p> : null}
              <button className="modalPrimary" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit review"}
              </button>
            </form>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <h3>Recent reviews</h3>
          {reviews.length === 0 ? (
            <p className="modalSub">No reviews yet.</p>
          ) : (
            <ul className="modalList">
              {reviews.map((review) => (
                <li key={review.id} className="modalListItem">
                  <div className="modalThreadTitle">
                    {review.reviewer?.username || "Anonymous"} - {review.rating}/5
                  </div>
                  {review.comment ? <div className="modalThreadMeta">{review.comment}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <h3 style={{ marginTop: 16 }}>Listings</h3>
        {vendor.listings.length === 0 ? (
          <div className="uiStateCard" style={{ marginTop: 12 }}>
            <h3 className="uiStateTitle">No active listings</h3>
            <p className="uiStateText">This seller does not have any active listings right now.</p>
          </div>
        ) : (
          <ul className="modalList">
            {vendor.listings.map((listing) => (
              <li key={listing.id} className="modalListItem">
                <div className="vendorListingRow">
                  <Link href={`/vendor/${vendor.slug}`} className="vendorListingAvatarLink" aria-label={`View ${vendor.storeName}`}>
                    <Avatar name={displayName} imageUrl={profileImageUrl} size={42} className="vendorListingAvatar" />
                  </Link>
                  <div className="vendorListingCopy">
                    <Link href={`/item/${listing.id}`} className="vendorListingTitle">{listing.title}</Link>
                    <div className="modalThreadMeta">
                      {listing.city}, {listing.area}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
