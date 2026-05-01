import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { uploadApiPath } from "@/lib/uploadSecurity";

type Props = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug: params.slug },
      select: {
        storeName: true,
        city: true,
        area: true,
        profileImageUploadId: true,
        listings: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
    });

    if (!vendor) {
      return {
        title: "Seller not found | ET-Commerce",
        description: "This ET-Commerce seller profile could not be found.",
      };
    }

    const description = `Browse ${vendor.storeName} in ${vendor.city}, ${vendor.area}. ${vendor.listings.length} active listing${vendor.listings.length === 1 ? "" : "s"} on ET-Commerce.`;
    const image = vendor.profileImageUploadId ? uploadApiPath(vendor.profileImageUploadId) : "/favicon.io.png";

    return {
      title: `${vendor.storeName} | ET-Commerce`,
      description,
      openGraph: {
        title: vendor.storeName,
        description,
        type: "profile",
        images: [{ url: image }],
      },
      twitter: {
        card: "summary",
        title: vendor.storeName,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: "ET-Commerce seller",
      description: "Browse seller profiles on ET-Commerce.",
    };
  }
}

export default function VendorLayout({ children }: Props) {
  return children;
}
