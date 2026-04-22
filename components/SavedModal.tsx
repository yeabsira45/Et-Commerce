"use client";

import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SavedModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Saved Items</h2>
        <p>Your saved listings will appear here.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}