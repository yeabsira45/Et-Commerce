"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "./AppContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  type?: string;
  data?: Record<string, unknown> | null;
  conversationId?: string | null;
};

export function NotificationsModal({ open, onClose }: Props) {
  const { user, unreadMessages, markNotificationsRead } = useAppContext();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!open || !user) return;
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
      await fetch("/api/notifications", { method: "POST" });
      markNotificationsRead();
    }
    load();
  }, [open, user, markNotificationsRead]);

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

  function typeIcon(type?: string) {
    if (type === "MESSAGE") return "💬";
    if (type === "LISTING") return "🔖";
    if (type === "SYSTEM") return "⚙️";
    return "🔔";
  }

  function resolveNotificationHref(notification: Notification): string | null {
    const payload = notification.data && typeof notification.data === "object"
      ? (notification.data as Record<string, unknown>)
      : null;
    const listingId = payload && typeof payload.listingId === "string" ? payload.listingId : null;
    const conversationIdFromData = payload && typeof payload.conversationId === "string" ? payload.conversationId : null;
    const conversationId = conversationIdFromData || notification.conversationId || null;

    if (conversationId) {
      return `/messages?conversation=${encodeURIComponent(conversationId)}`;
    }
    if (listingId) {
      return `/item/${encodeURIComponent(listingId)}`;
    }
    if (notification.type === "MESSAGE") {
      return "/messages";
    }
    return null;
  }

  return (
    <div className={`modalOverlay ${closing ? "isClosing" : ""}`} role="dialog" aria-modal="true">
      <div className={`modalCard ${closing ? "isClosing" : ""}`}>
        <h2 className="modalTitle">Notifications</h2>
        {!user ? (
          <p className="modalSub">Please sign in to view notifications.</p>
        ) : notifications.length === 0 ? (
          <p className="modalSub">No new notifications right now.</p>
        ) : (
          <ul className="modalList notificationList">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`modalListItem notificationCard notificationCardBtn ${!n.readAt ? "isUnread" : ""}`}
                  onClick={() => {
                    const href = resolveNotificationHref(n);
                    onClose();
                    if (href) {
                      router.push(href);
                    }
                  }}
                >
                  <div className="notificationIcon" aria-hidden="true">{typeIcon(n.type)}</div>
                  <div className="notificationContent">
                    <div className="notificationHeader">
                      <div className="modalThreadTitle">{n.title}</div>
                      <time className="notificationTime">{new Date(n.createdAt).toLocaleString()}</time>
                    </div>
                    <div className="modalThreadMeta notificationBody">{n.body}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {unreadMessages > 0 ? <p className="modalSub">New messages: {unreadMessages}</p> : null}
        <div className="modalActions">
          <button type="button" className="modalPrimary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
