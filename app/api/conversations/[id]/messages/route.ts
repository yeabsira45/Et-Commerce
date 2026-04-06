import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ messages: [] }, { status: 401 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
  });
  if (!conversation || (conversation.requesterId !== user.id && conversation.ownerId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { listing: true },
  });
  if (!conversation || (conversation.requesterId !== user.id && conversation.ownerId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { body } = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        body,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const recipientId = conversation.requesterId === user.id ? conversation.ownerId : conversation.requesterId;
    await prisma.notification.create({
      data: {
        senderId: user.id,
        receiverId: recipientId,
        type: "MESSAGE",
        title: "New message",
        body: `New message about "${conversation.listing.title}"`,
        conversationId: conversation.id,
        data: { conversationId: conversation.id, listingId: conversation.listingId },
      },
    });

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
