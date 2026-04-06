import { NextResponse } from "next/server";
import { uniqueVendorSlug } from "@/lib/vendorNaming";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ uniqueSlug: "" }, { status: 400 });
  }
  const uniqueSlug = await uniqueVendorSlug(slug);
  return NextResponse.json({ uniqueSlug });
}
