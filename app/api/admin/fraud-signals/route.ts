import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAdminAuditLog } from "@/lib/adminAudit";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const unresolvedOnly = searchParams.get("unresolvedOnly") !== "false";

  const signals = await prisma.fraudSignal.findMany({
    where: unresolvedOnly ? { resolvedAt: null } : {},
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 300,
    select: {
      id: true,
      userId: true,
      type: true,
      severity: true,
      notes: true,
      data: true,
      resolvedAt: true,
      resolvedById: true,
      resolutionNote: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          email: true,
          vendor: { select: { storeName: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json({ signals });
}

export async function PATCH(req: Request) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const signalId = typeof body.signalId === "string" ? body.signalId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 180) : "";
  if (!signalId || !["resolve", "reopen"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await prisma.fraudSignal.update({
    where: { id: signalId },
    data:
      action === "resolve"
        ? { resolvedAt: new Date(), resolvedById: admin.id, resolutionNote: note || null }
        : { resolvedAt: null, resolvedById: null, resolutionNote: null },
    select: {
      id: true,
      userId: true,
      type: true,
      severity: true,
      notes: true,
      data: true,
      resolvedAt: true,
      resolvedById: true,
      resolutionNote: true,
      createdAt: true,
    },
  });

  await createAdminAuditLog({
    actorUserId: admin.id,
    action: action === "resolve" ? "FRAUD_SIGNAL_RESOLVE" : "FRAUD_SIGNAL_REOPEN",
    targetType: "fraud_signal",
    targetId: signalId,
    metadata: { note: note || null },
  });

  return NextResponse.json({ signal: updated });
}
