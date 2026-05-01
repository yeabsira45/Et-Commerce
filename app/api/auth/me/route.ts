import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
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
              trustBadges: [
                ...(user.vendor.phoneVerificationStatus === "VERIFIED" ? ["Phone verified"] : []),
                ...(user.vendor.idVerificationStatus === "VERIFIED" ? ["ID verified"] : []),
                ...(user.vendor.addressVerificationStatus === "VERIFIED" ? ["Address verified"] : []),
              ],
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ user: null, error: "Failed to fetch current user" }, { status: 500 });
  }
}
