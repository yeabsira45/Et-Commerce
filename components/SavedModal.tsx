"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppContext } from "./AppContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SavedModal({ open, onClose }: Props) {
  const { savedItems } = useAppContext();
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

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

  return (
    <div className={`modalOverlay ${closing ? "isClosing" : ""}`} role="dialog" aria-modal="true">
      <div className={`modalCard ${closing ? "isClosing" : ""}`}>
        <h2 className="modalTitle">Saved items</h2>
        {savedItems.length === 0 ? (
          <p className="modalSub">You have not saved any items yet.</p>
        ) : (
          <ul className="modalList">
            {savedItems.map((item) => (
              <li key={item.id} className="modalListItem">
                <Link href={`/item/${item.id}`} onClick={onClose}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="modalActions">
          <button type="button" className="modalPrimary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

