import { NextResponse } from "next/server";
import { sendEmail } from "../lib/email";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sendEmail({
      to: "yourgmail@gmail.com",
      subject: "Test Email",
      html: "<h1>It works!</h1>",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown email error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
