import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const slowQueryMs = Number(process.env.SLOW_QUERY_LOG_MS || "400");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      "error",
      "warn",
      ...(process.env.LOG_SLOW_QUERIES === "true" ? [{ emit: "event", level: "query" } as const] : []),
    ],
  });

if (process.env.LOG_SLOW_QUERIES === "true") {
  (prisma as any).$on("query", (event: { duration: number; query: string }) => {
    if (event.duration >= slowQueryMs) {
      console.warn("[prisma.slow-query]", {
        durationMs: event.duration,
        query: event.query,
      });
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
