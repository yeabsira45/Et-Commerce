import { NextResponse } from "next/server";
import { hashPassword, hashToken } from "@/lib/auth";
import { validatePassword } from "@/lib/passwordRules";
import { prisma } from "@/lib/prisma";

type ResetPasswordBody = {
  token?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ResetPasswordBody;
  const token = String(body.token || "").trim();
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!token || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Token and password fields are required." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

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
