import { NextResponse } from "next/server";
import { createSessionToken, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "../../lib/email";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";

type ForgotPasswordBody = {
  email?: unknown;
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`auth_forgot_password:${ip}`, 6, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as ForgotPasswordBody;
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  // Response is always generic to avoid leaking account existence.
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If an account exists for this email, you will receive a password reset link shortly.",
  });

  if (!user) {
    return genericResponse;
  }

  const rawToken = createSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `
          <p>You requested a password reset.</p>
          <p>Click the link below to set a new password (valid for 1 hour):</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    } else {
      console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
    }
  } catch (error) {
    // Do not leak email delivery failures to the client.
    console.error("[forgot-password] Failed to send reset email:", error);
    console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
  }

  return genericResponse;
}
