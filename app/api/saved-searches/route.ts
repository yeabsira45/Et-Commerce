import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { normalizeSavedSearchQuery } from "@/lib/savedSearch";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      query: true,
      isActive: true,
      lastNotifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ savedSearches });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const normalizedQuery = normalizeSavedSearchQuery(body?.query);
  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 100)
      : normalizedQuery.q
        ? `Search: ${normalizedQuery.q}`
        : "Saved alert";

  const entry = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name,
      query: normalizedQuery,
      isActive: body?.isActive !== false,
    },
    select: {
      id: true,
      name: true,
      query: true,
      isActive: true,
      lastNotifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ savedSearch: entry }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Saved search id is required." }, { status: 400 });
  }
  const updates: {
    isActive?: boolean;
    name?: string;
    query?: ReturnType<typeof normalizeSavedSearchQuery>;
  } = {};
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim().slice(0, 100);
  if (body.query) updates.query = normalizeSavedSearchQuery(body.query);

  const savedSearch = await prisma.savedSearch.findFirst({
    where: { id: body.id, userId: user.id },
    select: { id: true },
  });
  if (!savedSearch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.savedSearch.update({
    where: { id: body.id },
    data: updates,
    select: {
      id: true,
      name: true,
      query: true,
      isActive: true,
      lastNotifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ savedSearch: updated });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Saved search id is required." }, { status: 400 });

  const savedSearch = await prisma.savedSearch.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!savedSearch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
