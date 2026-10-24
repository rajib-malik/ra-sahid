import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed akun bawaan hanya boleh dijalankan di lingkungan lokal.");
  }

  const password = process.env.RA_SAHID_SEED_PASSWORD;
  if (!password || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(
      "Atur RA_SAHID_SEED_PASSWORD (maksimal 72 byte) sebelum menjalankan seed.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum diatur.");
  }

  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== "mysql:" || database !== "ra_sahid_db") {
    throw new Error("Seed akun hanya boleh dijalankan pada database MySQL ra_sahid_db.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: 2,
    }),
  });

  try {
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ["admin@rasahid.sch.id", "kepsek@rasahid.sch.id"],
        },
      },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((user) => user.email));
    const passwordHash = await bcrypt.hash(password, 12);
    const accounts = [
      {
        email: "admin@rasahid.sch.id",
        name: "Admin RA Sahid",
        passwordHash,
        role: "ADMIN" as const,
        isActive: true,
      },
      {
        email: "kepsek@rasahid.sch.id",
        name: "Kepala Sekolah RA Sahid",
        passwordHash,
        role: "KEPALA_SEKOLAH" as const,
        isActive: true,
      },
    ];
    const result = await prisma.user.createMany({
      data: accounts,
      skipDuplicates: true,
    });
    const seededUsers = await prisma.user.findMany({
      where: { email: { in: accounts.map((account) => account.email) } },
      select: {
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    for (const account of accounts) {
      const user = seededUsers.find((candidate) => candidate.email === account.email);
      if (
        !user ||
        user.role !== account.role ||
        !user.isActive ||
        !(await bcrypt.compare(password, user.passwordHash))
      ) {
        throw new Error(
          `Akun ${account.email} sudah ada dengan kredensial atau role berbeda; akun tersebut tidak diubah.`,
        );
      }
    }

    console.info(
      `Seed selesai: ${result.count} akun dibuat; ${existingEmails.size} akun yang sudah ada tidak diubah.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed akun gagal:", error);
  process.exitCode = 1;
});
