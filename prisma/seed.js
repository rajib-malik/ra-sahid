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

    const readExcel = (filePath) => {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    };

    console.log('Membaca file Excel Kelompok A & B...');
    const dataA = readExcel(fileA);
    const dataB = readExcel(fileB);

    console.log(`Ditemukan ${dataA.length} data di Kelompok A dan ${dataB.length} data di Kelompok B.`);

    console.log('Mengimpor data Kelompok A...');
    for (const row of dataA) {
      try {
        await prisma.siswa.create({
          data: {
            nama: row['Nama Lengkap'] || '',
            nis: String(row['NISN'] || row['NIK'] || ''),
            nik: String(row['NIK'] || ''),
            tempatLahir: row['Tempat Lahir'] || '',
            tanggalLahir: row['Tanggal Lahir'] ? new Date(row['Tanggal Lahir']) : null,
            jenisKelamin: row['Jenis Kelamin'] || '',
            alamat: row['Alamat'] || '',
            noTelepon: String(row['No Telepon'] || ''),
            namaAyah: row['Nama Ayah Kandung'] || '',
            namaIbu: row['Nama Ibu Kandung'] || '',
            kelompok: 'A',
            tahunAjaran: '2026-2027',
          },
        });
      } catch (err) {
        console.warn(`Gagal insert baris ${row['Nama Lengkap']}:`, err.message);
      }
    }
    console.log('✅ Selesai memproses Kelompok A.');

    console.log('Mengimpor data Kelompok B...');
    for (const row of dataB) {
      try {
        await prisma.siswa.create({
          data: {
            nama: row['Nama Lengkap'] || '',
            nis: String(row['NISN'] || row['NIK'] || ''),
            nik: String(row['NIK'] || ''),
            tempatLahir: row['Tempat Lahir'] || '',
            tanggalLahir: row['Tanggal Lahir'] ? new Date(row['Tanggal Lahir']) : null,
            jenisKelamin: row['Jenis Kelamin'] || '',
            alamat: row['Alamat'] || '',
            noTelepon: String(row['No Telepon'] || ''),
            namaAyah: row['Nama Ayah Kandung'] || '',
            namaIbu: row['Nama Ibu Kandung'] || '',
            kelompok: 'B',
            tahunAjaran: '2026-2027',
          },
        });
      } catch (err) {
        console.warn(`Gagal insert baris ${row['Nama Lengkap']}:`, err.message);
      }
    }
    console.log('✅ Selesai memproses Kelompok B.');

  } catch (error) {
    console.error('❌ Gagal menjalankan skrip:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();