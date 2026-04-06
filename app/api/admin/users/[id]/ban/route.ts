import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { setMockUserBanned } from "@/lib/adminMockState";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const banned = Boolean(body.banned);

  if (session.id === "demo-user") {
    const ok = setMockUserBanned(params.id, banned);
    if (!ok) {
      return NextResponse.json({ error: "Cannot ban this account" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

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
