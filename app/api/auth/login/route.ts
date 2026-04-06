import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashToken, setDemoSessionCookie, setSessionCookie, verifyPassword } from "@/lib/auth";
import { demoUser } from "@/lib/demo";

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Super Admin (dev): username exactly `demo`, password exactly `password` — not an email login.
    const idNorm = String(identifier || "").trim().toLowerCase();
    if (idNorm === "demo" && password === "password") {
      setDemoSessionCookie();
      return NextResponse.json({ user: demoUser });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { vendor: { is: { phone: identifier } } },
        ],
      },
      include: { vendor: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (user.bannedAt) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        vendor: user.vendor,
      },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
