"use client";

import React, { useEffect, useState } from "react";
import { useAppContext } from "@/components/AppContext";
import { useToast } from "@/components/ToastProvider";
import { saveProfileMeta } from "@/lib/localProfile";
import { canDeleteAccount } from "@/lib/dashboardPermissions";
import { dashboardToast } from "@/lib/dashboardToastCopy";

export function DashboardSettings() {
  const { user, logout, refreshUser } = useAppContext();
  const showToast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || user.username || "");
    setEmail(user.email || "");
  }, [user]);

  if (!user) return null;

  const account = user;

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim() && password !== confirmPassword) {
      showToast(dashboardToast.passwordsMismatch, "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vendors/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          storeName: account.vendor?.storeName || "",
          city: account.vendor?.city || "",
          area: account.vendor?.area || "",
          street: account.vendor?.street || "",
          phone: account.vendor?.phone || "",
        }),
      });
      if (!res.ok) {
        showToast(dashboardToast.accountSaveFailed, "error");
        setSaving(false);
        return;
      }
      saveProfileMeta({
        userId: account.id,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phone: account.vendor?.phone || "",
        storeName: account.vendor?.storeName,
        city: account.vendor?.city,
      });
      window.dispatchEvent(new Event("local-profile:changed"));
      await refreshUser();
      showToast(dashboardToast.accountSaved);
      if (password.trim()) {
        showToast(dashboardToast.passwordDemoNote);
        setPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteAccount() {
    if (!canDeleteAccount(account.id, account.role, account.id)) {
      showToast(dashboardToast.accountDeleteBlocked, "error");
      return;
    }
    if (account.id === "demo-user") {
      showToast(dashboardToast.accountDemoDeleteBlocked, "error");
      return;
    }
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    logout();
    showToast(dashboardToast.accountDeletedMock);
  }

  return (
    <div>
      <h2>Settings</h2>
      <p className="modalSub">Update your sign-in details. Password changes are demo-only and are not stored.</p>
      <form className="sellForm" onSubmit={handleSaveAccount} style={{ marginTop: 16, maxWidth: 420 }}>
        <label className="sellField">
          <span className="sellFieldLabel">Display name</span>
          <input className="sellInput" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label className="sellField">
          <span className="sellFieldLabel">Email</span>
          <input type="email" className="sellInput" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="sellField">
          <span className="sellFieldLabel">New password (demo only — not persisted)</span>
          <input
            type="password"
            className="sellInput"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to skip"
            autoComplete="new-password"
          />
        </label>
        <label className="sellField">
          <span className="sellFieldLabel">Confirm new password</span>
          <input
            type="password"
            className="sellInput"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Required if changing password"
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="sellNextBtn" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <h3 className="sellCardTitle" style={{ fontSize: "1rem", marginBottom: 8 }}>
          Danger zone
        </h3>
        <button type="button" className="modalSecondary" onClick={handleDeleteAccount} style={{ borderColor: "#fca5a5", color: "#b91c1c" }}>
          Delete my account
        </button>
      </div>
    </div>
  );
}
