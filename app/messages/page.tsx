"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "@/components/AppContext";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/ToastProvider";

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type TabKey = "all" | "unread" | "sent";

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, conversations, loadConversations, sendMessage, subscribeSocket, activeConversationId, setActiveConversationId } = useAppContext();
  const showToast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [threadReloadNonce, setThreadReloadNonce] = useState(0);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const previousConversationIdRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);

  const requestedConversationId = searchParams.get("conversation");

  const refreshConversationList = useCallback(async () => {
    setLoadingConversations(true);
    setConversationError(null);
    const ok = await loadConversations();
    if (!ok) {
      setConversationError("We could not load your conversations right now. Please try again.");
    }
    setLoadingConversations(false);
  }, [loadConversations]);

  useEffect(() => {
    void refreshConversationList();
  }, [refreshConversationList]);

  useEffect(() => {
    if (requestedConversationId) {
      setActiveConversationId(requestedConversationId);
      setMobileListVisible(false);
    }
  }, [requestedConversationId, setActiveConversationId]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const otherPerson = conversation.requesterId === user?.id ? conversation.owner : conversation.requester;
      const displayName = otherPerson?.vendor?.storeName || otherPerson?.fullName || otherPerson?.username || "";
      const preview = conversation.messages?.map((item) => item.body).join(" ") || "";
      const matchesQuery = !normalized || displayName.toLowerCase().includes(normalized) || preview.toLowerCase().includes(normalized);
      if (!matchesQuery) return false;
      if (tab === "unread") return (conversation.unreadCount || 0) > 0;
      if (tab === "sent") return conversation.requesterId === user?.id;
      return true;
    });
  }, [conversations, query, tab, user?.id]);

  const activeConversation = useMemo(() => {
    if (!filteredConversations.length) return conversations.find((item) => item.id === activeConversationId) || null;
    return filteredConversations.find((item) => item.id === activeConversationId) || filteredConversations[0] || null;
  }, [activeConversationId, conversations, filteredConversations]);

  const activeOtherPerson = useMemo(() => {
    if (!activeConversation || !user) return null;
    return activeConversation.requesterId === user.id ? activeConversation.owner : activeConversation.requester;
  }, [activeConversation, user]);

  useEffect(() => {
    if (activeConversation?.id && activeConversation.id !== activeConversationId) {
      setActiveConversationId(activeConversation.id);
    }
  }, [activeConversation?.id, activeConversationId, setActiveConversationId]);

  useEffect(() => {
    if (!activeConversation?.id || !user) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const conversationId = activeConversation.id;

    async function loadThread() {
      try {
        setLoadingThread(true);
        setThreadError(null);
        const [messagesRes] = await Promise.all([
          fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" }),
          fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }),
        ]);

        if (!messagesRes.ok || cancelled) {
          if (!cancelled) {
            setMessages([]);
            setThreadError("We could not load this conversation. Please try again.");
            setLoadingThread(false);
          }
          return;
        }
        const data = await messagesRes.json();
        if (!cancelled) {
          setMessages(data.messages || []);
          setLoadingThread(false);
        }
        await loadConversations();
      } catch {
        if (!cancelled) {
          setMessages([]);
          setThreadError("We could not load this conversation. Please try again.");
          setLoadingThread(false);
        }
      }
    }

    void loadThread();

    return () => {
      cancelled = true;
    };
  }, [activeConversation?.id, loadConversations, threadReloadNonce, user]);

  useEffect(() => {
    const unsub = subscribeSocket("message:new", (payload) => {
      if (activeConversation?.id && payload.conversationId === activeConversation.id) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === payload.message.id)) {
            return prev;
          }
          return [...prev, payload.message];
        });
      }
      loadConversations();
    });
    return () => unsub();
  }, [activeConversation?.id, loadConversations, subscribeSocket]);

  useEffect(() => {
    const activeThread = threadRef.current;
    if (!activeThread) return;

    const conversationChanged = previousConversationIdRef.current !== activeConversation?.id;
    const messageCountIncreased = messages.length > previousMessageCountRef.current;
    const lastMessage = messages[messages.length - 1];
    const fromCurrentUser = lastMessage?.senderId === user?.id;

    if (conversationChanged) {
      previousConversationIdRef.current = activeConversation?.id || null;
      previousMessageCountRef.current = messages.length;
      stickToBottomRef.current = true;
      setShowNewMessageIndicator(false);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
      return;
    }

    if (messageCountIncreased) {
      if (stickToBottomRef.current || fromCurrentUser) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
        setShowNewMessageIndicator(false);
      } else if (!fromCurrentUser) {
        setShowNewMessageIndicator(true);
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [activeConversation?.id, messages, user?.id]);

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    const nearBottom = distanceFromBottom <= 72;
    stickToBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewMessageIndicator(false);
    }
  }

  async function handleSend() {
    if (!draft.trim() || !activeConversation?.id) return;
    setSending(true);
    const ok = await sendMessage(activeConversation.id, draft.trim());
    setSending(false);
    if (!ok) {
      showToast("Message failed to send. Please try again.", "error");
      return;
    }
    setDraft("");
  }

  if (!user) {
    return (
      <div className="container messagesPage">
        <div className="messagesEmptyCard">
          <h1 className="messagesTitle">Messages</h1>
          <p className="modalSub">Please sign in to view your conversations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container messagesPage">
      <div className="messagesShell">
        <aside className={`messagesSidebar ${mobileListVisible ? "isVisible" : "isHiddenOnMobile"}`}>
          <div className="messagesSidebarTop">
            <h1 className="messagesTitle">Messages</h1>
            <input className="messagesSearch" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by vendor or message..." />
            <div className="messagesTabs">
              {([ ["all", "All"], ["unread", "Unread"], ["sent", "Sent"] ] as [TabKey, string][]).map(([key, label]) => (
                <button key={key} type="button" className={`messagesTab ${tab === key ? "isActive" : ""}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="messagesConversationList">
            {loadingConversations ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={`conversation-skeleton-${index}`} className="messagesConversationItem messagesConversationItemSkeleton" aria-hidden="true">
                  <div className="messagesConversationAvatarSkeleton" />
                  <div className="messagesConversationBody">
                    <div className="productSkeletonLine productSkeletonLineLg" />
                    <div className="productSkeletonLine productSkeletonLineSm" />
                    <div className="productSkeletonLine" />
                  </div>
                </div>
              ))
            ) : conversationError ? (
              <div className="uiStateCard uiStateCardError">
                <h3 className="uiStateTitle">Inbox unavailable</h3>
                <p className="uiStateText">{conversationError}</p>
                <button type="button" className="uiStateAction" onClick={() => void refreshConversationList()}>
                  Retry
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="uiStateCard">
                <h3 className="uiStateTitle">{query.trim() || tab !== "all" ? "No matching conversations" : "No conversations yet"}</h3>
                <p className="uiStateText">
                  {query.trim() || tab !== "all"
                    ? "Try changing your search text or switching back to a different tab."
                    : "Start a chat from any item page and it will appear here."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherPerson = conversation.requesterId === user.id ? conversation.owner : conversation.requester;
                const displayName = otherPerson?.vendor?.storeName || otherPerson?.fullName || otherPerson?.username || "Vendor";
                const imageUrl = otherPerson?.profileImageUrl || otherPerson?.vendor?.profileImageUrl;
                const vendorHref = otherPerson?.slug ? `/vendor/${otherPerson.slug}` : null;

                return (
                  <article
                    key={conversation.id}
                    className={`messagesConversationItem ${activeConversation?.id === conversation.id ? "isActive" : ""}`}
                  >
                    {vendorHref ? (
                      <Link href={vendorHref} className="messagesAvatarLink" aria-label={`View ${displayName} profile`}>
                        <Avatar name={displayName} imageUrl={imageUrl} size={56} className="messagesAvatar" />
                      </Link>
                    ) : (
                      <Avatar name={displayName} imageUrl={imageUrl} size={56} className="messagesAvatar" />
                    )}
                    <button
                      type="button"
                      className="messagesConversationMain"
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setMobileListVisible(false);
                        router.replace(`/messages?conversation=${conversation.id}`);
                      }}
                    >
                      <div className="messagesConversationBody">
                        <div className="messagesConversationRow">
                          <strong>{displayName}</strong>
                          <span className="messagesTime">{formatTime(conversation.messages?.[0]?.createdAt)}</span>
                        </div>
                        <div className="messagesConversationMeta">{conversation.listing?.title}</div>
                        <div className="messagesConversationRow">
                          <span className="messagesPreview">{conversation.messages?.[0]?.body || "No messages yet"}</span>
                          {(conversation.unreadCount || 0) > 0 ? <span className="messagesUnreadBadge">{conversation.unreadCount}</span> : null}
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        <section className={`messagesChatPanel ${mobileListVisible ? "isHiddenOnMobile" : "isVisible"}`}>
          {activeConversation ? (
            <>
              <div className="messagesChatHeader">
                <button type="button" className="messagesBackBtn" onClick={() => setMobileListVisible(true)}>
                  Back
                </button>
                {activeOtherPerson?.slug ? (
                  <Link href={`/vendor/${activeOtherPerson.slug}`} className="messagesHeaderProfileLink">
                    <Avatar
                      name={activeOtherPerson?.vendor?.storeName || activeOtherPerson?.fullName || activeOtherPerson?.username || "Vendor"}
                      imageUrl={activeOtherPerson?.profileImageUrl || activeOtherPerson?.vendor?.profileImageUrl || undefined}
                      size={46}
                      className="messagesHeaderAvatar"
                    />
                    <div>
                      <div className="messagesChatTitle">{activeOtherPerson?.vendor?.storeName || activeOtherPerson?.fullName || activeOtherPerson?.username || "Vendor"}</div>
                      <div className="messagesConversationMeta">{activeConversation.listing?.title}</div>
                    </div>
                  </Link>
                ) : (
                  <>
                    <Avatar
                      name={activeOtherPerson?.vendor?.storeName || activeOtherPerson?.fullName || activeOtherPerson?.username || "Vendor"}
                      imageUrl={activeOtherPerson?.profileImageUrl || activeOtherPerson?.vendor?.profileImageUrl || undefined}
                      size={46}
                      className="messagesHeaderAvatar"
                    />
                    <div>
                      <div className="messagesChatTitle">{activeOtherPerson?.vendor?.storeName || activeOtherPerson?.fullName || activeOtherPerson?.username || "Vendor"}</div>
                      <div className="messagesConversationMeta">{activeConversation.listing?.title}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="messagesThread" ref={threadRef} onScroll={handleThreadScroll}>
                {loadingThread
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`thread-skeleton-${index}`}
                        className={`messagesBubble messagesBubbleSkeleton ${index % 2 === 0 ? "isMine" : ""}`}
                        aria-hidden="true"
                      >
                        <div className="productSkeletonLine productSkeletonLineLg" />
                        <div className="productSkeletonLine productSkeletonLineSm" />
                      </div>
                    ))
                  : null}
                {!loadingThread && threadError ? (
                  <div className="uiStateCard uiStateCardError">
                    <h3 className="uiStateTitle">Conversation unavailable</h3>
                    <p className="uiStateText">{threadError}</p>
                    <button
                      type="button"
                      className="uiStateAction"
                      onClick={() => {
                        setThreadReloadNonce((value) => value + 1);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
                {!loadingThread && !threadError && messages.map((message) => (
                  <div key={message.id} className={`messagesBubble ${message.senderId === user.id ? "isMine" : ""}`}>
                    <div>{message.body}</div>
                    <div className="messagesBubbleTime">{formatTime(message.createdAt)}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {showNewMessageIndicator ? (
                <div className="messagesNewIndicatorWrap">
                  <button
                    type="button"
                    className="messagesNewIndicator"
                    onClick={() => {
                      stickToBottomRef.current = true;
                      setShowNewMessageIndicator(false);
                      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    New message
                  </button>
                </div>
              ) : null}

              <div className="messagesComposer">
                <Avatar
                  name={user.fullName || user.vendor?.storeName || user.username}
                  imageUrl={user.vendor?.profileImageUrl}
                  size={40}
                  className="messagesComposerAvatar"
                />
                <input
                  className="messagesComposerInput"
                  value={draft}
                  disabled={sending || loadingThread || Boolean(threadError)}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Hi, is this still available?"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button className="messagesSendBtn" type="button" onClick={handleSend} disabled={sending || loadingThread || Boolean(threadError)}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="messagesEmptyCard">
              <h2 className="messagesTitle">Messages</h2>
              <p className="modalSub">Start a chat from any item page and your conversation will show up here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
