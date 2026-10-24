import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur di dalam environment variables.");
}

// Validasi protokol URL PostgreSQL
try {
  const url = new URL(connectionString);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL harus menggunakan URL PostgreSQL yang valid.");
  }
} catch (e) {
  throw new Error("Format DATABASE_URL tidak valid: " + (e instanceof Error ? e.message : String(e)));
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Inisialisasi pool dan adapter Prisma Neon yang kompatibel
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;