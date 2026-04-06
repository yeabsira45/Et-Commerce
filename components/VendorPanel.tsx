"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "./AppContext";
import { useAppContext } from "./AppContext";

export function VendorPanel({
  open,
  onClose,
  user,
  onLogin,
  onRegister,
}: {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const { logout } = useAppContext();
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
      }, 220);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  if (!render) return null;

  return (
    <div className={`vpOverlay ${closing ? "isClosing" : ""}`} role="dialog" aria-modal="true" aria-label="Vendor menu">
      <button className="vpBackdrop" onClick={onClose} aria-label="Close vendor menu" />
      <aside className={`vpPanel ${closing ? "isClosing" : ""}`}>
        <div className="vpHeader">
          <div>
            <div className="vpTitle">
              {user ? `Profile: ${user.username}` : "Welcome!"}
            </div>
            <div className="vpSub">
              {user?.vendor
                ? `${user.vendor.storeName}${user.vendor.city ? ` • ${user.vendor.city}` : ""}`
                : "Sign in to manage your listings and store settings."}
            </div>
          </div>
          <button className="vpClose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="vpActions">
          {user ? (
            <>
              <div className="vpAction">
                <div className="vpActionTitle">Username</div>
                <div className="vpActionSub">{user.username}</div>
              </div>
              <div className="vpAction">
                <div className="vpActionTitle">Email</div>
                <div className="vpActionSub">{user.email}</div>
              </div>
              <div className="vpAction">
                <div className="vpActionTitle">Store</div>
                <div className="vpActionSub">{user.vendor?.storeName || "Vendor profile"}</div>
              </div>
              <div className="vpAction">
                <div className="vpActionTitle">Phone number</div>
                <div className="vpActionSub">{user.vendor?.phone || "Not set"}</div>
              </div>
              <Link href="/vendor/dashboard" className="vpAction" onClick={onClose}>
                <div className="vpActionTitle">Vendor dashboard</div>
                <div className="vpActionSub">Manage your listings</div>
              </Link>
              <Link href="/vendor/register" className="vpAction" onClick={onClose}>
                <div className="vpActionTitle">Edit Store Profile</div>
                <div className="vpActionSub">Update store details</div>
              </Link>
              <button className="vpAction" type="button" onClick={logout}>
                <div className="vpActionTitle">Sign out</div>
                <div className="vpActionSub">End your session</div>
              </button>
            </>
          ) : (
            <>
              <button className="vpAction" type="button" onClick={onLogin}>
                <div className="vpActionTitle">Login</div>
                <div className="vpActionSub">Sign in to your vendor account</div>
              </button>
              <button className="vpAction" type="button" onClick={onRegister}>
                <div className="vpActionTitle">Register</div>
                <div className="vpActionSub">Create a new vendor account</div>
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
