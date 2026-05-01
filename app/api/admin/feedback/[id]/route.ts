import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.feedback.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
