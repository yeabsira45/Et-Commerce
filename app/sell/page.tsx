"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "../sell/sell.css";
import { categories } from "@/components/categories";
import { useAppContext } from "@/components/AppContext";
import { SearchableSelect, type CategorySearchInsight } from "@/components/form/SearchableSelect";
import { ETHIOPIAN_CITIES } from "@/lib/cities";
import { normalizeSellDraftForStorage } from "@/lib/sellDraftStorage";
import { MAX_LISTING_IMAGE_FILE_BYTES, MAX_LISTING_IMAGES, sanitizeListingImageUrls } from "@/lib/listingImageRules";
import { useToast } from "@/components/ToastProvider";
import { MAX_IMAGE_UPLOAD_MB, validateImageFile } from "@/lib/imageUploadValidation";
import { clearListingUndoStack } from "@/lib/listings/listingUndoStack";
import {
  detectAllListingsFromTitle,
  detectListingFromTitle,
  detectionResultKey,
  type SellTitleDetection,
} from "@/lib/sellTitleDetection";

export default function SellPage() {
  const { user } = useAppContext();
  const showToast = useToast();
  const [title, setTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [lockedDetection, setLockedDetection] = useState<SellTitleDetection | null>(null);
  const [lockedDetectionTitleNorm, setLockedDetectionTitleNorm] = useState<string>("");
  /** While title matches this normalized string, inline suggestions stay hidden after "I'll choose manually". */
  const [suggestionsDismissedForTitle, setSuggestionsDismissedForTitle] = useState<string | null>(null);
  const [hierarchySub, setHierarchySub] = useState<string | null>(null);
  const [hierarchyItem, setHierarchyItem] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSubcity, setSelectedSubcity] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const selectedCityNode = ETHIOPIAN_CITIES.find((city) => city.value === selectedCity);
  const hasUnsavedSellInput = Boolean(
    title.trim() ||
      selectedCategory ||
      selectedCity ||
      selectedSubcity ||
      hierarchySub ||
      hierarchyItem ||
      photos.length ||
      photoUrls.length
  );

  const clearAllSellProgress = useCallback(() => {
    try {
      window.localStorage.removeItem("sellDraft");
    } catch {
      // ignore storage errors
    }
    clearListingUndoStack();
  }, []);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem("sellDraft");
    if (!rawDraft) return;
    try {
      const draft = JSON.parse(rawDraft) as {
        title?: string;
        category?: string;
        city?: string;
        area?: string;
        subcity?: string;
        images?: string[];
      };
      if (draft.title) setTitle(draft.title);
      if (draft.category) {
        setSelectedCategory(draft.category);
        setCategoryTouched(true);
      }
      if (draft.city) setSelectedCity(draft.city);
      if (draft.subcity || draft.area) setSelectedSubcity(draft.subcity || draft.area || null);
      if (Array.isArray(draft.images)) {
        const { urls, warnings } = sanitizeListingImageUrls(draft.images);
        if (warnings.length) {
          warnings.forEach((msg) => showToast(msg, "warning"));
        }
        setPhotoUrls(urls);
      }
      if (typeof (draft as { subcategory?: string }).subcategory === "string") {
        setHierarchySub((draft as { subcategory: string }).subcategory);
      }
      if (typeof (draft as { constructionItem?: string }).constructionItem === "string") {
        setHierarchyItem((draft as { constructionItem: string }).constructionItem);
      }
    } catch {
      // ignore malformed local draft and let the user start clean
    }
  }, [showToast]);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;
    const picked: File[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const file = list.item(i);
      if (file) picked.push(file);
    }

    const allowed: File[] = [];
    let invalidType = false;
    let oversize = false;

    for (const file of picked) {
      if (allowed.length >= MAX_LISTING_IMAGES) {
        break;
      }
      const validationError = validateImageFile(file, { maxBytes: MAX_LISTING_IMAGE_FILE_BYTES });
      if (validationError) {
        if (String(file.type || "").toLowerCase().startsWith("image/")) {
          oversize = true;
        } else {
          invalidType = true;
        }
        continue;
      }
      allowed.push(file);
    }

    if (picked.length > MAX_LISTING_IMAGES) {
      showToast(`You can add up to ${MAX_LISTING_IMAGES} photos per listing.`, "warning");
    }
    if (oversize) {
      showToast(`Each photo must be ${MAX_IMAGE_UPLOAD_MB}MB or smaller.`, "warning");
    }
    if (invalidType) {
      showToast("Only image files are allowed (JPG, PNG, WebP, etc.).", "warning");
    }

    if (!allowed.length) {
      e.target.value = "";
      return;
    }

    setPhotos(allowed);
    uploadFiles(allowed);
    e.target.value = "";
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    setUploading(true);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      const uploads = Array.isArray(data.uploads) ? data.uploads : [];
      setPhotoUrls(uploads.map((item: { id?: string; url?: string }) => item.id || item.url).filter(Boolean));
    } else {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(payload.error || "Image upload failed. Please try again.", "error");
    }
    setUploading(false);
  }

  useEffect(() => {
    const nextPreviews = photos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(nextPreviews);
    return () => nextPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    if (!selectedCityNode || !selectedSubcity) return;
    const belongsToCity = selectedCityNode.subcities.some((item) => item.value === selectedSubcity);
    if (!belongsToCity) {
      setSelectedSubcity(null);
    }
  }, [selectedCityNode, selectedSubcity]);

  useEffect(() => {
    if (!lockedDetection) return;
    setHierarchySub(lockedDetection.subcategory);
    setHierarchyItem(lockedDetection.constructionItem ?? null);
  }, [lockedDetection]);

  useEffect(() => {
    if (!lockedDetection) return;
    const t = title.trim();
    if (t.length < 3) {
      setLockedDetection(null);
      setLockedDetectionTitleNorm("");
      return;
    }
    const all = detectAllListingsFromTitle(t);
    const still = all.some((d) => detectionResultKey(d) === detectionResultKey(lockedDetection));
    if (!still) {
      setLockedDetection(null);
    }
  }, [title, lockedDetection]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedSellInput) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const clickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const isHomeNav = href === "/" || href.startsWith("/?");
      if (!isHomeNav || !hasUnsavedSellInput) return;
      const ok = window.confirm(
        "Going back home will clear everything you have filled so far, including attached images. Do you want to proceed?"
      );
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      clearAllSellProgress();
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", clickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", clickCapture, true);
    };
  }, [clearAllSellProgress, hasUnsavedSellInput]);

  const titleValid = title.trim().length >= 3;
  const canProceed = Boolean(titleValid && selectedCategory && selectedCity && selectedSubcity);
  const titleNorm = title.trim().toLowerCase();
  const titleDetection = title.trim().length >= 3 ? detectListingFromTitle(title) : null;
  const allTitleDetections = title.trim().length >= 3 ? detectAllListingsFromTitle(title) : [];
  const suggestionsSuppressed =
    suggestionsDismissedForTitle !== null && titleNorm === suggestionsDismissedForTitle;
  const effectiveDetection =
    lockedDetection && lockedDetection.category === selectedCategory ? lockedDetection : null;
  const detectionAligned = Boolean(effectiveDetection && selectedCategory);
  const showMultiPick = allTitleDetections.length > 1 && !lockedDetection && !suggestionsSuppressed;
  const showSingleSuggestion =
    Boolean(titleDetection) &&
    allTitleDetections.length === 1 &&
    !lockedDetection &&
    !suggestionsSuppressed;
  const titleChangedAfterDetection =
    Boolean(lockedDetection && lockedDetectionTitleNorm && titleNorm && titleNorm !== lockedDetectionTitleNorm);

  function applyConfirmedDetection(d: SellTitleDetection) {
    setCategoryTouched(true);
    setLockedDetection(d);
    setLockedDetectionTitleNorm(titleNorm);
    setSelectedCategory(d.category);
    setHierarchySub(d.subcategory);
    setHierarchyItem(d.constructionItem ?? null);
  }

  const resolveCategoryInsights = useCallback((q: string): CategorySearchInsight[] => {
    return detectAllListingsFromTitle(q).map((d, i) => ({
      key: `${detectionResultKey(d)}-${i}`,
      pathLabel: d.pathLabels.join(" → "),
      categoryValue: d.category,
      payload: d,
    }));
  }, []);

  function handleCategoryInsightPick(insight: CategorySearchInsight) {
    const d = insight.payload as SellTitleDetection | undefined;
    if (d && d.category === insight.categoryValue) {
      applyConfirmedDetection(d);
    }
  }

  if (!user) {
    return (
      <div className="sellPage">
        <main className="sellMain">
          <p>Please sign in to create a listing.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="sellPage">
      <div className="sellHeaderBar">
        <div className="sellHeaderInner">
          <h1 className="sellHeaderTitle">Post ad</h1>
          <button
            className="sellClearBtn"
            type="button"
            onClick={() => {
              clearAllSellProgress();
              setTitle("");
              setSelectedCategory(null);
              setCategoryTouched(false);
              setLockedDetection(null);
              setLockedDetectionTitleNorm("");
              setSuggestionsDismissedForTitle(null);
              setHierarchySub(null);
              setHierarchyItem(null);
              setSelectedCity(null);
              setSelectedSubcity(null);
              setPhotos([]);
              setPhotoPreviews([]);
              setPhotoUrls([]);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <main className="sellMain">
        <section className="sellCard" aria-labelledby="sell-form-title">
          <div className="sellCardInner sellCardInnerCompact">
            <h2 id="sell-form-title" className="sellCardTitle sellCardTitleCompact">
              Post an item to sell
            </h2>

            <form
              className="sellForm"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canProceed || !selectedCategory) return;
                const { urls: cleanImageUrls, warnings: imageWarnings } = sanitizeListingImageUrls(photoUrls);
                imageWarnings.forEach((msg) => showToast(msg, "warning"));
                if (!cleanImageUrls.length) {
                  showToast("Add at least one valid photo before continuing.", "warning");
                  return;
                }
                const det =
                  lockedDetection && lockedDetection.category === selectedCategory ? lockedDetection : null;
                const payload = normalizeSellDraftForStorage({
                  title: title.trim(),
                  category: selectedCategory,
                  city: selectedCity || "",
                  area: selectedSubcity || "",
                  subcity: selectedSubcity || undefined,
                  images: cleanImageUrls,
                  subcategory: (det?.subcategory ?? hierarchySub) || undefined,
                  constructionItem: (det?.constructionItem ?? hierarchyItem) || undefined,
                  detectedHints: det
                    ? {
                        brand: det.brand,
                        model: det.model,
                        constructionItem: det.constructionItem,
                      }
                    : undefined,
                });
                clearListingUndoStack();
                window.localStorage.setItem("sellDraft", JSON.stringify(payload));
                router.push(`/sell/details?category=${encodeURIComponent(selectedCategory)}`);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sellFileInput"
                onChange={handleFilesChange}
              />

              <div className="sellTopGrid">
                <div className="sellFieldCompactWrap">
                  <label className="sellField sellFieldCompact">
                    <span className="sellFieldLabel">
                      Title<span className="sellRequired">*</span>
                    </span>
                    <input
                      id="sell-step1-listing-title"
                      name="sell_listing_headline"
                      type="text"
                      className="sellInput"
                      maxLength={70}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What are you selling?"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck
                      data-1p-ignore
                      data-lpignore="true"
                    />
                  </label>
                  <span className="sellCounter">{title.length} / 70</span>
                </div>
                {titleChangedAfterDetection ? (
                  <div className="sellDetectPanel sellDetectPanelWarn" role="alert">
                    <div className="sellDetectTitle">Title changed after AI suggestion</div>
                    <p className="sellFieldHint">
                      Changing the title can affect the previously suggested category, subcategory, brand, and model.
                      Review the suggested path before continuing.
                    </p>
                  </div>
                ) : null}
                {!titleValid && title.trim().length > 0 ? <p className="sellInlineError">Title must be at least 3 characters.</p> : null}

                {showSingleSuggestion && titleDetection ? (
                  <div className="sellDetectPanel" role="region" aria-label="Suggested listing path">
                    <div className="sellDetectTitle">We detected a listing path from your title</div>
                    <p className="sellDetectPathLine">{titleDetection.pathLabels.join(" → ")}</p>
                    <ul className="sellDetectList">
                      <li>
                        <span className="sellDetectKey">Category</span>
                        <span className="sellDetectVal">{titleDetection.category}</span>
                      </li>
                      <li>
                        <span className="sellDetectKey">Subcategory</span>
                        <span className="sellDetectVal">{titleDetection.subcategory}</span>
                      </li>
                      {titleDetection.constructionItem ? (
                        <li>
                          <span className="sellDetectKey">Item</span>
                          <span className="sellDetectVal">{titleDetection.constructionItem}</span>
                        </li>
                      ) : null}
                      {titleDetection.brand ? (
                        <li>
                          <span className="sellDetectKey">Brand</span>
                          <span className="sellDetectVal">{titleDetection.brand}</span>
                        </li>
                      ) : null}
                      {titleDetection.model ? (
                        <li>
                          <span className="sellDetectKey">Model</span>
                          <span className="sellDetectVal">{titleDetection.model}</span>
                        </li>
                      ) : null}
                    </ul>
                    <div className="sellDetectConfirmRow">
                      <button type="button" className="sellDetectConfirmBtn" onClick={() => applyConfirmedDetection(titleDetection)}>
                        Yes, use this path
                      </button>
                      <button
                        type="button"
                        className="sellDetectManualBtn"
                        onClick={() => setSuggestionsDismissedForTitle(titleNorm)}
                      >
                        I’ll choose manually
                      </button>
                    </div>
                    <p className="sellFieldHint">Confirm to pre-fill category and subcategory for the next step, or pick everything yourself below.</p>
                  </div>
                ) : null}
                {!showMultiPick && effectiveDetection && detectionAligned ? (
                  <div className="sellDetectPanel" role="status">
                    <div className="sellDetectTitle">Confirmed listing path</div>
                    <p className="sellDetectPathLine">{effectiveDetection.pathLabels.join(" → ")}</p>
                    <ul className="sellDetectList">
                      <li>
                        <span className="sellDetectKey">Category</span>
                        <span className="sellDetectVal">{effectiveDetection.category}</span>
                      </li>
                      <li>
                        <span className="sellDetectKey">Subcategory</span>
                        <span className="sellDetectVal">{effectiveDetection.subcategory}</span>
                      </li>
                      {effectiveDetection.constructionItem ? (
                        <li>
                          <span className="sellDetectKey">Item</span>
                          <span className="sellDetectVal">{effectiveDetection.constructionItem}</span>
                        </li>
                      ) : null}
                      {effectiveDetection.brand ? (
                        <li>
                          <span className="sellDetectKey">Brand</span>
                          <span className="sellDetectVal">{effectiveDetection.brand}</span>
                        </li>
                      ) : null}
                      {effectiveDetection.model ? (
                        <li>
                          <span className="sellDetectKey">Model</span>
                          <span className="sellDetectVal">{effectiveDetection.model}</span>
                        </li>
                      ) : null}
                    </ul>
                    <p className="sellFieldHint">This path is saved for the next step. Change category above if you need something else.</p>
                  </div>
                ) : null}
                {titleDetection && selectedCategory && titleDetection.category !== selectedCategory && !lockedDetection ? (
                  <div className="sellDetectPanel sellDetectPanelWarn" role="region" aria-label="Category mismatch">
                    <div className="sellDetectTitle">Title suggests a different category</div>
                    <p className="sellFieldHint">
                      Detected: <strong>{titleDetection.pathLabels.join(" → ")}</strong> ({titleDetection.label})
                    </p>
                    <button
                      type="button"
                      className="sellDetectApplyBtn"
                      onClick={() => applyConfirmedDetection(titleDetection)}
                    >
                      Switch to suggested path
                    </button>
                  </div>
                ) : null}
                {showMultiPick ? (
                  <div className="sellDetectPanel" role="region" aria-label="Multiple matches">
                    <div className="sellDetectTitle">Multiple interpretations — pick one to confirm</div>
                    <p className="sellFieldHint">Each option sets category and subcategory for the next step.</p>
                    <ul className="sellDetectSuggestList">
                      {allTitleDetections.map((d) => (
                        <li key={`${d.label}-${d.pathLabels.join("-")}`}>
                          <button
                            type="button"
                            className="sellDetectSuggestBtn"
                            onClick={() => applyConfirmedDetection(d)}
                          >
                            <span className="sellDetectSuggestPath">{d.pathLabels.join(" → ")}</span>
                            <span className="sellDetectSuggestMeta">{d.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="sellDetectManualBtn sellDetectManualBtnBlock"
                      onClick={() => setSuggestionsDismissedForTitle(titleNorm)}
                    >
                      None of these — I’ll choose manually
                    </button>
                  </div>
                ) : null}

                <SearchableSelect
                  label="Category"
                  value={selectedCategory || ""}
                  placeholder="Select category"
                  options={categories.map((cat) => ({
                    value: cat.name,
                    label: `${cat.icon} ${cat.name}`,
                  }))}
                  resolveCategoryInsights={resolveCategoryInsights}
                  onCategoryInsightPick={handleCategoryInsightPick}
                  onChange={(next) => {
                    setCategoryTouched(true);
                    if (next !== selectedCategory) {
                      setLockedDetection(null);
                      setLockedDetectionTitleNorm("");
                      setHierarchySub(null);
                      setHierarchyItem(null);
                    }
                    setSelectedCategory(next);
                  }}
                />

                <SearchableSelect
                  label="City"
                  value={selectedCity || ""}
                  placeholder="Choose city / ከተማ ይምረጡ"
                  options={ETHIOPIAN_CITIES.map((city) => ({ value: city.value, label: city.label }))}
                  onChange={(next) => {
                    setSelectedCity(next);
                    setSelectedSubcity(null);
                  }}
                />

                <SearchableSelect
                  label="Subcity"
                  value={selectedSubcity || ""}
                  placeholder={selectedCity ? "Choose subcity / ክፍለ ከተማ ይምረጡ" : "Select city first / በመጀመሪያ ከተማ ይምረጡ"}
                  disabled={!selectedCity}
                  groups={selectedCityNode ? [{ label: selectedCityNode.label, options: selectedCityNode.subcities }] : undefined}
                  options={selectedCityNode?.subcities}
                  onChange={(next) => setSelectedSubcity(next)}
                />
              </div>
              {selectedCityNode ? <p className="sellFieldHint">Subcities in {selectedCityNode.label} appear directly under the selected city.</p> : null}

              <div className="sellPhotos">
                <div className="sellPhotosHeader">
                  <span className="sellPhotosTitle">Add photo</span>
                  <span className="sellPhotosHint">
                    <span className="sellPhotosPrimary">First picture is the title picture.</span> Drag order support can come next.
                  </span>
                </div>

                <button type="button" className="sellPhotoDrop" onClick={() => fileInputRef.current?.click()}>
                  <span className="sellPhotoPlus">+</span>
                </button>

                {photoPreviews.length > 0 ? (
                  <div className="sellPhotoPreviewGrid">
                    {photoPreviews.map((preview, index) => (
                      <div key={preview} className="sellPhotoPreviewCard">
                        <Image src={preview} alt={photos[index]?.name || `Upload ${index + 1}`} className="sellPhotoPreview" fill />
                      </div>
                    ))}
                  </div>
                ) : null}

                {photos.length > 0 ? (
                  <ul className="sellPhotoList">
                    {photos.map((file) => (
                      <li key={file.name} className="sellPhotoItem">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {uploading ? <p className="sellFormats">Uploading photos...</p> : null}
                <p className="sellFormats">Supported formats: image files only (JPG, PNG, WebP, etc.), max {MAX_IMAGE_UPLOAD_MB}MB each.</p>
              </div>

              <button type="submit" className="sellNextBtn" disabled={!canProceed}>
                Next
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
