import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { uploadApiPath } from "@/lib/uploadSecurity";

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: {
        title: true,
        description: true,
        city: true,
        area: true,
        category: true,
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { uploadId: true },
        },
        vendor: {
          select: {
            storeName: true,
          },
        },
      },
    });

    if (!listing) {
      return {
        title: "Listing not found | ET-Commerce",
        description: "This ET-Commerce listing could not be found.",
      };
    }

    const description =
      listing.description?.trim() ||
      `${listing.title} in ${listing.city}, ${listing.area}. Browse this ${listing.category.toLowerCase()} listing on ET-Commerce.`;
    const image = listing.images[0]?.uploadId ? uploadApiPath(listing.images[0].uploadId) : "/errorpage.svg";

    return {
      title: `${listing.title} | ET-Commerce`,
      description,
      openGraph: {
        title: listing.title,
        description,
        type: "article",
        images: [{ url: image }],
      },
      twitter: {
        card: "summary_large_image",
        title: listing.title,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: "ET-Commerce listing",
      description: "Browse this listing on ET-Commerce.",
    };
  }
}

export default function ItemLayout({ children }: Props) {
  return children;
}
