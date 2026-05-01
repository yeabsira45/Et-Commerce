import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, hashToken, setSessionCookie } from "@/lib/auth";
import { deriveStoreName, uniqueUsername, uniqueVendorSlug } from "@/lib/vendorNaming";
import { validatePassword } from "@/lib/passwordRules";
import { uploadApiPath } from "@/lib/uploadSecurity";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { formatPhoneForStorage, isValidStoredEthiopianPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await enforceRateLimit(`auth_register:${ip}`, 10, 60_000))) {
      return NextResponse.json({ error: "Too many sign-up attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await req.json().catch(
      () =>
        ({} as {
          fullName?: unknown;
          email?: unknown;
          password?: unknown;
          storeName?: unknown;
          city?: unknown;
          area?: unknown;
          street?: unknown;
          phone?: unknown;
        })
    );
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const storeName = String(body.storeName || "").trim();
    const city = String(body.city || "").trim();
    const area = String(body.area || "").trim();
    const street = String(body.street || "").trim();
    const phone = String(body.phone || "").trim();

    if (!fullName || !email || !password || !city) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const passwordError = validatePassword(String(password));
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = formatPhoneForStorage(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!isValidStoredEthiopianPhone(normalizedPhone)) {
      return NextResponse.json({ error: "Use a valid Ethiopian phone number." }, { status: 400 });
    }
    const resolvedStoreName = deriveStoreName(fullName, storeName);

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
    const username = await uniqueUsername(fullName);
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
