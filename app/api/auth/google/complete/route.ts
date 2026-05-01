import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, hashToken, setSessionCookie } from "@/lib/auth";
import { deriveStoreName, uniqueUsername, uniqueVendorSlug } from "@/lib/vendorNaming";
import { formatPhoneForStorage, isValidStoredEthiopianPhone } from "@/lib/phone";

const PENDING_COOKIE = "etcom_google_pending";

type PendingGooglePayload = {
  email?: string;
  fullName?: string;
  sub?: string;
  issuedAt?: number;
};

export async function POST(req: Request) {
  try {
    const pendingRaw = cookies().get(PENDING_COOKIE)?.value;
    if (!pendingRaw) {
      return NextResponse.json({ error: "Google registration session expired." }, { status: 400 });
    }

    let pending: PendingGooglePayload | null = null;
    try {
      pending = JSON.parse(pendingRaw) as PendingGooglePayload;
    } catch {
      pending = null;
    }
    if (!pending?.email) {
      return NextResponse.json({ error: "Google registration session is invalid." }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    const fullName = String(payload.fullName || pending.fullName || "").trim();
    const city = String(payload.city || "").trim();
    const area = String(payload.area || "").trim();
    const street = String(payload.street || "").trim();
    const phone = formatPhoneForStorage(String(payload.phone || ""));
    const storeNameInput = String(payload.storeName || "").trim();

    if (!fullName || !city || !area || !phone) {
      return NextResponse.json({ error: "Full name, city, subcity, and phone are required." }, { status: 400 });
    }
    if (!isValidStoredEthiopianPhone(phone)) {
      return NextResponse.json({ error: "Use a valid Ethiopian phone number." }, { status: 400 });
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: pending.email.toLowerCase() },
      include: { vendor: true },
    });
    if (existingByEmail) {
      const token = createSessionToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await prisma.session.create({ data: { userId: existingByEmail.id, tokenHash, expiresAt } });
      setSessionCookie(token);
      cookies().set(PENDING_COOKIE, "", { path: "/", expires: new Date(0) });
      return NextResponse.json({ ok: true, linkedExisting: true });
    }

    const existingPhone = await prisma.vendor.findFirst({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ error: "Phone number already exists." }, { status: 409 });
    }

    const resolvedStoreName = deriveStoreName(fullName, storeNameInput);
    const username = await uniqueUsername(fullName);
    const slug = await uniqueVendorSlug(resolvedStoreName);
    const passwordHash = await hashPassword(createSessionToken());

    const created = await prisma.user.create({
      data: {
        username,
        email: pending.email.toLowerCase(),
        passwordHash,
        role: "VENDOR",
        vendor: {
          create: {
            storeName: resolvedStoreName,
            slug,
            city,
            area,
            street: street || null,
            phone,
          },
        },
      },
      include: { vendor: true },
    });

    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { userId: created.id, tokenHash, expiresAt } });
    setSessionCookie(token);
    cookies().set(PENDING_COOKIE, "", { path: "/", expires: new Date(0) });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not complete Google registration." }, { status: 500 });
  }
}
