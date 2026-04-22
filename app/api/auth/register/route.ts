import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, hashToken, setSessionCookie } from "@/lib/auth";
import { deriveStoreName, uniqueUsername, uniqueVendorSlug } from "@/lib/vendorNaming";
import { validatePassword } from "@/lib/passwordRules";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function POST(req: Request) {
  try {
    const { fullName, email, password, storeName, city, area, street, phone } = await req.json();
    if (!fullName || !email || !password || !city) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const passwordError = validatePassword(String(password));
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone ?? "").trim();
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    const resolvedStoreName = deriveStoreName(String(fullName), storeName);

    const existingEmail = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });
    const existingPhone = await prisma.vendor.findFirst({
      where: { phone: normalizedPhone },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    if (existingPhone) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const username = await uniqueUsername(String(fullName).trim());
    const finalSlug = await uniqueVendorSlug(resolvedStoreName);

    const user = await prisma.user.create({
      data: {
        username,
        email: normalizedEmail,
        passwordHash,
        role: "VENDOR",
        vendor: {
          create: {
            storeName: resolvedStoreName,
            slug: finalSlug,
            city,
            area,
            street,
            phone: normalizedPhone,
          },
        },
      },
      include: { vendor: true },
    });

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
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
