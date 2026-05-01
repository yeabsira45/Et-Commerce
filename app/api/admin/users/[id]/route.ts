import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAdminAuditLog } from "@/lib/adminAudit";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!username || !email) {
    return NextResponse.json({ error: "Username and email are required" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: { username, email },
    });
    await createAdminAuditLog({
      actorUserId: session.id,
      action: "USER_PROFILE_UPDATE",
      targetType: "user",
      targetId: params.id,
      metadata: { username, email },
    });
    return NextResponse.json({ ok: true, user: { id: params.id, username, email } });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    await createAdminAuditLog({
      actorUserId: session.id,
      action: "USER_DELETE",
      targetType: "user",
      targetId: params.id,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
