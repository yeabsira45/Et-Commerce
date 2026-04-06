import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveStoreName, uniqueUsername, uniqueVendorSlug } from "@/lib/vendorNaming";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ vendor: null }, { status: 401 });
  }
  return NextResponse.json({ vendor: user.vendor || null, user: { id: user.id, role: user.role, username: user.username, email: user.email } });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { fullName, email, storeName, city, area, street, phone } = body;

  if (user.id === "demo-user") {
    if (!fullName || !email || !city || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const v = user.vendor!;
    return NextResponse.json({
      user: {
        id: user.id,
        username: fullName,
        email,
      },
      vendor: {
        ...v,
        storeName: storeName || v.storeName,
        city: city || v.city,
        area: area ?? v.area,
        street: street ?? v.street,
        phone: phone || v.phone,
      },
    });
  }
  if (!fullName || !email || !city || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existingPhone = await prisma.vendor.findFirst({
    where: { phone, NOT: { userId: user.id } },
  });
  if (existingPhone) {
    return NextResponse.json({ error: "Phone number already taken" }, { status: 409 });
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email, NOT: { id: user.id } },
  });
  if (existingEmail) {
    return NextResponse.json({ error: "Email already taken" }, { status: 409 });
  }

  const resolvedStoreName = deriveStoreName(fullName, storeName);
  const resolvedSlug = await uniqueVendorSlug(resolvedStoreName, user.id);
  const resolvedUsername = await uniqueUsername(fullName, user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      username: resolvedUsername,
      email,
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: user.id },
    update: { storeName: resolvedStoreName, slug: resolvedSlug, city, area, street, phone },
    create: { userId: user.id, storeName: resolvedStoreName, slug: resolvedSlug, city, area, street, phone },
  });

  return NextResponse.json({ vendor, user: { id: user.id, username: resolvedUsername, email } });
}
