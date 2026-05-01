import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import crypto from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import sharp from "sharp";
import { MAX_IMAGE_UPLOAD_BYTES, SAFE_IMAGE_MIME_TYPES, validateImageFile } from "@/lib/imageUploadValidation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectMimeByMagicBytes, extensionForMime, PRIVATE_UPLOAD_DIR, uploadApiPath } from "@/lib/uploadSecurity";
import { setUploadMetaCache } from "@/lib/uploadMetaCache";

export const runtime = "nodejs";
const MAX_FILES_PER_UPLOAD_REQUEST = 10;
const MAX_OPTIMIZED_IMAGE_DIMENSION = 1600;

function buildImageOptimizer(mime: string) {
  const base = sharp().rotate().resize({
    width: MAX_OPTIMIZED_IMAGE_DIMENSION,
    height: MAX_OPTIMIZED_IMAGE_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (mime === "image/webp") {
    return base.webp({ quality: 78 });
  }
  if (mime === "image/png") {
    return base.png({ compressionLevel: 9, progressive: true });
  }
  return base.jpeg({ quality: 80, mozjpeg: true, progressive: true });
}

async function detectMimeFromHeader(file: File) {
  const header = Buffer.from(await file.slice(0, 64).arrayBuffer());
  return detectMimeByMagicBytes(header);
}

export async function POST(req: Request) {
  const savedFilePaths: string[] = [];
  const createdUploadIds: string[] = [];

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
    if (files.length > MAX_FILES_PER_UPLOAD_REQUEST) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_FILES_PER_UPLOAD_REQUEST} images per request.` },
        { status: 400 }
      );
    }

    await fs.mkdir(PRIVATE_UPLOAD_DIR, { recursive: true });

    const uploads: Array<{ id: string; url: string; mimeType: string; size: number }> = [];
    const validFiles = files.filter((item): item is File => item instanceof File);
    if (!validFiles.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const stagedFiles: Array<{
      file: File;
      detectedMime: string;
      filename: string;
      filePath: string;
    }> = [];

    for (const item of validFiles) {
      const validationError = validateImageFile(item, { maxBytes: MAX_IMAGE_UPLOAD_BYTES });
      if (validationError) {
        return NextResponse.json(
          { error: `${item.name || "File"}: ${validationError}` },
          { status: 400 }
        );
      }
      const detectedMime = await detectMimeFromHeader(item);
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
      stagedFiles.push({ file: item, detectedMime, filename, filePath });
    }

    for (const staged of stagedFiles) {
      const filePath = staged.filePath;
      try {
        const inputStream = Readable.fromWeb(staged.file.stream() as any);
        const optimized = buildImageOptimizer(staged.detectedMime);
        await pipeline(inputStream, optimized, createWriteStream(filePath));
      } catch {
        await fs.unlink(filePath).catch(() => null);
        return NextResponse.json({ error: `${staged.file.name || "File"}: Could not process image.` }, { status: 400 });
      }
      savedFilePaths.push(filePath);
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat || !stat.isFile()) {
        return NextResponse.json({ error: `${staged.file.name || "File"}: Upload failed.` }, { status: 500 });
      }

      let upload;
      try {
        upload = await prisma.upload.create({
          data: {
            ownerUserId: user.id,
            ownerVendorId: user.vendor?.id || null,
            path: staged.filename,
            mimeType: staged.detectedMime,
            size: stat.size,
          },
          select: { id: true, mimeType: true, size: true },
        });
      } catch {
        await fs.unlink(filePath).catch(() => null);
        throw new Error("UPLOAD_DB_CREATE_FAILED");
      }
      createdUploadIds.push(upload.id);
      uploads.push({
        id: upload.id,
        url: uploadApiPath(upload.id),
        mimeType: upload.mimeType,
        size: upload.size,
      });
      setUploadMetaCache({
        id: upload.id,
        path: staged.filename,
        mimeType: staged.detectedMime,
        linkedEntityType: null,
      });
    }

    return NextResponse.json({ uploads });
  } catch {
    await Promise.all(savedFilePaths.map((filePath) => fs.unlink(filePath).catch(() => null)));
    if (createdUploadIds.length > 0) {
      await prisma.upload.deleteMany({
        where: { id: { in: createdUploadIds } },
      }).catch(() => null);
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
