"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Missing reset token.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }

      setSuccess("Password reset successfully. You can now sign in.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Failed to reset password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Reset Password</h1>
      <p style={{ marginBottom: 24, color: "#555" }}>Set your new account password.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Resetting..." : "Reset password"}
        </button>
      </form>

      {error ? <p style={{ color: "crimson", marginTop: 12 }}>{error}</p> : null}
      {success ? <p style={{ color: "green", marginTop: 12 }}>{success}</p> : null}
    </main>
  );
}
