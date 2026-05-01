import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
  });

  if (!conversation || (conversation.requesterId !== user.id && conversation.ownerId !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.message.updateMany({
    where: {
      conversationId: params.id,
      senderId: { not: user.id },
      OR: [{ readAt: null }, { seenAt: null }],
    },
    data: {
      readAt: new Date(),
      seenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
