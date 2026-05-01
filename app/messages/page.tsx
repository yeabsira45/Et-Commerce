"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "@/components/AppContext";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/ToastProvider";
import { validateImageFile } from "@/lib/imageUploadValidation";

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  seenAt?: string | null;
};

type TabKey = "all" | "unread" | "sent";

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderReceiptMark(message: Message, currentUserId?: string) {
  if (!currentUserId || message.senderId !== currentUserId) return null;
  if (message.seenAt) {
    return <span className="messagesReceipt messagesReceiptSeen" aria-label="Seen">✓✓</span>;
  }
  return <span className="messagesReceipt" aria-label="Sent">✓</span>;
}

type AttachmentMessageParts = {
  uploadId: string | null;
  imageUrl: string | null;
  text: string;
};

function parseAttachmentMessage(rawBody: string): AttachmentMessageParts {
  if (rawBody.startsWith("__ATTACHMENT__:")) {
    const [, payloadRaw] = rawBody.split("__ATTACHMENT__:");
    const [jsonLine, ...rest] = payloadRaw.split("\n");
    try {
      const parsed = JSON.parse(jsonLine) as { uploadId?: string; url?: string };
      return {
        uploadId: typeof parsed.uploadId === "string" ? parsed.uploadId : null,
        imageUrl: typeof parsed.url === "string" ? parsed.url : null,
        text: rest.join("\n").trim(),
      };
    } catch {
      return { uploadId: null, imageUrl: null, text: rawBody };
    }
  }
  if (rawBody.startsWith("__IMAGE__:")) {
    const [, rawContent] = rawBody.split("__IMAGE__:");
    const [firstLine, ...rest] = rawContent.split("\n");
    return {
      uploadId: null,
      imageUrl: firstLine?.trim() || null,
      text: rest.join("\n").trim(),
    };
  }
  return { uploadId: null, imageUrl: null, text: rawBody };
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
  const [sendingImage, setSendingImage] = useState(false);
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
    if (!activeConversation?.id || !user) return;
    const conversationId = activeConversation.id;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void (async () => {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" }).catch(() => null);
        if (!res?.ok) return;
        const data = await res.json().catch(() => ({ messages: [] }));
        setMessages(data.messages || []);
      })();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [activeConversation?.id, user]);

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

  async function handleImageUpload(file: File) {
    if (!activeConversation?.id) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      showToast(validationError, "warning");
      return;
    }
    setSendingImage(true);
    try {
      const form = new FormData();
      form.append("files", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        showToast("Image upload failed.", "error");
        return;
      }
      const uploadData = (await uploadRes.json().catch(() => ({}))) as { uploads?: Array<{ id?: string; url?: string }> };
      const uploadId = uploadData.uploads?.[0]?.id;
      const imageUrl = uploadData.uploads?.[0]?.url;
      if (!imageUrl || !uploadId) {
        showToast("Image upload failed.", "error");
        return;
      }
      const payload = `__ATTACHMENT__:${JSON.stringify({ uploadId, url: imageUrl })}${draft.trim() ? `\n${draft.trim()}` : ""}`;
      const ok = await sendMessage(activeConversation.id, payload);
      if (!ok) {
        await fetch(`/api/uploads/${uploadId}`, { method: "DELETE" }).catch(() => null);
        showToast("Could not send image message.", "error");
        return;
      }
      setDraft("");
    } finally {
      setSendingImage(false);
    }
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
                          <span className="messagesPreview">
                            {conversation.messages?.[0]?.body?.startsWith("__IMAGE__:") || conversation.messages?.[0]?.body?.startsWith("__ATTACHMENT__:")
                              ? "Image"
                              : conversation.messages?.[0]?.body || "No messages yet"}
                          </span>
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
                {!loadingThread && !threadError && messages.map((message) => {
                  const parsed = parseAttachmentMessage(message.body);
                  return (
                    <div key={message.id} className={`messagesBubble ${message.senderId === user.id ? "isMine" : ""}`}>
                      {parsed.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={parsed.imageUrl} alt="Sent attachment" className="messagesBubbleImage" />
                      ) : null}
                      {parsed.text ? <div className="messagesBubbleText">{parsed.text}</div> : null}
                      <div className="messagesBubbleMeta">
                        <span className="messagesBubbleTime">{formatTime(message.createdAt)}</span>
                        {renderReceiptMark(message, user.id)}
                      </div>
                    </div>
                  );
                })}
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
                <textarea
                  className="messagesComposerInput"
                  value={draft}
                  disabled={sending || sendingImage || loadingThread || Boolean(threadError)}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Hi, is this still available?"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (e.shiftKey) return;
                    e.preventDefault();
                    void handleSend();
                  }}
                />
                <label className="messagesAttachBtn" aria-disabled={sendingImage || sending || loadingThread || Boolean(threadError)}>
                  {sendingImage ? "Uploading..." : "📎"}
                  <input
                    type="file"
                    accept="image/*"
                    className="srOnly"
                    disabled={sendingImage || sending || loadingThread || Boolean(threadError)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleImageUpload(file);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button className="messagesSendBtn" type="button" onClick={() => void handleSend()} disabled={sending || sendingImage || loadingThread || Boolean(threadError)}>
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
