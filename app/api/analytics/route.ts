import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventName = typeof body?.eventName === "string" ? body.eventName.trim() : "";
    if (!eventName) {
      return NextResponse.json({ error: "eventName is required" }, { status: 400 });
    }
    const data =
      body?.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as Prisma.InputJsonValue)
        : undefined;
    await recordAnalyticsEvent(req, eventName.slice(0, 80), data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record analytics event" }, { status: 500 });
  }
}
