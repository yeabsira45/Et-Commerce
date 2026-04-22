import { NextResponse } from "next/server";
import { uniqueVendorSlug } from "@/lib/vendorNaming";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`check_slug:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ uniqueSlug: "" }, { status: 400 });
  }
  if (!/^[a-z0-9-]{2,80}$/i.test(slug)) {
    return NextResponse.json({ uniqueSlug: "" }, { status: 400 });
  }
  const uniqueSlug = await uniqueVendorSlug(slug);
  return NextResponse.json({ uniqueSlug });
}
