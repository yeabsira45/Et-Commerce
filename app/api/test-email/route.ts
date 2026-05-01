import { NextResponse } from "next/server";
import { sendEmail, verifyEmailTransport } from "../lib/email";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    const message = error instanceof Error ? error.message : "Unknown email error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
