"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/components/AppContext";
import { Avatar } from "@/components/Avatar";
import { getProfileMeta } from "@/lib/localProfile";

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
  profileImageId?: string;
  listings: { id: string; title: string; city: string; area: string; images?: { url: string }[] }[];
};

export default function VendorProfilePage({ params }: { params: { slug: string } }) {
  const { user } = useAppContext();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment?: string | null; createdAt: string; reviewer?: { username: string } }[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [newRating, setNewRating] = useState("5");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/vendors/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        setVendor(data.vendor);
      }
    }
    load();
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
      alert("Please sign in to report this vendor.");
      return;
    }
    const reason = window.prompt("Why are you reporting this vendor?");
    if (!reason) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "user", targetId: vendor?.userId, reason }),
    });
    alert("Report submitted.");
  }

  if (!vendor) {
    return (
      <div className="container pageGrid">
        <p>Loading vendor profile...</p>
      </div>
    );
  }

  const localMeta = getProfileMeta(vendor.userId, vendor.user?.email || null);
  const displayName = localMeta?.fullName || vendor.user?.username || vendor.storeName;
  const profileImageId = vendor.profileImageId || localMeta?.profileImageId;

  return (
    <div className="container pageGrid">
      <div className="card vendorProfileCard">
        <div className="vendorHero">
          <Avatar name={displayName} imageId={profileImageId} size={88} className="vendorHeroAvatar" />
          <div>
            <h2>{vendor.storeName}</h2>
            <p className="modalSub">{displayName}</p>
            <p className="modalSub">
              Rating: {averageRating.toFixed(1)} - {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </p>
            <p className="modalSub">
              {vendor.city}, {vendor.area} - {vendor.phone}
            </p>
            {vendor.street ? <p className="modalSub">Address: {vendor.street}</p> : null}
            <p className="modalSub">Store slug: {vendor.slug}</p>
            {vendor.user?.email ? <p className="modalSub">Email: {vendor.user.email}</p> : null}
            {vendor.createdAt ? <p className="modalSub">Joined: {new Date(vendor.createdAt).toLocaleDateString()}</p> : null}
          </div>
        </div>
        <button type="button" className="modalSecondary" onClick={reportVendor}>
          Report user
        </button>
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
        <ul className="modalList">
          {vendor.listings.map((listing) => (
            <li key={listing.id} className="modalListItem">
              <div className="vendorListingRow">
                <Link href={`/vendor/${vendor.slug}`} className="vendorListingAvatarLink" aria-label={`View ${vendor.storeName}`}>
                  <Avatar name={displayName} imageId={profileImageId} size={42} className="vendorListingAvatar" />
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
      </div>
    </div>
  );
}
