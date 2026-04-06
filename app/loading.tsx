"use client";

export default function AppLoading() {
  return (
    <div className="container pageLoader" role="status" aria-live="polite" aria-label="Loading page">
      <div className="pageLoaderCard">
        <div className="pageLoaderSpinner" aria-hidden="true" />
        <div className="pageLoaderText">Loading…</div>
      </div>
    </div>
  );
}
