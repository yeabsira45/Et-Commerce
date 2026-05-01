import { NextResponse } from "next/server";
import { createSessionToken, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "../../lib/email";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";

type ForgotPasswordBody = {
  email?: unknown;
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return configured;
  if (IS_PRODUCTION) return "";
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`auth_forgot_password:${ip}`, 6, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as ForgotPasswordBody & { mode?: unknown };
  const email = String(body.email || "").trim().toLowerCase();
  const mode = String(body.mode || "otp").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  // Response is always generic to avoid leaking account existence.
  const baseResponse = {
    ok: true,
    message: "If an account exists for this email, you will receive a password reset link shortly.",
  };

  if (!user) {
    return NextResponse.json(baseResponse);
  }

  const rawToken = createSessionToken();
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const tokenHash = hashToken(mode === "otp" ? `${email}:${otpCode}` : rawToken);
  const expiresAt = new Date(Date.now() + (mode === "otp" ? RESET_OTP_TTL_MS : RESET_TOKEN_TTL_MS));
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "App URL is not configured." }, { status: 500 });
  }
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  let emailDelivered = false;
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const otpHtml = `
          <p>You requested a password reset code.</p>
          <p>Your OTP code is:</p>
          <h2 style="font-size:28px;letter-spacing:2px;">${otpCode}</h2>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `;
      const linkHtml = `
          <p>You requested a password reset.</p>
          <p>Click the link below to set a new password (valid for 1 hour):</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        `;
      await sendEmail({
        to: user.email,
        subject: mode === "otp" ? "Your ET-Commerce password reset OTP" : "Reset your password",
        html: mode === "otp" ? otpHtml : linkHtml,
      });
      emailDelivered = true;
    } else if (!IS_PRODUCTION) {
      console.log(`[forgot-password] Reset OTP for ${user.email}: ${otpCode}`);
      console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
    }
  } catch (error) {
    // Do not leak email delivery failures to the client.
    console.error("[forgot-password] Failed to send reset email:", error);
    if (!IS_PRODUCTION) {
      console.log(`[forgot-password] Reset OTP for ${user.email}: ${otpCode}`);
      console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
    }
  }

  if (!IS_PRODUCTION && mode === "otp" && !emailDelivered) {
    return NextResponse.json({
      ...baseResponse,
      debugOtp: otpCode,
      delivery: "failed",
    });
  }

  return NextResponse.json(baseResponse);
}
