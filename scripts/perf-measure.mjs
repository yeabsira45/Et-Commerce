/**
 * Performance measurement for DB optimizations (review aggregate merge,
 * listing image fetch pattern). Run from repo root:
 *   node scripts/perf-measure.mjs
 *
 * Optional HTTP benchmarks (requires app on BASE_URL, default localhost:3000):
 *   node scripts/perf-measure.mjs --http
 */
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ITER = 80;
const WARMUP = 10;
const withHttp = process.argv.includes("--http");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

async function timeLoop(label, fn) {
  const samples = [];
  for (let i = 0; i < WARMUP; i++) await fn();
  for (let i = 0; i < ITER; i++) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    label,
    n: ITER,
    meanMs: sum / ITER,
    p50Ms: pct(samples, 50),
    p95Ms: pct(samples, 95),
    minMs: samples[0],
    maxMs: samples[samples.length - 1],
  };
}

async function httpTimes(url) {
  const samples = [];
  for (let i = 0; i < WARMUP; i++) {
    const r = await fetch(url);
    await r.arrayBuffer();
  }
  for (let i = 0; i < ITER; i++) {
    const t0 = performance.now();
    const r = await fetch(url);
    await r.arrayBuffer();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    url,
    n: ITER,
    meanMs: sum / ITER,
    p50Ms: pct(samples, 50),
    p95Ms: pct(samples, 95),
    minMs: samples[0],
    maxMs: samples[samples.length - 1],
  };
}

async function main() {
  const listing = await prisma.listing.findFirst({
    select: { id: true, vendorId: true },
  });

  if (!listing?.vendorId) {
    console.log(JSON.stringify({ error: "No listing with vendorId in DB; cannot benchmark." }, null, 2));
    await prisma.$disconnect();
    process.exit(1);
  }

  const vendorId = listing.vendorId;

  const oldReviewPattern = () =>
    Promise.all([
      prisma.review.aggregate({
        where: { vendorId },
        _avg: { rating: true },
      }),
      prisma.review.count({ where: { vendorId } }),
    ]);

  const newReviewPattern = () =>
    prisma.review.aggregate({
      where: { vendorId },
      _avg: { rating: true },
      _count: { _all: true },
    });

  const oldBench = await timeLoop("review_stats_OLD (aggregate + count, 2 round-trips)", oldReviewPattern);
  const newBench = await timeLoop("review_stats_NEW (single aggregate + _count)", newReviewPattern);

  const imageBench = await timeLoop("images_by_listing (findMany orderBy sortOrder)", () =>
    prisma.image.findMany({
      where: { listingId: listing.id },
      orderBy: { sortOrder: "asc" },
      select: { uploadId: true, sortOrder: true },
    })
  );

  const out = {
    environment: { iterations: ITER, warmup: WARMUP, vendorId, listingId: listing.id },
    prisma: {
      reviewVendorStats: {
        oldTwoQueries: oldBench,
        newSingleQuery: newBench,
        deltaMeanMs: oldBench.meanMs - newBench.meanMs,
        deltaP95Ms: oldBench.p95Ms - newBench.p95Ms,
        percentFasterMean:
          oldBench.meanMs > 0 ? ((oldBench.meanMs - newBench.meanMs) / oldBench.meanMs) * 100 : null,
      },
      listingImagesByListingId: imageBench,
    },
    note:
      "Review timings isolate the same DB work as /api/listings/[id] and /api/reviews vendor summary blocks. Image timing reflects the indexed listingId+sortOrder fetch path.",
  };

  if (withHttp) {
    try {
      const listingUrl = `${BASE_URL}/api/listings/${listing.id}`;
      const reviewsUrl = `${BASE_URL}/api/reviews?vendorId=${encodeURIComponent(vendorId)}`;
      out.http = {
        listingDetail: await httpTimes(listingUrl),
        reviews: await httpTimes(reviewsUrl),
      };
    } catch (e) {
      out.http = { error: String(e.message || e), hint: "Start the app (npm run dev or npm run start) and retry with --http" };
    }
  }

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
