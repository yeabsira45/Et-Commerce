import { NextResponse } from "next/server";
import fs from "fs/promises";
import crypto from "crypto";
import { MAX_IMAGE_UPLOAD_BYTES, SAFE_IMAGE_MIME_TYPES, validateImageFile } from "@/lib/imageUploadValidation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectMimeByMagicBytes, extensionForMime, PRIVATE_UPLOAD_DIR, uploadApiPath } from "@/lib/uploadSecurity";
import { setUploadMetaCache } from "@/lib/uploadMetaCache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files");
    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    await fs.mkdir(PRIVATE_UPLOAD_DIR, { recursive: true });

    const uploads: Array<{ id: string; url: string; mimeType: string; size: number }> = [];

    for (const item of files) {
      if (!(item instanceof File)) continue;
      const validationError = validateImageFile(item, { maxBytes: MAX_IMAGE_UPLOAD_BYTES });
      if (validationError) {
        return NextResponse.json(
          { error: `${item.name || "File"}: ${validationError}` },
          { status: 400 }
        );
      }
      const arrayBuffer = await item.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const detectedMime = detectMimeByMagicBytes(buffer);
      const declaredMime = String(item.type || "").toLowerCase();
      if (!detectedMime || !SAFE_IMAGE_MIME_TYPES.has(declaredMime) || detectedMime !== declaredMime) {
        return NextResponse.json(
          { error: `${item.name || "File"}: Invalid or unsafe image type.` },
          { status: 400 }
        );
      }
      const ext = extensionForMime(detectedMime);
      if (!ext) {
        return NextResponse.json(
          { error: `${item.name || "File"}: Unsupported image type.` },
          { status: 400 }
        );
      }
      const filename = `${crypto.randomUUID()}${ext}`;
      const filePath = `${PRIVATE_UPLOAD_DIR}/${filename}`;
      await fs.writeFile(filePath, buffer);

      const upload = await prisma.upload.create({
        data: {
          ownerUserId: user.id,
          ownerVendorId: user.vendor?.id || null,
          path: filename,
          mimeType: detectedMime,
          size: buffer.byteLength,
        },
        select: { id: true, mimeType: true, size: true },
      });
      uploads.push({
        id: upload.id,
        url: uploadApiPath(upload.id),
        mimeType: upload.mimeType,
        size: upload.size,
      });
      setUploadMetaCache({
        id: upload.id,
        path: filename,
        mimeType: detectedMime,
        linkedEntityType: null,
      });
    }

    return NextResponse.json({ uploads });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
