import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { uploadApiPath } from "@/lib/uploadSecurity";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await enforceRateLimit(`auth_login:${ip}`, 20, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
        vendor: user.vendor
          ? {
              ...user.vendor,
              profileImageUrl: user.vendor.profileImageUploadId
                ? uploadApiPath(user.vendor.profileImageUploadId)
                : null,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
