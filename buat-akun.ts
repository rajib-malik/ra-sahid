import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import bcrypt from "bcryptjs";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL tidak ditemukan di file .env!");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Menghubungkan langsung ke database Neon PostgreSQL...");
  
  const hashedPassword = await bcrypt.hash("password", 10);

  // 1. Akun Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@rasahid.com" },
    update: {
      passwordHash: hashedPassword,
      name: "Administrator",
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@rasahid.com",
      name: "Administrator",
      passwordHash: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("✔ Akun Admin berhasil disiapkan/diaktifkan:", admin.email);

  // 2. Akun Kepala Sekolah
  const kepalaSekolah = await prisma.user.upsert({
    where: { email: "kepalasekolah@rasahid.com" },
    update: {
      passwordHash: hashedPassword,
      name: "Kepala Sekolah",
      role: "KEPALA_SEKOLAH",
      isActive: true,
    },
    create: {
      email: "kepalasekolah@rasahid.com",
      name: "Kepala Sekolah",
      passwordHash: hashedPassword,
      role: "KEPALA_SEKOLAH",
      isActive: true,
    },
  });
  console.log("✔ Akun Kepala Sekolah berhasil disiapkan/diaktifkan:", kepalaSekolah.email);
  console.log("Selesai! Kedua akun kini aktif dengan password: password");
}

main()
  .catch((e) => {
    console.error("Gagal memperbarui akun:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });