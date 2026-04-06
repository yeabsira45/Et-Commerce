"use client";

import React, { useEffect, useState } from "react";
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
};

export function NotificationsModal({ open, onClose }: Props) {
  const { user, unreadMessages, markNotificationsRead } = useAppContext();
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

  return (
    <div className={`modalOverlay ${closing ? "isClosing" : ""}`} role="dialog" aria-modal="true">
      <div className={`modalCard ${closing ? "isClosing" : ""}`}>
        <h2 className="modalTitle">Notifications</h2>
        {!user ? (
          <p className="modalSub">Please sign in to view notifications.</p>
        ) : notifications.length === 0 ? (
          <p className="modalSub">No new notifications right now.</p>
        ) : (
          <ul className="modalList">
            {notifications.map((n) => (
              <li key={n.id} className="modalListItem">
                <div className="modalThreadTitle">{n.title}</div>
                <div className="modalThreadMeta">{n.body}</div>
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
