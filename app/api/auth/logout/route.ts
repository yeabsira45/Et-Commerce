import { NextResponse } from "next/server";
import { clearDemoSessionCookie, clearSessionCookie, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST() {
  const token = cookies().get("etcom_session")?.value;
  if (token) {
    const tokenHash = hashToken(token);
    try {
      await prisma.session.deleteMany({ where: { tokenHash } });
    } catch {
      // ignore db issues on logout
    }
  }
  clearSessionCookie();
  clearDemoSessionCookie();
  return NextResponse.json({ ok: true });
}
