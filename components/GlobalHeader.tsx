"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "./AppContext";
import { VendorPanel } from "./VendorPanel";
import { AuthModal } from "./AuthModal";
import { SavedModal } from "./SavedModal";
import { NotificationsModal } from "./NotificationsModal";
import { Avatar } from "./Avatar";

function Icon({ kind }: { kind: "bookmark" | "chat" | "bell" | "diamond" | "user" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  const stroke = "currentColor";
  const sw = 2;

  switch (kind) {
    case "bookmark":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3-6 3V4a1 1 0 0 1 1-1Z" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "chat":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-4.5A8 8 0 1 1 21 12Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 22 2 9l4-7h12l4 7-10 13Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <path d="M20 21a8 8 0 1 0-16 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
  }
}

function TooltipIconButton({
  label,
  kind,
  onClick,
  badgeCount,
  animateBadge,
  avatarName,
  avatarId,
}: {
  label: string;
  kind: "bookmark" | "chat" | "bell" | "diamond" | "user";
  onClick: () => void;
  badgeCount?: number;
  animateBadge?: boolean;
  avatarName?: string;
  avatarId?: string | null;
}) {
  return (
    <div className="headerTooltipWrap">
      <button className="iconBtn" aria-label={label} type="button" onClick={onClick}>
        {kind === "user" && avatarName ? <Avatar name={avatarName} imageId={avatarId} size={28} className="headerAvatar" /> : <Icon kind={kind} />}
        {badgeCount && badgeCount > 0 ? <span className={`headerIconBadge ${animateBadge ? "isPopping" : ""}`}>{badgeCount > 99 ? "99+" : badgeCount}</span> : null}
      </button>
      <span className="headerTooltip">{label}</span>
    </div>
  );
}

export function GlobalHeader() {
  const [vendorOpen, setVendorOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [savedOpen, setSavedOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [afterAuthPath, setAfterAuthPath] = useState<string | null>(null);
  const [animateBadge, setAnimateBadge] = useState(false);
  const router = useRouter();
  const { user, unreadMessages } = useAppContext();

  useEffect(() => {
    if (!user || unreadMessages <= 0) return;
    setAnimateBadge(true);
    const timer = window.setTimeout(() => setAnimateBadge(false), 420);
    return () => window.clearTimeout(timer);
  }, [unreadMessages, user]);

  return (
    <>
      <header className="topbar">
        <div className="container topbarInner">
          <Link href="/" className="brand">
            ET-Commerce
          </Link>

          <div className="topActions">
            <TooltipIconButton
              label="Bookmarks"
              kind="bookmark"
              onClick={() => {
                if (!user) {
                  setAuthMode("login");
                  setAfterAuthPath(null);
                  setAuthOpen(true);
                  return;
                }
                setSavedOpen(true);
              }}
            />
            <TooltipIconButton
              label="Messages"
              kind="chat"
              badgeCount={user ? unreadMessages : 0}
              animateBadge={animateBadge}
              onClick={() => {
                if (!user) {
                  setAuthMode("login");
                  setAfterAuthPath("/messages");
                  setAuthOpen(true);
                  return;
                }
                router.push("/messages");
              }}
            />
            <TooltipIconButton label="Notifications" kind="bell" onClick={() => setNotificationsOpen(true)} />
            <TooltipIconButton label="Premium" kind="diamond" onClick={() => undefined} />
            <TooltipIconButton
              label="Profile"
              kind="user"
              avatarName={user?.fullName || user?.username}
              avatarId={user?.profileImageId || user?.vendor?.profileImageId}
              onClick={() => setVendorOpen(true)}
            />

            <button className="pillBtn vendorBtn" onClick={() => setVendorOpen(true)}>
              Vendor
            </button>
            <button
              className="pillBtn sellBtn sellAttention"
              onClick={() => {
                if (!user) {
                  setAuthMode("login");
                  setAfterAuthPath("/sell");
                  setAuthOpen(true);
                } else {
                  router.push("/sell");
                }
              }}
            >
              SELL
            </button>
          </div>
        </div>
      </header>

      <VendorPanel
        open={vendorOpen}
        onClose={() => setVendorOpen(false)}
        user={user}
        onLogin={() => {
          setAuthMode("login");
          setAfterAuthPath(null);
          setAuthOpen(true);
          setVendorOpen(false);
        }}
        onRegister={() => {
          setAuthMode("register");
          setAfterAuthPath(null);
          setAuthOpen(true);
          setVendorOpen(false);
        }}
      />
      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => {
          setAuthOpen(false);
          setAfterAuthPath(null);
        }}
        onSuccess={() => {
          if (afterAuthPath) {
            router.push(afterAuthPath);
            setAfterAuthPath(null);
          }
        }}
      />
      <SavedModal open={savedOpen} onClose={() => setSavedOpen(false)} />
      <NotificationsModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}
