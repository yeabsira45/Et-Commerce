import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const PENDING_COOKIE = "etcom_google_pending";

type PendingGooglePayload = {
  email?: string;
  fullName?: string;
  issuedAt?: number;
};

export async function GET() {
  const pendingRaw = cookies().get(PENDING_COOKIE)?.value;
  if (!pendingRaw) {
    return NextResponse.json({ pending: null }, { status: 200 });
  }

  try {
    const pending = JSON.parse(pendingRaw) as PendingGooglePayload;
    if (!pending?.email) {
      return NextResponse.json({ pending: null }, { status: 200 });
    }
    return NextResponse.json({
      pending: {
        email: pending.email,
        fullName: pending.fullName || "",
      },
    });
  } catch {
    return NextResponse.json({ pending: null }, { status: 200 });
  }
}
