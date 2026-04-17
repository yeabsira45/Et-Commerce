"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export type ToastVariant = "success" | "warning" | "error";

type ToastItem = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<((message: string, variant?: ToastVariant) => void) | null>(null);

const DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toastStack" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toastStackItem ${
              t.variant === "success" ? "toastStackItemSuccess" : t.variant === "warning" ? "toastStackItemWarning" : "toastStackItemError"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, variant?: ToastVariant) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
