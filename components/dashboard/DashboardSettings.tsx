"use client";

import React, { useEffect, useState } from "react";
import { useAppContext } from "@/components/AppContext";
import { useToast } from "@/components/ToastProvider";
import { canDeleteAccount } from "@/lib/dashboardPermissions";
import { dashboardToast } from "@/lib/dashboardToastCopy";
import { validatePassword } from "@/lib/passwordRules";

export function DashboardSettings() {
  const { user, logout, refreshUser } = useAppContext();
  const showToast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
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
    const wantsPasswordChange = Boolean(password.trim() || confirmPassword.trim() || currentPassword.trim());
    if (wantsPasswordChange && !currentPassword.trim()) {
      showToast("Current password is required to change your password.", "error");
      return;
    }
    if (password.trim() && password !== confirmPassword) {
      showToast(dashboardToast.passwordsMismatch, "error");
      return;
    }
    if (password.trim()) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        showToast(passwordError, "error");
        return;
      }
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
      await refreshUser();
      showToast(dashboardToast.accountSaved);
      if (wantsPasswordChange && password.trim()) {
        const passwordRes = await fetch("/api/auth/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword: password,
            confirmPassword,
          }),
        });

        if (!passwordRes.ok) {
          const err = (await passwordRes.json().catch(() => ({}))) as { error?: string };
          showToast(err.error || "Password update failed.", "error");
          setSaving(false);
          return;
        }

        showToast("Password changed successfully. Please sign in again.");
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
        await logout();
        return;
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
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    logout();
    showToast(dashboardToast.accountDeletedMock);
  }

  return (
    <div>
      <h2>Settings</h2>
      <p className="modalSub">Update your sign-in details.</p>
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
          <span className="sellFieldLabel">Current password</span>
          <input
            type="password"
            className="sellInput"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Required for password change"
            autoComplete="current-password"
          />
        </label>
        <label className="sellField">
          <span className="sellFieldLabel">New password</span>
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
