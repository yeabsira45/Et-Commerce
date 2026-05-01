import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAdminAuditLog } from "@/lib/adminAudit";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const banned = Boolean(body.banned);
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 180) : "";

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: {
        bannedAt: banned ? new Date() : null,
        banReason: banned ? reason || "Policy violation" : null,
      },
    });
    await createAdminAuditLog({
      actorUserId: session.id,
      action: banned ? "USER_BAN" : "USER_UNBAN",
      targetType: "user",
      targetId: params.id,
      metadata: { reason: banned ? reason || "Policy violation" : null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
