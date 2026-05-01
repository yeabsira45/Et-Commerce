#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const uploadDir = path.join(process.cwd(), "private", "uploads");
const ageHours = Number(process.env.CLEANUP_UPLOAD_AGE_HOURS || "48");
const dryRun = process.env.CLEANUP_DRY_RUN === "true";

async function run() {
  const cutoff = new Date(Date.now() - ageHours * 60 * 60 * 1000);
  const staleOrphans = await prisma.upload.findMany({
    where: {
      linkedEntityType: null,
      linkedEntityId: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, path: true, createdAt: true },
    take: 1000,
    orderBy: { createdAt: "asc" },
  });

  if (!staleOrphans.length) {
    console.log("[cleanup-orphan-uploads] nothing to clean");
    return;
  }

  console.log(
    `[cleanup-orphan-uploads] found ${staleOrphans.length} stale orphan uploads older than ${ageHours}h`
  );

  let fileDeletes = 0;
  for (const upload of staleOrphans) {
    const filePath = path.join(uploadDir, upload.path);
    if (!dryRun) {
      await fs.unlink(filePath).catch(() => null);
    }
    fileDeletes += 1;
  }

  if (!dryRun) {
    await prisma.upload.deleteMany({
      where: { id: { in: staleOrphans.map((upload) => upload.id) } },
    });
  }

  console.log(
    `[cleanup-orphan-uploads] ${dryRun ? "dry-run: would remove" : "removed"} ${fileDeletes} files and ${
      staleOrphans.length
    } db rows`
  );
}

run()
  .catch((error) => {
    console.error("[cleanup-orphan-uploads] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null);
  });
