import { NextResponse } from "next/server";
import { sendEmail, verifyEmailTransport } from "../lib/email";
import { getSessionUser } from "@/lib/auth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const ip = getClientIp(req);
    if (!(await enforceRateLimit(`test_email:${ip}`, 5, 60_000))) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const health = await verifyEmailTransport();
    if (!health.ok) {
      return NextResponse.json({ success: false, error: health.error }, { status: 500 });
    }

    await sendEmail({
      to: user.email,
      subject: "Test Email",
      html: "<h1>SMTP is working.</h1><p>This is a test email from ET-Commerce.</p>",
    });

    return NextResponse.json({ success: true, message: `Test email sent to ${user.email}` }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Email test failed" }, { status: 500 });
  }
}
