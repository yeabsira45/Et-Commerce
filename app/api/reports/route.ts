import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ reports: [] }, { status: 401 });
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { reporter: true },
  });
  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { targetType, targetId, reason } = await req.json();
  if (!targetType || !targetId || !reason) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: user.id,
      targetType,
      targetId,
      reason,
    },
  });

  return NextResponse.json({ report });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { action, reportId, targetId, reason } = await req.json();
  if (!action || !reportId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (action === "resolve") {
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { resolvedAt: new Date(), resolvedById: user.id },
    });
    return NextResponse.json({ report });
  }

  if (action === "delete_listing") {
    if (!targetId) {
      return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
    }
    await prisma.listing.delete({ where: { id: targetId } });
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { resolvedAt: new Date(), resolvedById: user.id },
    });
    return NextResponse.json({ report });
  }

  if (action === "ban_user") {
    if (!targetId) {
      return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: targetId },
      data: { bannedAt: new Date(), banReason: reason || "Policy violation" },
    });
    await prisma.session.deleteMany({ where: { userId: targetId } });
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { resolvedAt: new Date(), resolvedById: user.id },
    });
    return NextResponse.json({ report });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
