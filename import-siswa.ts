import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import * as xlsx from "xlsx";
import path from "path";

// Inisialisasi adapter Neon khusus untuk skrip impor
neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur di dalam file .env");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// Tentukan lokasi file Excel Anda
const EXCEL_FILES = [
  "prisma/data/RA MODERN SAHID - KELOMPOK A TP. 2026-2027.xlsx",
  "prisma/data/RA MODERN SAHID - KELOMPOK B TP. 2026-2027.xlsx"
];

async function main() {
  for (const file of EXCEL_FILES) {
    console.log(`\n📄 Membaca file: ${file}`);
    const filePath = path.resolve(process.cwd(), file);
    const workbook = xlsx.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
      console.log(`➡️ Memproses sheet: ${sheetName}`);
      const data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const barisExcel = i + 2; 

        const nis = String(row["NIS"] || "").trim();
        const nik = String(row["NIK"] || "").trim();
        const nisn = String(row["NISN"] || "").trim();
        const nama = row["Nama"];
        const kelas = String(row["Kelas"] || "").trim();
        const jk = String(row["JK"] || "L");

        // Validasi Pencegahan Data Cacat
        if (!nis) {
          console.warn(`⚠️ Baris ${barisExcel} dilewati: NIS kosong.`);
          continue;
        }
        if (nik && nik.length !== 16) {
          console.error(`❌ Baris ${barisExcel} ditolak: NIK harus 16 digit (${nik}).`);
          continue;
        }

        try {
          // Upsert: Perbarui jika NIS sudah ada, buat baru jika belum ada
          await prisma.siswa.upsert({
            where: { nis: nis },
            update: {
              nama,
              tingkatRombel: kelas,
              jenisKelamin: jk,
              nik: nik || null,
              nisn: nisn || null,
            },
            create: {
              nis,
              nama,
              tingkatRombel: kelas,
              jenisKelamin: jk,
              nik: nik || null,
              nisn: nisn || null,
              status: "Aktif",
            },
          });
          console.log(`✅ Tersimpan: ${nama} (NIS: ${nis})`);
        } catch (error) {
          console.error(`❌ Gagal menyimpan baris ${barisExcel} (NIS: ${nis}):`, error);
        }
      }
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    console.log("\n🚀 Proses impor selesai.");
  });