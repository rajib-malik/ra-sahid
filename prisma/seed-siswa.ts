import "dotenv/config";

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import * as XLSX from "xlsx";

const WORKBOOK_NAME = "RA MODERN SAHID - KELOMPOK A TP. 2026-2027.xlsx";
const WORKBOOK_DIRECTORY = "data";
const SHEET_NAMES = ["Kelompok A - A1", "Kelompok A - A2"] as const;

type Column =
  | "nama"
  | "nik"
  | "nis"
  | "nisn"
  | "tempatLahir"
  | "tanggalLahir"
  | "tempatTanggalLahir"
  | "jenisKelamin"
  | "alamat"
  | "ayahKandung"
  | "ibuKandung"
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

const HEADER_ALIASES: Record<Column, string[]> = {
  nama: ["nama lengkap", "nama siswa", "nama peserta didik", "nama anak", "nama"],
  nik: ["nik", "no nik", "nomor nik", "nomor induk kependudukan"],
  nis: ["nis", "no nis", "nomor nis", "nomor induk siswa"],
  nisn: ["nisn", "no nisn", "nomor nisn", "nomor induk siswa nasional"],
  tempatLahir: ["tempat lahir", "kota lahir"],
  tanggalLahir: ["tanggal lahir", "tgl lahir", "tanggal lahir siswa", "tgl lahir siswa"],
  tempatTanggalLahir: ["tempat tanggal lahir", "tempat tgl lahir", "tempat dan tanggal lahir", "ttl"],
  jenisKelamin: ["jenis kelamin", "jk", "gender"],
  alamat: ["alamat", "alamat lengkap", "alamat rumah"],
  ayahKandung: ["ayah", "nama ayah", "ayah kandung", "nama ayah kandung", "bapak"],
  ibuKandung: ["ibu", "nama ibu", "ibu kandung", "nama ibu kandung", "mama"],
  wali: ["orang tua", "orang tua wali", "nama orang tua", "wali", "nama wali"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findColumnIndexes(row: unknown[]) {
  const indexes = new Map<Column, number>();
  row.forEach((value, index) => {
    const header = normalizeHeader(value);
    for (const [column, aliases] of Object.entries(HEADER_ALIASES) as [Column, string[]][]) {
      if (!indexes.has(column) && aliases.some((alias) => normalizeHeader(alias) === header)) {
        indexes.set(column, index);
      }
    }
  });
  return indexes;
}

function findHeader(rows: unknown[][], sheetName: string) {
  for (let index = 0; index < Math.min(rows.length, 40); index += 1) {
    const columns = findColumnIndexes(rows[index]);
    if (columns.has("nama") && columns.has("nik")) {
      return { rowIndex: index, columns };
    }
  }

  throw new Error(
    `Header Nama dan NIK tidak ditemukan pada 40 baris pertama sheet "${sheetName}".`,
  );
}

function cellText(row: unknown[], columns: Map<Column, number>, column: Column) {
  const index = columns.get(column);
  if (index === undefined) return "";
  return String(row[index] ?? "").trim();
}

function parseDate(value: string) {
  const text = value.trim();
  if (!text) return null;

  const isoDate = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoDate) {
    return makeDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  }

  const localDate = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (localDate) {
    const year = Number(localDate[3]) < 100 ? 2000 + Number(localDate[3]) : Number(localDate[3]);
    return makeDate(year, Number(localDate[2]), Number(localDate[1]));
  }

  const namedMonth = text.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (namedMonth) {
    const months: Record<string, number> = {
      januari: 1, january: 1, februari: 2, february: 2, maret: 3, march: 3,
      april: 4, mei: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7,
      agustus: 8, august: 8, september: 9, oktober: 10, october: 10,
      november: 11, desember: 12, december: 12,
    };
    const month = months[namedMonth[2].toLowerCase()];
    if (month) return makeDate(Number(namedMonth[3]), month, Number(namedMonth[1]));
  }

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const date = XLSX.SSF.parse_date_code(serial);
    if (date) return makeDate(date.y, date.m, date.d);
  }

  throw new Error(`Format tanggal lahir tidak dikenali: "${text}".`);
}

function makeDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal lahir tidak valid: ${day}-${month}-${year}.`);
  }
  return date;
}

function parsePlaceAndDate(value: string) {
  if (!value) return { tempatLahir: null, tanggalLahir: null };
  const parts = value.split(",");
  let tanggalLahir: Date | null = null;
  let datePartIndex = -1;

  if (parts.length === 1) {
    const trailingDate = parts[0].match(
      /(?:^|\s)(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s+[a-zA-Z]+\s+\d{4})$/i,
    );
    if (trailingDate) {
      tanggalLahir = parseDate(trailingDate[1]);
      const tempatLahir = parts[0].slice(0, trailingDate.index).trim();
      return { tempatLahir: tempatLahir || null, tanggalLahir };
    }
  }

  for (let index = 0; index < parts.length; index += 1) {
    try {
      tanggalLahir = parseDate(parts[index]);
      datePartIndex = index;
      break;
    } catch {
      if (/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(parts[index])) {
        throw new Error(`Tanggal lahir tidak valid: "${parts[index].trim()}".`);
      }
    }
  }

  const tempatLahir = parts
    .filter((_, index) => index !== datePartIndex)
    .join(", ")
    .trim();
  return { tempatLahir: tempatLahir || null, tanggalLahir };
}

function normalizeGender(value: string, source: string) {
  const normalized = normalizeHeader(value);
  if (["l", "lk", "laki", "lakilaki", "pria", "male"].includes(normalized)) {
    return "Laki-laki";
  }
  if (["p", "pr", "perempuan", "wanita", "female"].includes(normalized)) {
    return "Perempuan";
  }
  throw new Error(`Jenis kelamin kosong/tidak dikenali pada ${source}.`);
}

function optionalText(value: string, source: string, field: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new Error(`${field} melebihi ${maxLength} karakter pada ${source}.`);
  }
  return value || null;
}

function prismaStudentData(record: StudentRecord) {
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

function parseSheet(sheet: XLSX.WorkSheet, sheetName: string) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const { rowIndex, columns } = findHeader(rows, sheetName);
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
        `Peringatan: baris siswa dilewati karena NIK harus terdiri dari 16 digit setelah dibersihkan (${source}; ditemukan ${nik.length} digit).`,
      );
      continue;
    }
    if (!nama) {
      throw new Error(`Nama wajib diisi pada ${source}.`);
    }

    const nisFromSheet = cellText(row, columns, "nis");
    const nisnValue = cellText(row, columns, "nisn");
    const nis = nisFromSheet || nisnValue || nik;
    if (nis.length > 50) throw new Error(`NIS melebihi 50 karakter pada ${source}.`);
    if (nisnValue.length > 10) throw new Error(`NISN melebihi 10 karakter pada ${source}.`);
    if (nama.length > 150) throw new Error(`Nama melebihi 150 karakter pada ${source}.`);

    const combinedBirth = parsePlaceAndDate(
      cellText(row, columns, "tempatTanggalLahir"),
    );
    const separatePlace = cellText(row, columns, "tempatLahir");
    const separateDate = cellText(row, columns, "tanggalLahir");
    const dateText = separateDate || "";
    let tanggalLahir = dateText ? parseDate(dateText) : combinedBirth.tanggalLahir;
    let tempatLahir = separatePlace || combinedBirth.tempatLahir;

    if (!columns.has("tempatTanggalLahir") && !columns.has("tanggalLahir")) {
      const legacyBirth = cellText(row, columns, "tempatLahir");
      const parsed = parsePlaceAndDate(legacyBirth);
      tempatLahir = parsed.tempatLahir;
      tanggalLahir = parsed.tanggalLahir;
    }
    if (tempatLahir && tempatLahir.length > 100) {
      throw new Error(`Tempat lahir melebihi 100 karakter pada ${source}.`);
    }

    records.push({
      nis,
      nisn: optionalText(nisnValue, source, "NISN", 10),
      nik,
      nama,
      tempatLahir,
      tanggalLahir,
      tingkatRombel: sheetName,
      jenisKelamin: normalizeGender(cellText(row, columns, "jenisKelamin"), source),
      alamat: optionalText(cellText(row, columns, "alamat"), source, "Alamat", 65535),
      ayahKandung: optionalText(cellText(row, columns, "ayahKandung"), source, "Nama ayah", 150),
      ibuKandung: optionalText(cellText(row, columns, "ibuKandung"), source, "Nama ibu", 150),
      wali: optionalText(cellText(row, columns, "wali"), source, "Orang tua/wali", 150),
      source,
    });
  }

  return { records, skippedInvalidNik };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Impor data siswa ini hanya boleh dijalankan di lingkungan lokal.");
  }

  const workbookPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    WORKBOOK_DIRECTORY,
    WORKBOOK_NAME,
  );
  if (!existsSync(workbookPath)) {
    throw new Error(
      `File Excel tidak ditemukan: prisma/${WORKBOOK_DIRECTORY}/${WORKBOOK_NAME}`,
    );
  }

  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  let skippedInvalidNik = 0;
  const records = SHEET_NAMES.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan di workbook.`);
    const result = parseSheet(sheet, sheetName);
    skippedInvalidNik += result.skippedInvalidNik;
    return result.records;
  });
  if (records.length === 0) {
    throw new Error("Tidak ada siswa dengan NIK valid untuk diimpor.");
  }

  const seenNik = new Map<string, string>();
  const seenNis = new Map<string, string>();
  for (const record of records) {
    const duplicateNik = seenNik.get(record.nik);
    if (duplicateNik) {
      throw new Error(`NIK duplikat pada ${duplicateNik} dan ${record.source}.`);
    }
    const duplicateNis = seenNis.get(record.nis);
    if (duplicateNis) {
      throw new Error(`NIS duplikat pada ${duplicateNis} dan ${record.source}.`);
    }
    seenNik.set(record.nik, record.source);
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
          `NIS ${existing.nis} pada ${incoming.source} sudah digunakan siswa dengan NIK berbeda.`,
        );
      }
    }

    const batchSize = 50;
    for (let start = 0; start < records.length; start += batchSize) {
      const batch = records.slice(start, start + batchSize);
      await prisma.$transaction(
        batch.map((record) => {
          const data = prismaStudentData(record);
          return prisma.siswa.upsert({
            where: { nik: record.nik },
            create: data,
            update: data,
          });
        }),
      );
    }
    console.info(
      `Impor siswa selesai: ${records.length} siswa diproses dari ${SHEET_NAMES.join(" dan ")}; ${skippedInvalidNik} baris dilewati karena NIK tidak valid.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Impor siswa gagal:",
    error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.",
  );
  process.exitCode = 1;
});
