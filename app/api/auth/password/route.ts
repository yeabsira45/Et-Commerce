import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/passwordRules";

type PasswordPatchBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as PasswordPatchBody;
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "All password fields are required." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New password and confirmation do not match." }, { status: 400 });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, passwordHash: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const currentMatches = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!currentMatches) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const nextHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { passwordHash: nextHash },
  });

  // Revoke all sessions to force re-login everywhere.
  await prisma.session.deleteMany({ where: { userId: dbUser.id } });
  clearSessionCookie();

  return NextResponse.json({ ok: true, message: "Password changed successfully. Please sign in again." });
}
