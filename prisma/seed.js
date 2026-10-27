const TAHUN_AJARAN = '2026-2027';
const SOURCES = [
  {
    kelompok: 'A',
    file: 'RA MODERN SAHID - KELOMPOK A TP. 2026-2027.xlsx',
  },
  {
    kelompok: 'B',
    file: 'RA MODERN SAHID - KELOMPOK B TP. 2026-2027.xlsx',
  },
];

function text(value) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function identifier(value) {
  return text(value)?.replace(/^'/, '').trim() || null;
}

function requiredText(row, column, fileName, rowNumber) {
  const value = text(row[column]);
  if (!value) {
    throw new Error(
      `Kolom "${column}" wajib diisi pada ${fileName}, baris data ${rowNumber}.`,
    );
  }
  return value;
}

function readStudents(source, XLSX, path) {
  const filePath = path.join(__dirname, 'data', source.file);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(`Workbook tidak memiliki sheet: ${source.file}`);
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
  });

  if (rows.length === 0) {
    throw new Error(`Tidak ada baris data pada sheet pertama ${source.file}.`);
  }

  console.log(`Kolom pada ${source.file} (${sheetName}):`, Object.keys(rows[0]));

  return rows.map((row, index) => {
    const nisn = identifier(row['NISN']);
    const nik = identifier(row['NIK']);
    const nis = nisn || nik;

    if (!nis) {
      throw new Error(
        `NISN dan NIK kosong pada ${source.file}, baris data ${index + 1}.`,
      );
    }

    return {
      nis,
      nisn,
      nik,
      nama: requiredText(row, 'Nama Lengkap', source.file, index + 1),
      tingkatRombel: requiredText(row, 'Tingkat - Rombel', source.file, index + 1),
      jenisKelamin: requiredText(row, 'Jenis Kelamin', source.file, index + 1),
      status: text(row['Status']) || 'Aktif',
      kelompok: source.kelompok,
      tahunAjaran: TAHUN_AJARAN,
    };
  });
}

async function main() {
  let pool;
  let prisma;

  try {
    await import('dotenv/config');
    const [{ PrismaClient }, { PrismaPg }, pg, xlsx, path] = await Promise.all([
      import('@prisma/client'),
      import('@prisma/adapter-pg'),
      import('pg'),
      import('xlsx'),
      import('node:path'),
    ]);
    const { Pool } = pg;
    const XLSX = xlsx.default || xlsx;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL belum diatur di environment atau file .env.');
    }

    const databaseUrl = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
      throw new Error('DATABASE_URL harus menggunakan protokol PostgreSQL.');
    }

    const studentsByGroup = SOURCES.map((source) => ({
      source,
      students: readStudents(source, XLSX, path),
    }));

    pool = new Pool({ connectionString });
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

    await prisma.$transaction(async (transaction) => {
      for (const { source, students } of studentsByGroup) {
        for (const student of students) {
          await transaction.siswa.upsert({
            where: { nis: student.nis },
            create: student,
            update: student,
          });
        }
        console.log(
          `Berhasil mengimpor ${students.length} siswa Kelompok ${source.kelompok}.`,
        );
      }
    });
  } catch (error) {
    console.error('Gagal mengimpor data siswa:', error);
    process.exitCode = 1;
  } finally {
    try {
      if (prisma) await prisma.$disconnect();
    } finally {
      if (pool) await pool.end();
    }
  }
}

main().catch((error) => {
  console.error('Gagal menutup koneksi atau menjalankan seed:', error);
  process.exitCode = 1;
});