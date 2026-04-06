"use client";

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { clearPersistedUser, enrichUserWithLocalProfile, persistUser, readPersistedUser, saveProfileMeta } from "@/lib/localProfile";
import { clearDashboardTab } from "@/lib/dashboardSession";
import { messageService } from "@/lib/messageService";
import { saveImage } from "@/lib/indexedDB";
import { createLocalVendorAccount, findLocalVendorAccount, toUserProfile, updateLocalVendorAvatar } from "@/lib/localVendors";

type ProductCard = {
  id: string;
  title: string;
};

export type VendorProfile = {
  id: string;
  storeName: string;
  slug: string;
  city: string;
  area: string;
  street?: string | null;
  phone: string;
  fullName?: string;
  profileImageId?: string;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  role: "VENDOR" | "ADMIN";
  fullName?: string;
  profileImageId?: string;
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
  messages?: { id: string; senderId: string; body: string; createdAt: string; readBy?: string[] }[];
  requester?: { id: string; username?: string; fullName?: string; vendor?: VendorProfile | null; profileImageId?: string | null; slug?: string | null };
  owner?: { id: string; username?: string; fullName?: string; vendor?: VendorProfile | null; profileImageId?: string | null; slug?: string | null };
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
  logout: () => void;
  refreshUser: () => Promise<void>;
  savedItems: ProductCard[];
  toggleSave: (item: ProductCard) => void;
  conversations: Conversation[];
  loadConversations: () => Promise<void>;
  startChat: (listingId: string, message: string) => Promise<string | null>;
  sendMessage: (conversationId: string, body: string) => Promise<void>;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [bus] = useState(() => new EventTarget());

  const applyUser = useCallback((nextUser: UserProfile | null) => {
    const enriched = enrichUserWithLocalProfile(nextUser);
    setUser(enriched);
    if (enriched) {
      persistUser(enriched);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
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
      return;
    }
    const nextConversations = messageService.getConversations(user.id) as Conversation[];
    setConversations(nextConversations);
    setUnreadMessages(nextConversations.reduce((sum: number, conversation: Conversation) => sum + (conversation.unreadCount || 0), 0));
  }, [user]);

  useEffect(() => {
    const persisted = readPersistedUser();
    if (persisted) {
      setUser(enrichUserWithLocalProfile(persisted));
    }
  }, []);

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
    function handleMessagesChanged() {
      loadConversations();
    }

    window.addEventListener("local-messages:changed", handleMessagesChanged as EventListener);
    return () => window.removeEventListener("local-messages:changed", handleMessagesChanged as EventListener);
  }, [loadConversations]);

  useEffect(() => {
    function handleProfileChanged() {
      setUser((current) => enrichUserWithLocalProfile(current));
    }

    window.addEventListener("local-profile:changed", handleProfileChanged as EventListener);
    return () => window.removeEventListener("local-profile:changed", handleProfileChanged as EventListener);
  }, []);

  async function login(identifier: string, password: string): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user?.id === "demo-user") {
          clearPersistedUser();
        }
        clearDashboardTab();
        applyUser(data.user);
        await refreshUser();
        return true;
      }
    } catch {
      // local fallback below
    }

    const localVendor = findLocalVendorAccount(identifier, password);
    if (!localVendor) return false;
    clearDashboardTab();
    applyUser(toUserProfile(localVendor));
    await refreshUser();
    return true;
  }

  async function register(payload: RegisterPayload): Promise<RegisterResult> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedPhone = payload.phone.trim();
    const resolvedStoreName = payload.storeName?.trim() || `${payload.fullName.trim()}'s Store`;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        saveProfileMeta({
          userId: data.user.id,
          email: normalizedEmail,
          fullName: payload.fullName.trim(),
          phone: normalizedPhone,
          storeName: resolvedStoreName,
          city: payload.city,
          profileImageId: payload.profileImageFile ? data.user.id : undefined,
        });
        if (payload.profileImageFile) {
          try {
            await saveImage(data.user.id, payload.profileImageFile);
          } catch {
            // initials avatar fallback is fine if IndexedDB fails
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
    } catch {
      // local fallback below
    }

    try {
      const localVendor = createLocalVendorAccount({
        fullName: payload.fullName.trim(),
        email: normalizedEmail,
        password: payload.password,
        storeName: payload.storeName?.trim(),
        city: payload.city,
        subcity: payload.area?.trim() || "",
        area: payload.street?.trim(),
        phone: normalizedPhone,
        avatarId: undefined,
      });

      const avatarId = payload.profileImageFile ? localVendor.userId : undefined;
      saveProfileMeta({
        userId: localVendor.userId,
        email: localVendor.email,
        fullName: localVendor.fullName,
        phone: localVendor.phone,
        storeName: localVendor.storeName,
        city: localVendor.city,
        profileImageId: avatarId,
      });

      if (payload.profileImageFile) {
        try {
          await saveImage(avatarId || localVendor.userId, payload.profileImageFile);
          updateLocalVendorAvatar(localVendor.userId, avatarId);
        } catch {
          // initials avatar fallback is fine if IndexedDB fails
        }
      }

      window.dispatchEvent(new Event("local-profile:changed"));
      clearDashboardTab();
      applyUser(toUserProfile({ ...localVendor, avatarId }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearPersistedUser();
    clearDashboardTab();
    setUser(null);
    setConversations([]);
    setUnreadMessages(0);
  }

  function toggleSave(item: ProductCard) {
    setSavedItems((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  }

  async function startChat(listingId: string, message: string) {
    if (!user) return null;

    const res = await fetch(`/api/listings/${listingId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const listing = data.listing;
    if (!listing?.vendor?.userId || listing.vendor.userId === user.id) return null;

    const conversation = messageService.ensureConversation({
      listing: {
        id: listing.id,
        title: listing.title,
        images: listing.images || [],
      },
      requester: {
        id: user.id,
        fullName: user.fullName || user.username,
        storeName: user.vendor?.storeName,
        profileImageId: user.profileImageId || user.vendor?.profileImageId,
        slug: user.vendor?.slug,
      },
      owner: {
        id: listing.vendor.userId,
        fullName: listing.vendor.fullName || listing.vendor.storeName || "Vendor",
        storeName: listing.vendor.storeName,
        profileImageId: listing.vendor.profileImageId,
        slug: listing.vendor.slug,
      },
    });

    if (message.trim()) {
      const nextMessage = messageService.sendMessage({
        conversationId: conversation.id,
        senderId: user.id,
        body: message.trim(),
      });
      bus.dispatchEvent(new CustomEvent("message:new", { detail: { conversationId: conversation.id, message: nextMessage } }));
    }

    setActiveConversationId(conversation.id);
    await loadConversations();
    return conversation.id;
  }

  async function sendMessage(conversationId: string, body: string) {
    if (!user || !body.trim()) return;
    const nextMessage = messageService.sendMessage({
      conversationId,
      senderId: user.id,
      body: body.trim(),
    });
    bus.dispatchEvent(new CustomEvent("message:new", { detail: { conversationId, message: nextMessage } }));
    await loadConversations();
  }

  function markNotificationsRead() {
    setUnreadMessages(0);
  }

  function subscribeSocket(event: string, handler: (detail: any) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    bus.addEventListener(event, listener);
    return () => bus.removeEventListener(event, listener);
  }

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
    [user, savedItems, conversations, unreadMessages, activeConversationId, loadConversations, refreshUser]
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
