"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "./AppContext";
import { AuthModal } from "./AuthModal";
import styles from "./FloatingSellButton.module.css";

export function FloatingSellButton() {
  const router = useRouter();
  const { user } = useAppContext();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <div className={styles.wrap}>
        <button
          type="button"
          className={`${styles.button} sellAttention`}
          title="Click to sell your item"
          aria-label="Sell an item"
          onClick={() => {
            if (!user) {
              setAuthOpen(true);
              return;
            }
            router.push("/sell");
          }}
        >
          <span className={styles.icon} aria-hidden="true">
            +
          </span>
          <span className={styles.label}>Sell an Item</span>
        </button>
      </div>
      <AuthModal open={authOpen} initialMode="login" onClose={() => setAuthOpen(false)} onSuccess={() => router.push("/sell")} />
    </>
  );
}
