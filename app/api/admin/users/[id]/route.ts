import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteMockUser, patchAdminMockUser } from "@/lib/adminMockState";
import { ADMIN_MOCK_USERS } from "@/lib/adminMock";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!username || !email) {
    return NextResponse.json({ error: "Username and email are required" }, { status: 400 });
  }

  if (params.id === "demo-user") {
    return NextResponse.json({ error: "Cannot edit the demo admin account" }, { status: 400 });
  }

  if (session.id === "demo-user") {
    if (!ADMIN_MOCK_USERS.some((u) => u.id === params.id)) {
      return NextResponse.json({ error: "Only mock users can be edited in demo admin mode" }, { status: 400 });
    }
    const ok = patchAdminMockUser(params.id, username, email);
    if (!ok) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, user: { id: params.id, username, email } });
  }

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: { username, email },
    });
    return NextResponse.json({ ok: true, user: { id: params.id, username, email } });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (params.id === "demo-user") {
    return NextResponse.json({ error: "Cannot delete the demo admin account" }, { status: 400 });
  }

  if (session.id === "demo-user") {
    if (!ADMIN_MOCK_USERS.some((u) => u.id === params.id)) {
      return NextResponse.json({ error: "Only mock users can be deleted in demo admin mode" }, { status: 400 });
    }
    deleteMockUser(params.id);
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
