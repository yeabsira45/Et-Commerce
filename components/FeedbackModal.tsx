"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "./ToastProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FeedbackType = "GENERAL" | "BUG" | "FEATURE";

export function FeedbackModal({ open, onClose }: Props) {
  const showToast = useToast();
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const [type, setType] = useState<FeedbackType>("GENERAL");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return;
    }
    if (render) {
      setClosing(true);
      const t = setTimeout(() => {
        setRender(false);
        setClosing(false);
      }, 180);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  if (!render) return null;

  async function submitFeedback() {
    const trimmed = message.trim();
    if (!trimmed) {
      showToast("Please enter your feedback message.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: trimmed }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(payload.error || "Could not submit feedback.", "error");
        return;
      }
      showToast("Thanks, feedback submitted.", "success");
      setMessage("");
      setType("GENERAL");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`modalOverlay ${closing ? "isClosing" : ""}`} role="dialog" aria-modal="true">
      <div className={`modalCard ${closing ? "isClosing" : ""}`}>
        <h2 className="modalTitle">Send feedback</h2>
        <p className="modalSub">Share bugs, feature requests, or general suggestions.</p>
        <div className="modalField modalFieldFull">
          <span className="modalLabel">Category</span>
          <select className="modalInput" value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
            <option value="GENERAL">General</option>
            <option value="BUG">Bug report</option>
            <option value="FEATURE">Feature request</option>
          </select>
        </div>
        <div className="modalField modalFieldFull">
          <span className="modalLabel">Message</span>
          <textarea
            className="modalInput feedbackInput"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            placeholder="Tell us what can be improved..."
          />
        </div>
        <div className="modalActions">
          <button type="button" className="modalSecondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="modalPrimary" onClick={() => void submitFeedback()} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
