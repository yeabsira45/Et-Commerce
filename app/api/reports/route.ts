import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAdminAuditLog } from "@/lib/adminAudit";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ reports: [] }, { status: 403 });
    }

    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: { reporter: true },
    });
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as { targetType?: unknown; targetId?: unknown; reason?: unknown }));
    const targetType = String(body.targetType || "").trim().toLowerCase();
    const targetId = String(body.targetId || "").trim();
    const reason = String(body.reason || "").trim();
    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["listing", "user", "message"].includes(targetType)) {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }
    if (reason.length < 5 || reason.length > 1000) {
      return NextResponse.json({ error: "Reason must be 5-1000 characters." }, { status: 400 });
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
  } catch {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as { action?: unknown; reportId?: unknown; targetId?: unknown; reason?: unknown }));
    const action = String(body.action || "").trim();
    const reportId = String(body.reportId || "").trim();
    const targetId = String(body.targetId || "").trim();
    const reason = String(body.reason || "").trim();
    if (!action || !reportId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (action === "resolve") {
      const report = await prisma.report.update({
        where: { id: reportId },
        data: { resolvedAt: new Date(), resolvedById: user.id },
      });
      await createAdminAuditLog({
        actorUserId: user.id,
        action: "REPORT_RESOLVE",
        targetType: "report",
        targetId: reportId,
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
      await createAdminAuditLog({
        actorUserId: user.id,
        action: "REPORT_DELETE_LISTING",
        targetType: "listing",
        targetId,
        metadata: { reportId },
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
      await createAdminAuditLog({
        actorUserId: user.id,
        action: "REPORT_BAN_USER",
        targetType: "user",
        targetId,
        metadata: { reportId, reason: reason || "Policy violation" },
      });
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
