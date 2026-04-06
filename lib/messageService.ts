type StoredChatUser = {
  id: string;
  fullName: string;
  storeName?: string;
  profileImageId?: string;
  slug?: string;
};

type StoredChatListing = {
  id: string;
  title: string;
  images: { url: string }[];
};

type StoredMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readBy: string[];
};

type StoredConversation = {
  id: string;
  listingId: string;
  requesterId: string;
  ownerId: string;
  requester: StoredChatUser;
  owner: StoredChatUser;
  listing: StoredChatListing;
  createdAt: string;
  updatedAt: string;
};

const CONVERSATIONS_KEY = "marketplace.messages.conversations";
const MESSAGES_KEY = "marketplace.messages.items";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("local-messages:changed"));
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

function normalizeChatStore() {
  const conversations = readJson<StoredConversation[]>(CONVERSATIONS_KEY, []);
  const messages = readJson<StoredMessage[]>(MESSAGES_KEY, []);
  if (!conversations.length) {
    return { conversations, messages };
  }

  const grouped = new Map<string, StoredConversation[]>();
  conversations.forEach((conversation) => {
    const key = pairKey(conversation.requesterId, conversation.ownerId);
    grouped.set(key, [...(grouped.get(key) || []), conversation]);
  });

  let changed = false;
  const nextMessages = [...messages];
  const normalizedConversations: StoredConversation[] = [];

  grouped.forEach((group) => {
    if (group.length === 1) {
      normalizedConversations.push(group[0]);
      return;
    }

    changed = true;
    const sorted = [...group].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const canonical = sorted[0];
    const duplicateIds = new Set(sorted.slice(1).map((item) => item.id));

    normalizedConversations.push(canonical);
    nextMessages.forEach((message) => {
      if (duplicateIds.has(message.conversationId)) {
        message.conversationId = canonical.id;
      }
    });
  });

  const dedupedMessages = nextMessages
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .filter((message, index, arr) => {
      const prev = arr[index - 1];
      return !prev || !(prev.conversationId === message.conversationId && prev.senderId === message.senderId && prev.body === message.body && prev.createdAt === message.createdAt);
    });

  if (changed) {
    writeJson(CONVERSATIONS_KEY, normalizedConversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    writeJson(MESSAGES_KEY, dedupedMessages);
  }

  return { conversations: changed ? normalizedConversations : conversations, messages: changed ? dedupedMessages : messages };
}

export const messageService = {
  getMessages(conversationId: string) {
    const { messages } = normalizeChatStore();
    return messages.filter((item) => item.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  sendMessage(message: { conversationId: string; senderId: string; body: string }) {
    const messages = readJson<StoredMessage[]>(MESSAGES_KEY, []);
    const nextMessage: StoredMessage = {
      id: uid("msg"),
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      createdAt: new Date().toISOString(),
      readBy: [message.senderId],
    };
    messages.push(nextMessage);
    writeJson(MESSAGES_KEY, messages);

    const conversations = readJson<StoredConversation[]>(CONVERSATIONS_KEY, []);
    const nextConversations = conversations.map((item) =>
      item.id === message.conversationId ? { ...item, updatedAt: nextMessage.createdAt } : item
    );
    writeJson(CONVERSATIONS_KEY, nextConversations);
    return nextMessage;
  },

  ensureConversation(payload: {
    listing: StoredChatListing;
    requester: StoredChatUser;
    owner: StoredChatUser;
  }) {
    const { conversations } = normalizeChatStore();
    const existing = conversations.find(
      (item) => pairKey(item.requesterId, item.ownerId) === pairKey(payload.requester.id, payload.owner.id)
    );
    if (existing) {
      const nextConversation: StoredConversation = {
        ...existing,
        listingId: payload.listing.id,
        listing: payload.listing,
        requester: payload.requester,
        owner: payload.owner,
        updatedAt: new Date().toISOString(),
      };
      writeJson(
        CONVERSATIONS_KEY,
        conversations.map((item) => (item.id === existing.id ? nextConversation : item))
      );
      return nextConversation;
    }

    const createdAt = new Date().toISOString();
    const conversation: StoredConversation = {
      id: uid("conv"),
      listingId: payload.listing.id,
      requesterId: payload.requester.id,
      ownerId: payload.owner.id,
      requester: payload.requester,
      owner: payload.owner,
      listing: payload.listing,
      createdAt,
      updatedAt: createdAt,
    };
    conversations.unshift(conversation);
    writeJson(CONVERSATIONS_KEY, conversations);
    return conversation;
  },

  getConversations(userId: string) {
    const { conversations, messages } = normalizeChatStore();

    return conversations
      .filter((item) => item.requesterId === userId || item.ownerId === userId)
      .map((conversation) => {
        const thread = messages
          .filter((message) => message.conversationId === conversation.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const unreadCount = thread.filter((message) => message.senderId !== userId && !message.readBy.includes(userId)).length;
        return {
          ...conversation,
          messages: thread,
          unreadCount,
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  markConversationRead(conversationId: string, userId: string) {
    const messages = readJson<StoredMessage[]>(MESSAGES_KEY, []);
    const nextMessages = messages.map((message) => {
      if (message.conversationId !== conversationId || message.readBy.includes(userId)) return message;
      return { ...message, readBy: [...message.readBy, userId] };
    });
    writeJson(MESSAGES_KEY, nextMessages);
  },
};
