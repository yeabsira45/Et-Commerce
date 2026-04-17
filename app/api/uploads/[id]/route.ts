import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { PRIVATE_UPLOAD_DIR, isPublicUploadEntityType } from "@/lib/uploadSecurity";
import { getUploadMetaFromCache, setUploadMetaCache } from "@/lib/uploadMetaCache";

type Params = { params: { id: string } };

async function getUploadMeta(uploadId: string) {
  const cached = getUploadMetaFromCache(uploadId);
  if (cached && isPublicUploadEntityType(cached.linkedEntityType)) {
    return {
      id: cached.id,
      path: cached.path,
      mimeType: cached.mimeType,
      ownerUserId: null as string | null,
      linkedEntityType: cached.linkedEntityType,
    };
  }

  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    select: {
      id: true,
      path: true,
      mimeType: true,
      ownerUserId: true,
      linkedEntityType: true,
    },
  });
  if (!upload) return null;
  setUploadMetaCache({
    id: upload.id,
    path: upload.path,
    mimeType: upload.mimeType,
    linkedEntityType: upload.linkedEntityType,
  });
  return upload;
}

export async function GET(_req: Request, { params }: Params) {
  const upload = await getUploadMeta(params.id);
  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isPublicAsset = isPublicUploadEntityType(upload.linkedEntityType);
  if (!isPublicAsset) {
    const user = await getSessionUser();
    if (!user || !upload.ownerUserId || upload.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const filePath = path.join(PRIVATE_UPLOAD_DIR, upload.path);
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileStream = createReadStream(filePath);
  const webStream = Readable.toWeb(fileStream) as ReadableStream;
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": upload.mimeType,
      "Content-Length": String(stat.size),
      "Cache-Control": isPublicAsset
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
