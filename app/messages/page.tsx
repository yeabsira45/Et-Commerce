"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "@/components/AppContext";
import { messageService } from "@/lib/messageService";
import { Avatar } from "@/components/Avatar";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const previousConversationIdRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);

  const requestedConversationId = searchParams.get("conversation");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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
    setMessages(messageService.getMessages(activeConversation.id));
    messageService.markConversationRead(activeConversation.id, user.id);
    loadConversations();
  }, [activeConversation?.id, loadConversations, user]);

  useEffect(() => {
    const unsub = subscribeSocket("message:new", (payload) => {
      if (activeConversation?.id && payload.conversationId === activeConversation.id) {
        setMessages(messageService.getMessages(activeConversation.id));
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
    await sendMessage(activeConversation.id, draft.trim());
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
            {filteredConversations.length === 0 ? (
              <p className="modalSub">No conversations yet.</p>
            ) : (
              filteredConversations.map((conversation) => {
                const otherPerson = conversation.requesterId === user.id ? conversation.owner : conversation.requester;
                const displayName = otherPerson?.vendor?.storeName || otherPerson?.fullName || otherPerson?.username || "Vendor";
                const imageId = otherPerson?.profileImageId || otherPerson?.vendor?.profileImageId;
                const vendorHref = otherPerson?.slug ? `/vendor/${otherPerson.slug}` : null;

                return (
                  <article
                    key={conversation.id}
                    className={`messagesConversationItem ${activeConversation?.id === conversation.id ? "isActive" : ""}`}
                  >
                    {vendorHref ? (
                      <Link href={vendorHref} className="messagesAvatarLink" aria-label={`View ${displayName} profile`}>
                        <Avatar name={displayName} imageId={imageId} size={56} className="messagesAvatar" />
                      </Link>
                    ) : (
                      <Avatar name={displayName} imageId={imageId} size={56} className="messagesAvatar" />
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
                      imageId={activeOtherPerson?.profileImageId || activeOtherPerson?.vendor?.profileImageId || undefined}
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
                      imageId={activeOtherPerson?.profileImageId || activeOtherPerson?.vendor?.profileImageId || undefined}
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
                {messages.map((message) => (
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
                  imageId={user.profileImageId || user.vendor?.profileImageId}
                  size={40}
                  className="messagesComposerAvatar"
                />
                <input
                  className="messagesComposerInput"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Hi, is this still available?"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button className="messagesSendBtn" type="button" onClick={handleSend}>Send</button>
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
