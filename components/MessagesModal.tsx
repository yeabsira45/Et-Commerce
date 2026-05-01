"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAppContext } from "./AppContext";
import { useToast } from "./ToastProvider";
import { validateImageFile } from "@/lib/imageUploadValidation";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MessagesModal({ open, onClose }: Props) {
  const { conversations, loadConversations, sendMessage, user, subscribeSocket, activeConversationId, setActiveConversationId } = useAppContext();
  const [messages, setMessages] = useState<{ id: string; senderId: string; body: string; createdAt: string; seenAt?: string | null }[]>([]);
  const [draft, setDraft] = useState("");
  const [sendingImage, setSendingImage] = useState(false);
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const showToast = useToast();

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
      const [res] = await Promise.all([
        fetch(`/api/conversations/${activeConversation.id}/messages`),
        fetch(`/api/conversations/${activeConversation.id}/read`, { method: "POST" }),
      ]);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      await loadConversations();
    }

    void loadMessages();
  }, [activeConversation?.id, loadConversations]);

  useEffect(() => {
    if (!open || !activeConversation?.id) return;
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
  }, [activeConversation?.id, open]);

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

  function renderReceiptMark(message: { senderId: string; seenAt?: string | null }) {
    if (!user || message.senderId !== user.id) return null;
    if (message.seenAt) {
      return <span className="messagesReceipt messagesReceiptSeen" aria-label="Seen">✓✓</span>;
    }
    return <span className="messagesReceipt" aria-label="Sent">✓</span>;
  }

  function parseAttachmentMessage(rawBody: string) {
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
        return { uploadId: null as string | null, imageUrl: null as string | null, text: rawBody };
      }
    }
    if (!rawBody.startsWith("__IMAGE__:")) return { uploadId: null as string | null, imageUrl: null as string | null, text: rawBody };
    const [, rawContent] = rawBody.split("__IMAGE__:");
    const [firstLine, ...rest] = rawContent.split("\n");
    return { uploadId: null as string | null, imageUrl: firstLine?.trim() || null, text: rest.join("\n").trim() };
  }

  async function handleSendMessage() {
    if (!draft.trim() || !activeConversation?.id) return;
    await sendMessage(activeConversation.id, draft.trim());
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
      if (ok) {
        setDraft("");
      } else {
        await fetch(`/api/uploads/${uploadId}`, { method: "DELETE" }).catch(() => null);
      }
    } finally {
      setSendingImage(false);
    }
  }

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
                    <Image src={imageUrl} alt={displayName} className="modalConversationAvatar" width={40} height={40} />
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
                    {messages.map((message) => {
                      const parsed = parseAttachmentMessage(message.body);
                      return (
                        <div key={message.id} className={`modalChatBubble ${message.senderId === user.id ? "isMine" : ""}`}>
                          {parsed.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={parsed.imageUrl} alt="Sent attachment" className="modalChatImage" />
                          ) : null}
                          {parsed.text ? <div className="modalChatBubbleText">{parsed.text}</div> : null}
                          <div className="messagesBubbleMeta">
                            <span className="messagesBubbleTime">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            {renderReceiptMark(message as { senderId: string; seenAt?: string | null })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="modalChatComposer">
                    <textarea
                      className="modalInput modalComposerInput"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        if (e.shiftKey) return;
                        e.preventDefault();
                        void handleSendMessage();
                      }}
                    />
                    <label className="modalSecondary modalAttachBtn" aria-disabled={sendingImage}>
                      {sendingImage ? "Uploading..." : "Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="srOnly"
                        disabled={sendingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleImageUpload(file);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      className="modalPrimary"
                      type="button"
                      onClick={() => void handleSendMessage()}
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
