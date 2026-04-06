"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/components/AppContext";
import { SearchableSelect } from "@/components/form/SearchableSelect";
import { ETHIOPIAN_CITIES } from "@/lib/cities";
import { Avatar } from "@/components/Avatar";
import { getProfileMeta, saveProfileMeta } from "@/lib/localProfile";
import { deleteImage, saveImage } from "@/lib/indexedDB";
import { useToast } from "@/components/ToastProvider";
import { dashboardToast } from "@/lib/dashboardToastCopy";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export type VendorProfileFormProps = {
  /** Full page with header bar (vendor/register). */
  variant?: "page" | "embed";
  onSaved?: () => void;
};

export function VendorProfileForm({ variant = "page", onSaved }: VendorProfileFormProps) {
  const { user } = useAppContext();
  const showToast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [effectiveSlug, setEffectiveSlug] = useState("");
  const [city, setCity] = useState("");
  const [subcity, setSubcity] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImageId, setProfileImageId] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCityNode = ETHIOPIAN_CITIES.find((item) => item.value === city);
  const effectiveStoreName = useMemo(() => {
    const trimmed = storeName.trim();
    if (trimmed) return trimmed;
    return fullName.trim() ? `${fullName.trim()}'s Store` : "";
  }, [fullName, storeName]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/vendors/me");
      if (!res.ok) return;
      const data = await res.json();
      const vendor = data.vendor;
      const nextUser = data.user;
      if (nextUser) {
        setFullName(nextUser.username || "");
        setEmail(nextUser.email || "");
        const meta = getProfileMeta(nextUser.id, nextUser.email);
        setProfileImageId(meta?.profileImageId || "");
      }
      if (vendor) {
        setStoreName(vendor.storeName || "");
        setEffectiveSlug(vendor.slug || "");
        setCity(vendor.city || "");
        setSubcity(vendor.area || "");
        setArea(vendor.street || "");
        setPhone(vendor.phone || "");
      }
    }
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!profileImageFile) {
      setProfilePreviewUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(profileImageFile);
    setProfilePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [profileImageFile]);

  useEffect(() => {
    let active = true;

    async function syncSlug() {
      const base = slugify(effectiveStoreName);
      if (!base) return;
      try {
        const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(base)}`);
        const data = await res.json();
        if (active) setEffectiveSlug(data.uniqueSlug || base);
      } catch {
        if (active) setEffectiveSlug(base);
      }
    }

    syncSlug();
    return () => {
      active = false;
    };
  }, [effectiveStoreName]);

  if (!user) {
    return (
      <div className={variant === "page" ? "sellPage" : ""}>
        <main className="sellMain">
          <p>Please sign in to edit your vendor profile.</p>
        </main>
      </div>
    );
  }

  const currentUser = user;

  const canSubmit = Boolean(fullName.trim() && email.trim() && city && subcity && phone.trim() && effectiveSlug.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/vendors/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        storeName,
        city,
        area: subcity,
        street: area.trim() || undefined,
        phone,
      }),
    });
    if (!res.ok) {
      setSaving(false);
      setError(dashboardToast.profileSaveFailed);
      showToast(dashboardToast.profileSaveFailed, "error");
      return;
    }
    const hadAvatarQueued = Boolean(profileImageFile);
    try {
      saveProfileMeta({
        userId: currentUser.id,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        storeName: effectiveStoreName,
        city,
        profileImageId: profileImageFile || profileImageId ? currentUser.id : undefined,
      });

      if (profileImageFile) {
        await saveImage(currentUser.id, profileImageFile);
        setProfileImageId(currentUser.id);
        setProfileImageFile(null);
      }
    } catch {
      // IndexedDB failure should not block the rest of the profile update
    }
    setSaving(false);
    showToast(hadAvatarQueued ? dashboardToast.profileSavedWithImage : dashboardToast.profileSaved);
    onSaved?.();
  }

  async function handleRemoveAvatar() {
    setProfileImageFile(null);
    setProfilePreviewUrl("");
    setProfileImageId("");
    try {
      await deleteImage(currentUser.id);
    } catch {
      // initials fallback keeps the UI safe even if IndexedDB removal fails
    }
    saveProfileMeta({
      userId: currentUser.id,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      storeName: effectiveStoreName,
      city,
      profileImageId: undefined,
    });
    showToast(dashboardToast.profileImageRemoved);
    onSaved?.();
  }

  const card = (
    <section className="sellCard" aria-labelledby="vendor-profile-title">
      <div className="sellCardInner">
        <h2 id="vendor-profile-title" className="sellCardTitle">
          Update your store details
        </h2>

        <form className="sellForm" onSubmit={handleSubmit}>
          <div className="sellGrid">
            <div className="sellField sellFieldFull vendorAvatarPreview">
              <span className="sellFieldLabel">Profile Preview</span>
              <div className="vendorAvatarPreviewRow">
                <div className="avatarBadgeWrap">
                  <Avatar name={fullName || storeName || "Vendor"} imageUrl={profilePreviewUrl || undefined} imageId={profileImageId || undefined} size={72} />
                  <span className="avatarEditBadge" aria-hidden="true">
                    Edit
                  </span>
                </div>
                <div>
                  <div className="vendorAvatarPreviewName">{storeName.trim() || `${fullName.trim() || "Vendor"}'s Store`}</div>
                  <p className="sellFieldHint">Upload a vendor photo to use everywhere across listings, chat, and your public vendor page.</p>
                </div>
                <div className="modalAvatarActions">
                  <label className="modalUploadBtn">
                    {profileImageId || profileImageFile ? "Change Image" : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="srOnly"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setProfileImageFile(file);
                      }}
                    />
                  </label>
                  {profileImageId || profileImageFile ? (
                    <button type="button" className="modalSecondary modalAvatarRemoveBtn" onClick={handleRemoveAvatar}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <label className="sellField">
              <span className="sellFieldLabel">Full Name</span>
              <input type="text" className="sellInput" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>

            <label className="sellField">
              <span className="sellFieldLabel">Store Name (Optional)</span>
              <input
                type="text"
                className="sellInput"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={fullName.trim() ? `${fullName.trim()}'s Store` : "Your store name"}
              />
            </label>

            <div className="vendorLocationField">
              <div className="vendorSelectHeader">
                <span className="vendorSelectTitle">City</span>
                <span className="vendorSelectHelper">Choose your main city first</span>
              </div>
              <SearchableSelect
                label="City"
                value={city}
                placeholder="Select City"
                options={ETHIOPIAN_CITIES.map((item) => ({ value: item.value, label: item.label }))}
                onChange={(next) => {
                  setCity(next);
                  setSubcity("");
                }}
              />
            </div>

            <div className="vendorLocationField">
              <div className="vendorSelectHeader">
                <span className="vendorSelectTitle">Subcity</span>
                <span className="vendorSelectHelper">This updates after you choose a city</span>
              </div>
              <SearchableSelect
                label="Subcity"
                value={subcity}
                placeholder={city ? "Select Subcity" : "Select City First"}
                disabled={!city}
                groups={selectedCityNode ? [{ label: selectedCityNode.label, options: selectedCityNode.subcities }] : undefined}
                options={selectedCityNode?.subcities}
                onChange={setSubcity}
              />
            </div>

            <label className="sellField">
              <span className="sellFieldLabel">Area (Optional)</span>
              <input type="text" className="sellInput" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Neighborhood or landmark" />
            </label>

            <label className="sellField">
              <span className="sellFieldLabel">Phone Number</span>
              <input type="tel" className="sellInput" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </label>

            <label className="sellField">
              <span className="sellFieldLabel">Email</span>
              <input type="email" className="sellInput" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          </div>

          {error ? <p className="modalError">{error}</p> : null}

          <button type="submit" className="sellNextBtn" disabled={!canSubmit || saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>
    </section>
  );

  if (variant === "embed") {
    return <div className="dashboardEmbedProfile">{card}</div>;
  }

  return (
    <div className="sellPage">
      <div className="sellHeaderBar">
        <div className="sellHeaderInner">
          <h1 className="sellHeaderTitle">Vendor profile</h1>
        </div>
      </div>
      <main className="sellMain">{card}</main>
    </div>
  );
}
