"use client";

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { clearDashboardTab } from "@/lib/dashboardSession";
import { validateImageFile } from "@/lib/imageUploadValidation";

type ProductCard = {
  id: string;
  title: string;
};

const SAVED_ITEMS_KEY = "marketplace.savedItems";

export type VendorProfile = {
  id: string;
  storeName: string;
  slug: string;
  city: string;
  area: string;
  street?: string | null;
  phone: string;
  fullName?: string;
  profileImageUrl?: string;
  profileImageUploadId?: string;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  role: "VENDOR" | "ADMIN";
  fullName?: string;
  vendor?: VendorProfile | null;
};

export type Listing = {
  id: string;
  title: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  price?: string | number | null;
  condition: "NEW" | "USED";
  status: "ACTIVE" | "SOLD" | "ARCHIVED";
  city: string;
  area: string;
  images: { url: string }[];
  vendor?: VendorProfile | null;
};

export type Conversation = {
  id: string;
  listingId: string;
  listing: {
    id: string;
    title: string;
    images: { url: string }[];
  };
  requesterId: string;
  ownerId: string;
  messages?: { id: string; senderId: string; body: string; createdAt: string; readBy?: string[]; seenAt?: string | null }[];
  requester?: { id: string; username?: string; fullName?: string; vendor?: VendorProfile | null; profileImageUrl?: string | null; slug?: string | null };
  owner?: { id: string; username?: string; fullName?: string; vendor?: VendorProfile | null; profileImageUrl?: string | null; slug?: string | null };
  unreadCount?: number;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  storeName?: string;
  city: string;
  area?: string;
  street?: string;
  phone: string;
  profileImageFile?: File | null;
};

type RegisterResult = {
  ok: boolean;
  error?: string;
};

type AppContextValue = {
  user: UserProfile | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  savedItems: ProductCard[];
  toggleSave: (item: ProductCard) => void;
  conversations: Conversation[];
  loadConversations: () => Promise<boolean>;
  startChat: (listingId: string, message: string) => Promise<string | null>;
  sendMessage: (conversationId: string, body: string) => Promise<boolean>;
  unreadMessages: number;
  markNotificationsRead: () => void;
  subscribeSocket: (event: string, handler: (detail: any) => void) => () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [savedItems, setSavedItems] = useState<ProductCard[]>([]);
  const [savedItemsHydrated, setSavedItemsHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [bus] = useState(() => new EventTarget());
  const socketRef = useRef<WebSocket | null>(null);
  const conversationRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRefreshInFlightRef = useRef(false);
  const sendLocksRef = useRef(new Set<string>());

  const applyUser = useCallback((nextUser: UserProfile | null) => {
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.user) {
      applyUser(data.user);
    }
  }, [applyUser]);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setUnreadMessages(0);
      return true;
    }

    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (!res.ok) {
        setConversations([]);
        setUnreadMessages(0);
        return false;
      }
      const data = await res.json();
      const nextConversations = (data.conversations || []) as Conversation[];
      setConversations(nextConversations);
      setUnreadMessages(nextConversations.reduce((sum: number, conversation: Conversation) => sum + (conversation.unreadCount || 0), 0));
      return true;
    } catch {
      setConversations([]);
      setUnreadMessages(0);
      return false;
    }
  }, [user]);

  const scheduleConversationsRefresh = useCallback((delayMs = 220) => {
    if (!user) return;
    if (conversationRefreshTimerRef.current) return;
    conversationRefreshTimerRef.current = setTimeout(() => {
      conversationRefreshTimerRef.current = null;
      if (conversationRefreshInFlightRef.current) return;
      conversationRefreshInFlightRef.current = true;
      void loadConversations().finally(() => {
        conversationRefreshInFlightRef.current = false;
      });
    }, delayMs);
  }, [loadConversations, user]);

  useEffect(() => {
    return () => {
      if (conversationRefreshTimerRef.current) {
        clearTimeout(conversationRefreshTimerRef.current);
        conversationRefreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_ITEMS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProductCard[];
        if (Array.isArray(parsed)) {
          setSavedItems(parsed.filter((item) => item && typeof item.id === "string" && typeof item.title === "string"));
        }
      }
    } catch {
      // ignore malformed local storage data
    }
    setSavedItemsHydrated(true);
  }, []);

  useEffect(() => {
    async function loadServerSaved() {
      if (!user) return;
      try {
        const res = await fetch("/api/saved", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: Array<{ id: string; title: string }> };
        const next = Array.isArray(data.items)
          ? data.items
              .filter((item) => item && typeof item.id === "string" && typeof item.title === "string")
              .map((item) => ({ id: item.id, title: item.title }))
          : [];
        setSavedItems(next);
      } catch {
        // ignore transient load failures
      }
    }
    void loadServerSaved();
  }, [user]);

  useEffect(() => {
    if (!savedItemsHydrated) return;
    if (user) return;
    window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(savedItems));
  }, [savedItems, savedItemsHydrated, user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setConversations([]);
      return;
    }
    loadConversations();
  }, [user, loadConversations]);

  useEffect(() => {
    if (!user) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message:new") {
          bus.dispatchEvent(new CustomEvent("message:new", { detail: payload }));
          scheduleConversationsRefresh();
          return;
        }
        if (payload.type === "notification:count") {
          setUnreadMessages(Number(payload.count) || 0);
        }
      } catch {
        // ignore malformed socket messages
      }
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.close();
    };
  }, [bus, scheduleConversationsRefresh, user]);

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (res.ok) {
        const data = await res.json();
        clearDashboardTab();
        applyUser(data.user);
        await refreshUser();
        return true;
      }
    } catch {}
    return false;
  }, [applyUser, refreshUser]);

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResult> => {
    if (!payload.phone?.trim()) {
      return { ok: false, error: "Phone number is required." };
    }
    if (payload.profileImageFile) {
      const imageValidationError = validateImageFile(payload.profileImageFile);
      if (imageValidationError) {
        return { ok: false, error: imageValidationError };
      }
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          profileImageFile: undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (payload.profileImageFile) {
          const form = new FormData();
          form.append("files", payload.profileImageFile);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
          if (uploadRes.ok) {
            const uploadData = (await uploadRes.json().catch(() => ({}))) as {
              uploads?: Array<{ id: string }>;
            };
            const profileImageUploadId = uploadData.uploads?.[0]?.id;
            if (profileImageUploadId) {
              await fetch("/api/vendors/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullName: payload.fullName.trim(),
                  email: payload.email.trim().toLowerCase(),
                  storeName: payload.storeName?.trim() || undefined,
                  city: payload.city,
                  area: payload.area || "",
                  street: payload.street || undefined,
                  phone: payload.phone.trim(),
                  profileImageUploadId,
                }),
              });
            }
          }
        }
        clearDashboardTab();
        applyUser(data.user);
        return { ok: true };
      }

      const errorData = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: errorData.error || "Registration failed." };
      }
    } catch {}
    return { ok: false, error: "Registration failed." };
  }, [applyUser]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearDashboardTab();
    setUser(null);
    setConversations([]);
    setUnreadMessages(0);
  }, []);

  const toggleSave = useCallback((item: ProductCard) => {
    setSavedItems((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      const isServerBackedUser = Boolean(user);
      if (exists) {
        if (isServerBackedUser) {
          void fetch("/api/saved", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId: item.id }),
          }).catch(() => {
            // Keep optimistic UI; sync can recover on next refresh.
          });
        }
        return prev.filter((p) => p.id !== item.id);
      }
      if (isServerBackedUser) {
        void fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: item.id }),
        })
          .then(async (res) => {
            if (res.ok) return;
            // Roll back optimistic add on server failure.
            setSavedItems((current) => current.filter((entry) => entry.id !== item.id));
          })
          .catch(() => {
            setSavedItems((current) => current.filter((entry) => entry.id !== item.id));
          });
      }
      return [...prev, item];
    });
  }, [user]);

  const startChat = useCallback(async (listingId: string, message: string) => {
    if (!user) return null;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, message: message.trim() }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.conversation?.id) {
        setActiveConversationId(data.conversation.id);
        if (data.message) {
          bus.dispatchEvent(new CustomEvent("message:new", { detail: { conversationId: data.conversation.id, message: data.message } }));
        }
        scheduleConversationsRefresh(0);
        return data.conversation.id as string;
      }
    } catch {
      return null;
    }
    return null;
  }, [user, setActiveConversationId, bus, scheduleConversationsRefresh]);

  const sendMessage = useCallback(async (conversationId: string, body: string) => {
    const trimmed = body.trim();
    if (!user || !trimmed) return false;
    const sendLockKey = `${conversationId}:${trimmed}`;
    if (sendLocksRef.current.has(sendLockKey)) return false;
    sendLocksRef.current.add(sendLockKey);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: "message:send", conversationId, body: trimmed }));
        return true;
      } finally {
        sendLocksRef.current.delete(sendLockKey);
      }
    }

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.message) {
        bus.dispatchEvent(new CustomEvent("message:new", { detail: { conversationId, message: data.message } }));
      }
      scheduleConversationsRefresh(0);
      return true;
    } catch {
      return false;
    } finally {
      sendLocksRef.current.delete(sendLockKey);
    }
  }, [user, socketRef, bus, scheduleConversationsRefresh]);

  const markNotificationsRead = useCallback(() => {
    if (user?.id) {
      void fetch("/api/notifications", { method: "POST" });
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "notification:read" }));
      }
    }
    setUnreadMessages(0);
  }, [user, socketRef, setUnreadMessages]);

  const subscribeSocket = useCallback((event: string, handler: (detail: any) => void) => {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    bus.addEventListener(event, listener);
    return () => bus.removeEventListener(event, listener);
  }, [bus]);

  const value: AppContextValue = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      refreshUser,
      savedItems,
      toggleSave,
      conversations,
      loadConversations,
      startChat,
      sendMessage,
      unreadMessages,
      markNotificationsRead,
      subscribeSocket,
      activeConversationId,
      setActiveConversationId,
    }),
    [
      activeConversationId,
      conversations,
      loadConversations,
      login,
      logout,
      markNotificationsRead,
      refreshUser,
      register,
      savedItems,
      sendMessage,
      startChat,
      subscribeSocket,
      toggleSave,
      unreadMessages,
      user,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}
