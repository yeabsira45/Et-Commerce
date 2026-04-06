import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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

  const withUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: user.id },
          readAt: null,
        },
      });

      return {
        ...conversation,
        unreadCount,
      };
    })
  );

  return NextResponse.json({ conversations: withUnread });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { listingId, message } = await req.json();
    if (!listingId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { owner: true, vendor: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
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
