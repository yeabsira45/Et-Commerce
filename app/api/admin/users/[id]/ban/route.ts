import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const banned = Boolean(body.banned);

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: { bannedAt: banned ? new Date() : null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
