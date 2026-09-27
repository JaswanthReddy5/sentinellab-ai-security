import type { DataStore } from "./types";
import { MemoryStore } from "./memoryStore";
import { PrismaStore } from "./prismaStore";
import { logger } from "../logger";

let instance: DataStore | null = null;

/**
 * Returns the active data store.
 *
 * If DATABASE_URL is configured, the Postgres-backed PrismaStore is used.
 * Otherwise SentinelLab falls back to a deterministic in-memory store seeded
 * with realistic demo data — this is what powers the public Vercel demo, and
 * guarantees the product works with zero external configuration, mirroring
 * the "must also work without an API key" requirement for the LLM layer.
 *
 * PrismaStore is imported statically (rather than via a conditional
 * require/import) because instantiating it does not itself open a database
 * connection — Prisma Client connects lazily on first query — so it is safe
 * to import even when DATABASE_URL is unset.
 */
export function getStore(): DataStore {
  if (instance) return instance;

  if (process.env.DATABASE_URL) {
    try {
      instance = new PrismaStore();
      logger.info("data_store_selected", { kind: "prisma" });
      return instance;
    } catch (err) {
      logger.error("prisma_store_init_failed_falling_back_to_memory", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  instance = new MemoryStore();
  logger.info("data_store_selected", { kind: "memory" });
  return instance;
}

export function isDemoMode(): boolean {
  return getStore().kind === "memory";
}
