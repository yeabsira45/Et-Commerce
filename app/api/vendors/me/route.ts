import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveStoreName, uniqueUsername, uniqueVendorSlug } from "@/lib/vendorNaming";
import { uploadApiPath } from "@/lib/uploadSecurity";
import { invalidateUploadMetaCache } from "@/lib/uploadMetaCache";
import { formatPhoneForStorage, isValidStoredEthiopianPhone } from "@/lib/phone";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ vendor: null }, { status: 401 });
  }
  return NextResponse.json({
    vendor: user.vendor
      ? {
          ...user.vendor,
          profileImageUrl: user.vendor.profileImageUploadId
            ? uploadApiPath(user.vendor.profileImageUploadId)
            : null,
        }
      : null,
    user: { id: user.id, role: user.role, username: user.username, email: user.email },
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { fullName, email, storeName, city, area, street, phone, profileImageUploadId, removeProfileImage } = body;
  const normalizedPhone = formatPhoneForStorage(String(phone ?? ""));

  if (!fullName || !email || !city || !normalizedPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidStoredEthiopianPhone(normalizedPhone)) {
    return NextResponse.json({ error: "Use a valid Ethiopian phone number." }, { status: 400 });
  }

  const existingPhone = await prisma.vendor.findFirst({
    where: { phone: normalizedPhone, NOT: { userId: user.id } },
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

  let resolvedProfileImageUploadId: string | null = null;
  if (removeProfileImage === true) {
    resolvedProfileImageUploadId = null;
  } else if (typeof profileImageUploadId === "string" && profileImageUploadId.trim()) {
    const upload = await prisma.upload.findUnique({
      where: { id: profileImageUploadId.trim() },
      select: { id: true, ownerUserId: true },
    });
    if (!upload || upload.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Invalid profile image upload." }, { status: 403 });
    }
    resolvedProfileImageUploadId = upload.id;
  }

  const vendor = await prisma.vendor.upsert({
    where: { userId: user.id },
    update: {
      storeName: resolvedStoreName,
      slug: resolvedSlug,
      city,
      area,
      street,
      phone: normalizedPhone,
      profileImageUploadId: resolvedProfileImageUploadId,
    },
    create: {
      userId: user.id,
      storeName: resolvedStoreName,
      slug: resolvedSlug,
      city,
      area,
      street,
      phone: normalizedPhone,
      profileImageUploadId: resolvedProfileImageUploadId,
    },
  });

  if (resolvedProfileImageUploadId) {
    await prisma.upload.update({
      where: { id: resolvedProfileImageUploadId },
      data: {
        ownerVendorId: vendor.id,
        linkedEntityType: "VENDOR_PROFILE",
        linkedEntityId: vendor.id,
      },
    });
    invalidateUploadMetaCache(resolvedProfileImageUploadId);
  }

  return NextResponse.json({
    vendor: {
      ...vendor,
      profileImageUrl: vendor.profileImageUploadId ? uploadApiPath(vendor.profileImageUploadId) : null,
    },
    user: { id: user.id, username: resolvedUsername, email },
  });
}
