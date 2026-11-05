import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const fileA = path.join(__dirname, 'data', 'RA MODERN SAHID - KELOMPOK A TP. 2026-2027.xlsx');
    const fileB = path.join(__dirname, 'data', 'RA MODERN SAHID - KELOMPOK B TP. 2026-2027.xlsx');

    // Fungsi helper untuk membaca SEMUA sheet dari sebuah file Excel
    const readAllSheetsFromExcel = (filePath, defaultKelompok) => {
      const workbook = XLSX.readFile(filePath);
      let allRows = [];

      workbook.SheetNames.forEach((sheetName) => {
        console.log(`   📄 Membaca sheet: "${sheetName}"`);
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        // Menandai kelompok berdasarkan nama sheet atau parameter default
        rows.forEach((row) => {
          row._targetKelompok = defaultKelompok;
          // Opsional: jika nama sheet mengandung huruf B atau A, bisa dideteksi otomatis di sini jika perlu
        });

        allRows = allRows.concat(rows);
      });

      return allRows;
    };

    console.log('📂 Membaca semua sheet dari file Excel Kelompok A...');
    const dataKelompokA = readAllSheetsFromExcel(fileA, 'A');

    console.log('📂 Membaca semua sheet dari file Excel Kelompok B...');
    const dataKelompokB = readAllSheetsFromExcel(fileB, 'B');

    console.log(`✨ Total keseluruhan ditemukan ${dataKelompokA.length} data di Kelompok A dan ${dataKelompokB.length} data di Kelompok B.`);

    // Fungsi proses insert/update ke database
    const processRows = async (rows, kelompokLabel) => {
      for (const row of rows) {
        try {
          const nisValue = String(row['NISN'] || row['NIK'] || '').replace(/'/g, '');
          const nikValue = String(row['NIK'] || '').replace(/'/g, '');
          const nisnValue = String(row['NISN'] || '').replace(/'/g, '');
          
          if (!nisValue) continue;

          const dataPayload = {
            nama: row['Nama Lengkap'] || row['Nama'] || '',
            nik: nikValue,
            nisn: nisnValue !== '' ? nisnValue : null,
            tempatLahir: row['Tempat Lahir'] || '',
            tanggalLahir: row['Tanggal Lahir'] ? new Date(row['Tanggal Lahir']) : null,
            jenisKelamin: row['Jenis Kelamin'] || '',
            alamat: row['Alamat'] || '',
            status: row['Status'] || 'Aktif',
            kebutuhanKhusus: row['Kebutuhan Khusus'] || null,
            disabilitas: row['Disabilitas'] || null,
            ayahKandung: row['Nama Ayah Kandung'] || '',
            ibuKandung: row['Nama Ibu Kandung'] || '',
            wali: row['Nama Wali'] || null,
            tingkatRombel: String(row['Tingkat - Rombel'] || sheetName || ''),
            kelompok: kelompokLabel,
            tahunAjaran: '2026-2027',
          };

          await prisma.siswa.upsert({
            where: { nis: nisValue },
            update: dataPayload,
            create: {
              nis: nisValue,
              ...dataPayload,
            },
          });
        } catch (err) {
          console.warn(`⚠️ Gagal insert/update baris ${row['Nama Lengkap'] || row['Nama']}:`, err.message);
        }
      }
    };

    console.log('🚀 Mengimpor seluruh data Kelompok A ke database...');
    await processRows(dataKelompokA, 'A');
    console.log('✅ Selesai memproses semua sheet Kelompok A.');

    console.log('🚀 Mengimpor seluruh data Kelompok B ke database...');
    await processRows(dataKelompokB, 'B');
    console.log('✅ Selesai memproses semua sheet Kelompok B.');

    console.log('🎉 🎉 SEMUA DATA DARI SEMUA SHEET BERHASIL DIIMPOR!');
    
  } catch (error) {
    console.error('❌ Gagal menjalankan skrip:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();