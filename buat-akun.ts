import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import bcrypt from "bcryptjs";

neonConfig.webSocketConstructor = ws;

// Masukkan connection string Neon secara langsung agar tidak perlu membaca .env
const connectionString = "postgresql://neondb_owner:npg_Y1axWlUF5QJL@ep-soft-boat-b5heolmf-pooler.c-7.us-east-2.aws.neon.tech:6543/neondb?sslmode=require&pgbouncer=true";

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
    },
    create: {
      email: "admin@rasahid.com",
      name: "Administrator",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✔ Akun Admin berhasil disiapkan:", admin.email);

  // 2. Akun Kepala Sekolah
  const kepalaSekolah = await prisma.user.upsert({
    where: { email: "kepalasekolah@rasahid.com" },
    update: {
      passwordHash: hashedPassword,
      name: "Kepala Sekolah",
      role: "KEPALA_SEKOLAH",
    },
    create: {
      email: "kepalasekolah@rasahid.com",
      name: "Kepala Sekolah",
      passwordHash: hashedPassword,
      role: "KEPALA_SEKOLAH",
    },
  });
  console.log("✔ Akun Kepala Sekolah berhasil disiapkan:", kepalaSekolah.email);
  console.log("Selesai! Kedua akun sekarang menggunakan password: password");
}

main()
  .catch((e) => {
    console.error("Gagal membuat akun:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });