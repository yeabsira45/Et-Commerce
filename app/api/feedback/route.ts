import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function parseFeedbackType(value: unknown): "BUG" | "FEATURE" | "GENERAL" {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "BUG") return "BUG";
  if (normalized === "FEATURE") return "FEATURE";
  return "GENERAL";
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = await req.json().catch(() => ({} as { message?: unknown; type?: unknown }));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const type = parseFeedbackType(body.type);

    if (!message) {
      return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Feedback message is too long." }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user?.id || null,
        type,
        message,
      },
      select: { id: true, type: true, createdAt: true },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
