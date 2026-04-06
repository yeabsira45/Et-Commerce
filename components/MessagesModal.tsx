"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "./AppContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MessagesModal({ open, onClose }: Props) {
  const { conversations, loadConversations, sendMessage, user, subscribeSocket, activeConversationId, setActiveConversationId } = useAppContext();
  const [messages, setMessages] = useState<{ id: string; senderId: string; body: string; createdAt: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || conversations[0] || null,
    [activeConversationId, conversations]
  );

  useEffect(() => {
    if (!open) return;
    loadConversations();
  }, [open, loadConversations]);

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeSocket("message:new", (payload) => {
      if (payload.conversationId === activeConversation?.id) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });
    return () => unsub();
  }, [activeConversation?.id, open, subscribeSocket]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setDraft("");
      return;
    }

    if (activeConversation) {
      setActiveConversationId(activeConversation.id);
    }
  }, [activeConversation, open, setActiveConversationId]);

  useEffect(() => {
    async function loadMessages() {
      if (!activeConversation?.id) {
        setMessages([]);
        return;
      }
      const res = await fetch(`/api/conversations/${activeConversation.id}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    }

    loadMessages();
  }, [activeConversation?.id]);

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
      <div className={`modalCard ${closing ? "isClosing" : ""} modalCardWide`}>
        <h2 className="modalTitle">Messages</h2>
        {!user ? (
          <p className="modalSub">Please sign in to view conversations.</p>
        ) : conversations.length === 0 ? (
          <p className="modalSub">No conversations yet. Start a chat from an item page to open your inbox.</p>
        ) : (
          <div className="modalChatLayout">
            <div className="modalConversationPane">
              {conversations.map((conversation) => {
                const otherPerson = conversation.requesterId === user.id ? conversation.owner : conversation.requester;
                const imageUrl = conversation.listing?.images?.[0]?.url || "/errorpage.svg";
                const displayName = otherPerson?.vendor?.storeName || otherPerson?.username || conversation.listing?.title || "Vendor";

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`modalConversationItem ${activeConversation?.id === conversation.id ? "isActive" : ""}`}
                    onClick={() => setActiveConversationId(conversation.id)}
                  >
                    <img src={imageUrl} alt={displayName} className="modalConversationAvatar" />
                    <div className="modalConversationText">
                      <div className="modalThreadTitle">{displayName}</div>
                      <div className="modalThreadMeta">{conversation.listing?.title}</div>
                      <div className="modalThreadLast">{conversation.messages?.[0]?.body || "Tap to open conversation"}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="modalChatPane">
              {activeConversation ? (
                <>
                  <div className="modalConversationHeader">
                    <div className="modalThreadTitle">
                      {(activeConversation.requesterId === user.id ? activeConversation.owner?.vendor?.storeName || activeConversation.owner?.username : activeConversation.requester?.vendor?.storeName || activeConversation.requester?.username) || "Vendor"}
                    </div>
                    <div className="modalThreadMeta">{activeConversation.listing?.title}</div>
                  </div>

                  <div className="modalChatMessages">
                    {messages.map((message) => (
                      <div key={message.id} className={`modalChatBubble ${message.senderId === user.id ? "isMine" : ""}`}>
                        {message.body}
                      </div>
                    ))}
                  </div>

                  <div className="modalChatComposer">
                    <input className="modalInput" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..." />
                    <button
                      className="modalPrimary"
                      type="button"
                      onClick={async () => {
                        if (!draft.trim() || !activeConversation.id) return;
                        await sendMessage(activeConversation.id, draft.trim());
                        setDraft("");
                      }}
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <p className="modalSub">Select a conversation to view messages.</p>
              )}
            </div>
          </div>
        )}
        <div className="modalActions">
          <button type="button" className="modalPrimary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
