import { PrismaClient } from "@prisma/client";

declare global {
  var __sentinelPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__sentinelPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.__sentinelPrisma = prisma;
