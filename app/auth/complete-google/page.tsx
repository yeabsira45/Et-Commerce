"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ETHIOPIAN_CITIES } from "@/lib/cities";
import { formatPhoneForStorage, normalizeLocalPhoneDigits } from "@/lib/phone";

type PendingPayload = {
  email: string;
  fullName: string;
};

export default function CompleteGooglePage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingPayload | null>(null);
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCity = useMemo(
    () => ETHIOPIAN_CITIES.find((item) => item.value === city) || null,
    [city]
  );

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth/google/pending", { cache: "no-store" }).catch(() => null);
      if (!res?.ok) {
        router.replace("/?auth=google_pending_missing");
        return;
      }
      const data = (await res.json().catch(() => ({ pending: null }))) as { pending: PendingPayload | null };
      if (!data.pending) {
        router.replace("/?auth=google_pending_missing");
        return;
      }
      setPending(data.pending);
      setFullName(data.pending.fullName || "");
    })();
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmedName = fullName.trim();
    const trimmedPhone = formatPhoneForStorage(phone);
    if (!trimmedName || !city || !area || !trimmedPhone) {
      setError("Full name, city, subcity, and phone are required.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/google/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: trimmedName,
        storeName: storeName.trim(),
        city,
        area,
        street: street.trim(),
        phone: trimmedPhone,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const payload = (await res?.json().catch(() => ({}))) as { error?: string };
      setError(payload?.error || "Could not complete registration.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (!pending) {
    return (
      <div className="container pageGrid">
        <section className="searchSection">
          <h1 className="searchTitle">Preparing Google sign-in…</h1>
          <p className="modalSub">Please wait.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="container pageGrid">
      <section className="searchSection">
        <h1 className="searchTitle">Complete your vendor profile</h1>
        <p className="modalSub">Finish required details to activate your vendor account. Phone number is mandatory.</p>
        <form className="modalForm" onSubmit={handleSubmit}>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">Email (Google)</span>
            <input className="modalInput" value={pending.email} disabled />
          </label>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">Full Name</span>
            <input className="modalInput" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">Store Name (optional)</span>
            <input className="modalInput" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </label>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">City</span>
            <select className="modalInput" value={city} onChange={(e) => {
              setCity(e.target.value);
              setArea("");
            }} required>
              <option value="">Select city</option>
              {ETHIOPIAN_CITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">Subcity / Area</span>
            <select className="modalInput" value={area} onChange={(e) => setArea(e.target.value)} required disabled={!selectedCity}>
              <option value="">{selectedCity ? "Select subcity" : "Select city first"}</option>
              {selectedCity?.subcities.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">Street (optional)</span>
            <input className="modalInput" value={street} onChange={(e) => setStreet(e.target.value)} />
          </label>
          <label className="modalField modalFieldFull">
            <span className="modalLabel">Phone Number</span>
            <div className="phoneInputWrap">
              <span className="phoneInputPrefix">+251</span>
              <input
                className="modalInput phoneInputControl"
                value={phone}
                onChange={(e) => setPhone(normalizeLocalPhoneDigits(e.target.value))}
                inputMode="numeric"
                pattern="[0-9]{1,10}"
                maxLength={10}
                required
              />
            </div>
          </label>
          {error ? <p className="modalError">{error}</p> : null}
          <div className="modalActions">
            <button className="modalPrimary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Finish registration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
