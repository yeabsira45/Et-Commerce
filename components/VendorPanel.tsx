"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "./AppContext";
import { useAppContext } from "./AppContext";

export function VendorPanel({
  open,
  onClose,
  user,
  anchorRef,
  onLogin,
  onRegister,
}: {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  anchorRef: React.RefObject<HTMLElement>;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const { logout } = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const topbar = document.querySelector(".topbar");
      const topbarRect = topbar instanceof HTMLElement ? topbar.getBoundingClientRect() : null;
      const isMobile = window.innerWidth <= 640;
      const panelWidth = isMobile ? Math.min(window.innerWidth - 16, 352) : Math.min(window.innerWidth - 20, 352);
      const viewportPadding = 10;
      const nextLeft = Math.min(
        window.innerWidth - panelWidth - viewportPadding,
        Math.max(viewportPadding, rect.right - panelWidth)
      );
      const anchorTop = rect.bottom + 12;
      const headerSafeTop = topbarRect ? topbarRect.bottom + 8 : anchorTop;
      setPosition({
        top: Math.max(anchorTop, headerSafeTop),
        left: nextLeft,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  const panelStyle = useMemo(() => {
    if (!position) return undefined;
    return { top: position.top, left: position.left };
  }, [position]);

  if (!open) return null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      onClose();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="vpDropdownRoot" role="dialog" aria-modal="false" aria-label="Account menu">
      <aside ref={panelRef} className="vpDropdownPanel" style={panelStyle}>
        <div className="vpDropdownArrow" aria-hidden="true" />
        <div className="vpHeader">
          <div className="vpIdentity">
            {user ? (
              <div className="vpIdentityBadge" aria-hidden="true">
                {(user.fullName || user.username || "A").slice(0, 1).toUpperCase()}
              </div>
            ) : null}
            <div className="vpTitle">{user ? `Profile: ${user.username}` : "Welcome!"}</div>
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
              <div className="vpProfileMeta" aria-label="Account summary">
                <div className="vpMetaItem">
                  <div className="vpMetaLabel">Username</div>
                  <div className="vpMetaValue">{user.username}</div>
                </div>
                <div className="vpMetaItem">
                  <div className="vpMetaLabel">Email</div>
                  <div className="vpMetaValue">{user.email}</div>
                </div>
                <div className="vpMetaItem">
                  <div className="vpMetaLabel">Store</div>
                  <div className="vpMetaValue">{user.vendor?.storeName || "Vendor profile"}</div>
                </div>
                <div className="vpMetaItem">
                  <div className="vpMetaLabel">Phone</div>
                  <div className="vpMetaValue">{user.vendor?.phone || "Not set"}</div>
                </div>
              </div>

              <div className="vpSectionLabel">Quick actions</div>
              <Link href="/vendor/dashboard" className="vpAction vpActionPrimary" onClick={onClose}>
                <div className="vpActionTitle">
                  <span className="vpActionIcon" aria-hidden="true">📊</span>
                  <span>Vendor dashboard</span>
                </div>
                <div className="vpActionSub">Manage your listings and activity</div>
              </Link>
              <Link href="/vendor/register" className="vpAction" onClick={onClose}>
                <div className="vpActionTitle">
                  <span className="vpActionIcon" aria-hidden="true">⚙️</span>
                  <span>Account settings</span>
                </div>
                <div className="vpActionSub">Edit store profile and contact details</div>
              </Link>
              <button className="vpAction vpActionDanger" type="button" onClick={() => void handleLogout()} disabled={loggingOut}>
                <div className="vpActionTitle">
                  <span className="vpActionIcon" aria-hidden="true">↩</span>
                  <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
                </div>
                <div className="vpActionSub">
                  {loggingOut ? (
                    <span className="btnLoading">
                      <span className="btnSpinner" aria-hidden="true" />
                      <span>Signing out...</span>
                    </span>
                  ) : (
                    "End your session"
                  )}
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                className="vpAction"
                type="button"
                onClick={() => {
                  onLogin();
                  onClose();
                }}
              >
                <div className="vpActionTitle">
                  <span className="vpActionIcon" aria-hidden="true">🔐</span>
                  <span>Login</span>
                </div>
                <div className="vpActionSub">Sign in to your account</div>
              </button>
              <button
                className="vpAction vpActionPrimary"
                type="button"
                onClick={() => {
                  onRegister();
                  onClose();
                }}
              >
                <div className="vpActionTitle">
                  <span className="vpActionIcon" aria-hidden="true">✨</span>
                  <span>Create account</span>
                </div>
                <div className="vpActionSub">Register your vendor profile</div>
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
