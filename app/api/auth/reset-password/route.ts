import { NextResponse } from "next/server";
import { hashPassword, hashToken } from "@/lib/auth";
import { validatePassword } from "@/lib/passwordRules";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";

type ResetPasswordBody = {
  token?: unknown;
  email?: unknown;
  otp?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`auth_reset_password:${ip}`, 8, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as ResetPasswordBody;
  const token = String(body.token || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const otp = String(body.otp || "").trim();
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Password fields are required." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  let resetToken: { id: string; userId: string; expiresAt: Date } | null = null;

  if (token) {
    const tokenHash = hashToken(token);
    resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
  } else if (email && otp) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) {
      const otpHash = hashToken(`${email}:${otp}`);
      resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          tokenHash: otpHash,
        },
        select: { id: true, userId: true, expiresAt: true },
      });
    }
  } else {
    return NextResponse.json({ error: "Provide token or email + otp." }, { status: 400 });
  }

  if (!resetToken) {
    return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
  }
  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => null);
    return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Password reset successfully. Please sign in again.",
  });
}
