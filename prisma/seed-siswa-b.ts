import "dotenv/config";

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const WORKBOOK_NAME = "RA MODERN SAHID - KELOMPOK B TP. 2026-2027.xlsx";

type Column =
  | "nama"
  | "nik"
  | "nis"
  | "nisn"
  | "tempatLahir"
  | "tanggalLahir"
  | "jenisKelamin"
  | "alamat"
  | "ayah"
  | "ibu"
  | "wali";

type StudentRecord = {
  nis: string;
  nisn: string | null;
  nik: string;
  nama: string;
  tempatLahir: string | null;
  tanggalLahir: Date | null;
  tingkatRombel: string;
  jenisKelamin: string;
  alamat: string | null;
  ayahKandung: string | null;
  ibuKandung: string | null;
  wali: string | null;
  source: string;
};

const aliases: Record<Column, string[]> = {
  nama: ["nama lengkap", "nama siswa", "nama"],
  nik: ["nik", "nomor nik"],
  nis: ["nis", "nomor nis"],
  nisn: ["nisn", "nomor nisn"],
  tempatLahir: ["tempat lahir"],
  tanggalLahir: ["tanggal lahir", "tgl lahir"],
  jenisKelamin: ["jenis kelamin", "jk"],
  alamat: ["alamat"],
  ayah: ["nama ayah kandung", "nama ayah", "ayah kandung", "ayah"],
  ibu: ["nama ibu kandung", "nama ibu", "ibu kandung", "ibu"],
  wali: ["nama wali", "wali"],
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findColumns(rows: unknown[][], sheetName: string) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex += 1) {
    const columns = new Map<Column, number>();
    rows[rowIndex].forEach((value, index) => {
      const header = normalize(value);
      for (const [column, names] of Object.entries(aliases) as [Column, string[]][]) {
        if (!columns.has(column) && names.some((name) => normalize(name) === header)) {
          columns.set(column, index);
        }
      }
    });
    if (columns.has("nama") && columns.has("nik")) return { rowIndex, columns };
  }
  throw new Error(`Header Nama Lengkap dan NIK tidak ditemukan pada sheet "${sheetName}".`);
}

function cellText(row: unknown[], columns: Map<Column, number>, column: Column) {
  const index = columns.get(column);
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function parseDate(value: string) {
  const text = value.trim();
  if (!text) return null;

  const match =
    text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/) ??
    text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (match) {
    const firstIsYear = match[1].length === 4;
    const year = Number(firstIsYear ? match[1] : match[3]);
    const month = Number(match[2]);
    const day = Number(firstIsYear ? match[3] : match[1]);
    const fullYear = year < 100 ? 2000 + year : year;
    const date = new Date(Date.UTC(fullYear, month - 1, day));
    if (
      date.getUTCFullYear() !== fullYear ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(`Tanggal lahir tidak valid: "${text}".`);
    }
    return date;
  }

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  throw new Error(`Format tanggal lahir tidak dikenali: "${text}".`);
}

function parseSheet(sheet: XLSX.WorkSheet, sheetName: string) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const { rowIndex, columns } = findColumns(rows, sheetName);
  const records: StudentRecord[] = [];
  let skippedInvalidNik = 0;

  for (let index = rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const source = `sheet "${sheetName}", baris ${index + 1}`;
    const nama = cellText(row, columns, "nama");
    const rawNik = cellText(row, columns, "nik");
    const nik = rawNik.replace(/\D/g, "");
    if (!nama && !rawNik) continue;
    if (!/^\d{16}$/.test(nik)) {
      skippedInvalidNik += 1;
      console.warn(
        `Peringatan: baris dilewati karena NIK tidak terdiri dari 16 digit (${source}; ${nik.length} digit setelah dibersihkan).`,
      );
      continue;
    }
    if (!nama) throw new Error(`Nama wajib diisi pada ${source}.`);

    const nisFromSheet = cellText(row, columns, "nis");
    const nisnValue = cellText(row, columns, "nisn");
    const nis = nisFromSheet || nisnValue || nik;
    const jenisKelaminValue = normalize(cellText(row, columns, "jenisKelamin"));
    const jenisKelamin =
      ["l", "lk", "laki", "lakilaki", "pria", "male"].includes(jenisKelaminValue)
        ? "Laki-laki"
        : ["p", "pr", "perempuan", "wanita", "female"].includes(jenisKelaminValue)
          ? "Perempuan"
          : null;
    if (!jenisKelamin) throw new Error(`Jenis kelamin tidak valid pada ${source}.`);

    records.push({
      nis,
      nisn: nisnValue || null,
      nik,
      nama,
      tempatLahir: cellText(row, columns, "tempatLahir") || null,
      tanggalLahir: parseDate(cellText(row, columns, "tanggalLahir")),
      tingkatRombel: sheetName,
      jenisKelamin,
      alamat: cellText(row, columns, "alamat") || null,
      ayahKandung: cellText(row, columns, "ayah") || null,
      ibuKandung: cellText(row, columns, "ibu") || null,
      wali: cellText(row, columns, "wali") || null,
      source,
    });
  }

  return { records, skippedInvalidNik };
}

function siswaData(record: StudentRecord) {
  return {
    nis: record.nis,
    nisn: record.nisn,
    nik: record.nik,
    nama: record.nama,
    tempatLahir: record.tempatLahir,
    tanggalLahir: record.tanggalLahir,
    tingkatRombel: record.tingkatRombel,
    jenisKelamin: record.jenisKelamin,
    alamat: record.alamat,
    ayahKandung: record.ayahKandung,
    ibuKandung: record.ibuKandung,
    wali: record.wali,
    status: "Aktif",
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Impor data siswa ini hanya boleh dijalankan di lingkungan lokal.");
  }

  const workbookPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    WORKBOOK_NAME,
  );
  if (!existsSync(workbookPath)) {
    throw new Error(`File Excel tidak ditemukan: prisma/data/${WORKBOOK_NAME}`);
  }

  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheetNames = workbook.SheetNames.filter((name) =>
    /^Kelompok B\b/i.test(name),
  );
  if (sheetNames.length === 0) {
    throw new Error('Workbook tidak memiliki sheet dengan nama "Kelompok B".');
  }

  let skippedInvalidNik = 0;
  const records = sheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" tidak dapat dibaca.`);
    const parsed = parseSheet(sheet, sheetName);
    skippedInvalidNik += parsed.skippedInvalidNik;
    return parsed.records;
  });
  if (records.length === 0) {
    throw new Error("Tidak ada siswa dengan NIK valid untuk diimpor.");
  }

  const seenNik = new Set<string>();
  const seenNis = new Map<string, string>();
  for (const record of records) {
    if (seenNik.has(record.nik)) {
      throw new Error(`NIK duplikat ditemukan pada ${record.source}.`);
    }
    const previousSource = seenNis.get(record.nis);
    if (previousSource) {
      throw new Error(`NIS duplikat ditemukan pada ${previousSource} dan ${record.source}.`);
    }
    seenNik.add(record.nik);
    seenNis.set(record.nis, record.source);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum diatur.");
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== "mysql:" || database !== "ra_sahid_db") {
    throw new Error("Impor siswa hanya diizinkan ke database MySQL ra_sahid_db.");
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
    const existingNis = await prisma.siswa.findMany({
      where: { nis: { in: records.map((record) => record.nis) } },
      select: { nis: true, nik: true },
    });
    for (const existing of existingNis) {
      const incoming = records.find((record) => record.nis === existing.nis);
      if (incoming && incoming.nik !== existing.nik) {
        throw new Error(
          `NIS yang digunakan pada ${incoming.source} sudah dimiliki siswa dengan NIK berbeda.`,
        );
      }
    }

    for (let start = 0; start < records.length; start += 50) {
      const batch = records.slice(start, start + 50);
      await prisma.$transaction(
        batch.map((record) => {
          const data = siswaData(record);
          return prisma.siswa.upsert({
            where: { nik: record.nik },
            create: data,
            update: data,
          });
        }),
      );
    }

    console.info(
      `Impor selesai: ${records.length} siswa dari ${sheetNames.join(", ")}; ${skippedInvalidNik} baris dilewati karena NIK tidak valid.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Impor siswa Kelompok B gagal:",
    error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.",
  );
  process.exitCode = 1;
});
