import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function extractUploadIdsFromMessageBody(body: string) {
  const matches = body.match(/\/api\/uploads\/([a-z0-9]+)/gi) || [];
  const ids = matches
    .map((entry) => entry.match(/\/api\/uploads\/([a-z0-9]+)/i)?.[1] || "")
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ conversations: [] }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ requesterId: user.id }, { ownerId: user.id }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } },
      requester: { include: { vendor: true } },
      owner: { include: { vendor: true } },
      messages: { take: 5, orderBy: { createdAt: "desc" } },
    },
  });

  const conversationIds = conversations.map((conversation) => conversation.id);
  const unreadRows =
    conversationIds.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: user.id },
            readAt: null,
          },
          _count: { _all: true },
        })
      : [];

  const unreadByConversation = new Map(
    unreadRows.map((row) => [row.conversationId, row._count._all])
  );
  const withUnread = conversations.map((conversation) => ({
    ...conversation,
    unreadCount: unreadByConversation.get(conversation.id) || 0,
  }));

  return NextResponse.json({ conversations: withUnread });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const listingId = typeof payload.listingId === "string" ? payload.listingId : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!listingId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { owner: true, vendor: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (
      listing.status !== "ACTIVE" ||
      listing.moderationState !== "APPROVED" ||
      (listing.expiresAt && listing.expiresAt <= new Date())
    ) {
      return NextResponse.json({ error: "Listing is not available for messaging" }, { status: 400 });
    }

    if (listing.ownerId === user.id) {
      return NextResponse.json({ error: "Cannot message your own listing" }, { status: 400 });
    }

    const ownerId = listing.ownerId;

    const conversation = await prisma.conversation.upsert({
      where: {
        listingId_requesterId_ownerId: {
          listingId,
          requesterId: user.id,
          ownerId,
        },
      },
      update: {},
      create: {
        listingId,
        requesterId: user.id,
        ownerId,
      },
    });

    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        body: message,
      },
    });

    const attachmentUploadIds = extractUploadIdsFromMessageBody(message);
    if (attachmentUploadIds.length > 0) {
      await prisma.upload.updateMany({
        where: {
          id: { in: attachmentUploadIds },
          ownerUserId: user.id,
        },
        data: {
          linkedEntityType: "MESSAGE_ATTACHMENT",
          linkedEntityId: conversation.id,
        },
      });
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await prisma.notification.create({
      data: {
        senderId: user.id,
        receiverId: ownerId,
        type: "MESSAGE",
        title: "New message",
        body: `New message about "${listing.title}"`,
        conversationId: conversation.id,
        data: { conversationId: conversation.id, listingId },
      },
    });

    return NextResponse.json({ conversation, message: newMessage });
  } catch {
    return NextResponse.json({ error: "Failed to start conversation" }, { status: 500 });
  }
}
