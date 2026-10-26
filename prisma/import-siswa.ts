import "dotenv/config";

import { createInterface } from "node:readline/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import * as XLSX from "xlsx";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

type Group = "A" | "B";
type Mode = "check" | "import";
type Column =
  | "nama"
  | "nis"
  | "nisn"
  | "nik"
  | "tempatLahir"
  | "tanggalLahir"
  | "tingkatRombel"
  | "umur"
  | "status"
  | "jenisKelamin"
  | "alamat"
  | "kebutuhanKhusus"
  | "disabilitas"
  | "ayahKandung"
  | "ibuKandung"
  | "wali";

type Source = {
  file: string;
  sheet: string;
  row: number;
};

type StudentData = Prisma.SiswaCreateManyInput;

type StudentRecord = {
  data: StudentData;
  source: Source;
};

type Issue = {
  source: Source;
  message: string;
};

type WorkbookStats = {
  totalRows: number;
  blankRows: number;
  excludedRows: number;
  excludedSheets: string[];
  ageWithMonthPrecision: number;
};

type ExistingStudent = {
  nis: string;
  nisn: string | null;
  nik: string | null;
  nama: string;
  tempatLahir: string | null;
  tanggalLahir: Date | null;
  tingkatRombel: string;
  umur: number | null;
  jenisKelamin: string;
  status: string;
  alamat: string | null;
  kebutuhanKhusus: string | null;
  disabilitas: string | null;
  ayahKandung: string | null;
  ibuKandung: string | null;
  wali: string | null;
};

type DatabaseAssessment = {
  newRecords: StudentRecord[];
  duplicates: Issue[];
  conflicts: Issue[];
};

const ROOT_DIRECTORY = process.cwd();
const DATA_DIRECTORY = path.join(ROOT_DIRECTORY, "prisma", "data");
const SOURCES: { group: Group; file: string; expectedSheets: string[] }[] = [
  {
    group: "A",
    file: "RA MODERN SAHID - KELOMPOK A TP. 2026-2027.xlsx",
    expectedSheets: ["Kelompok A - A1", "Kelompok A - A2"],
  },
  {
    group: "B",
    file: "RA MODERN SAHID - KELOMPOK B TP. 2026-2027.xlsx",
    expectedSheets: ["Kelompok B - B1", "Kelompok B - B2", "Kelompok B - B3"],
  },
];
const INACTIVE_SHEET = "Tidak Aktif";
const HEADER_ALIASES: Record<Column, string[]> = {
  nama: ["nama lengkap", "nama siswa", "nama peserta didik", "nama anak", "nama"],
  nis: ["nis", "no nis", "nomor nis", "nomor induk siswa"],
  nisn: ["nisn", "no nisn", "nomor nisn", "nomor induk siswa nasional"],
  nik: ["nik", "no nik", "nomor nik", "nomor induk kependudukan"],
  tempatLahir: ["tempat lahir", "kota lahir"],
  tanggalLahir: ["tanggal lahir", "tgl lahir", "tanggal lahir siswa", "tgl lahir siswa"],
  tingkatRombel: ["tingkat rombel", "tingkat rombel kelas", "kelas", "rombel"],
  umur: ["umur", "usia"],
  status: ["status", "status siswa"],
  jenisKelamin: ["jenis kelamin", "jk", "gender"],
  alamat: ["alamat", "alamat lengkap", "alamat rumah"],
  kebutuhanKhusus: ["kebutuhan khusus"],
  disabilitas: ["disabilitas"],
  ayahKandung: ["nama ayah kandung", "ayah kandung", "nama ayah", "ayah"],
  ibuKandung: ["nama ibu kandung", "ibu kandung", "nama ibu", "ibu"],
  wali: ["nama wali", "orang tua wali", "orang tua", "wali"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findHeader(rows: unknown[][], source: string) {
  const lastHeaderRow = Math.min(rows.length, 40);
  for (let rowIndex = 0; rowIndex < lastHeaderRow; rowIndex += 1) {
    const indexes = new Map<Column, number>();
    const row = rows[rowIndex] ?? [];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const normalized = normalizeHeader(row[columnIndex]);
      if (!normalized) continue;

      for (const [column, aliases] of Object.entries(HEADER_ALIASES) as [Column, string[]][]) {
        if (!aliases.some((alias) => normalizeHeader(alias) === normalized)) continue;
        if (indexes.has(column)) {
          throw new Error(`Header kolom "${column}" muncul lebih dari sekali pada ${source}.`);
        }
        indexes.set(column, columnIndex);
      }
    }

    if (indexes.has("nama") && indexes.has("tingkatRombel") && indexes.has("jenisKelamin")) {
      return { rowIndex, indexes };
    }
  }

  throw new Error(
    `Header nama, tingkat/rombel, dan jenis kelamin tidak ditemukan dalam 40 baris pertama ${source}.`,
  );
}

function cellValue(
  sheet: XLSX.WorkSheet,
  row: unknown[],
  rowIndex: number,
  columnIndex: number | undefined,
  source: Source,
  field: string,
): unknown {
  if (columnIndex === undefined) return "";

  const value = row[columnIndex];
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    if (Number.isSafeInteger(value)) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const formatted = sheet[cellAddress]?.w;
      if (typeof formatted === "string" && /^\d+$/.test(formatted.trim())) {
        return formatted.trim();
      }
      return String(value);
    }

    throw new Error(`${field} bukan bilangan bulat yang dapat dipertahankan pada ${formatSource(source)}.`);
  }

  if (value instanceof Date) return value;
  return String(value).trim();
}

function textValue(
  sheet: XLSX.WorkSheet,
  row: unknown[],
  rowIndex: number,
  indexes: Map<Column, number>,
  column: Column,
  source: Source,
): string {
  const value = cellValue(sheet, row, rowIndex, indexes.get(column), source, column);
  if (value instanceof Date) {
    throw new Error(`Nilai ${column} tidak boleh berupa tanggal pada ${formatSource(source)}.`);
  }

  const text = String(value).trim();
  if ((column === "nisn" || column === "nik" || column === "nis") && text.startsWith("'")) {
    return text.slice(1).trim();
  }
  return text;
}

function optionalText(
  value: string,
  field: string,
  maximumLength: number,
  source: Source,
): string | null {
  if (value.length > maximumLength) {
    throw new Error(`${field} melebihi ${maximumLength} karakter pada ${formatSource(source)}.`);
  }
  return value || null;
}

function makeUtcDate(year: number, month: number, day: number, source: Source): Date {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getTime() > Date.now()
  ) {
    throw new Error(`Tanggal lahir tidak valid pada ${formatSource(source)}.`);
  }
  return date;
}

function parseDate(value: unknown, source: Source): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return makeUtcDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate(), source);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error(`Serial tanggal lahir tidak valid pada ${formatSource(source)}.`);
    return makeUtcDate(parsed.y, parsed.m, parsed.d, source);
  }

  const text = String(value).trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    return makeUtcDate(Number(match[1]), Number(match[2]), Number(match[3]), source);
  }

  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    return makeUtcDate(Number(match[3]), Number(match[2]), Number(match[1]), source);
  }

  match = text.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (match) {
    const months: Record<string, number> = {
      januari: 1, january: 1, februari: 2, february: 2, maret: 3, march: 3,
      april: 4, mei: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7,
      agustus: 8, august: 8, september: 9, oktober: 10, october: 10,
      november: 11, desember: 12, december: 12,
    };
    const month = months[match[2].toLowerCase()];
    if (month) return makeUtcDate(Number(match[3]), month, Number(match[1]), source);
  }

  throw new Error(`Format tanggal lahir tidak dikenali pada ${formatSource(source)}.`);
}

function parseAge(value: string, source: Source): number | null {
  if (!value) return null;
  const yearsAndMonths = value.match(/^(\d{1,3})\s*th\s*,\s*(\d{1,2})\s*bln$/i);
  if (yearsAndMonths) {
    const years = Number(yearsAndMonths[1]);
    const months = Number(yearsAndMonths[2]);
    if (years > 100 || months > 11) {
      throw new Error(`Umur tahun/bulan tidak valid pada ${formatSource(source)}.`);
    }
    return null;
  }

  const match = value.match(/^(\d{1,3})(?:\s*(?:tahun|thn|th))?$/i);
  if (!match) throw new Error(`Umur harus berupa angka bulat pada ${formatSource(source)}.`);

  const age = Number(match[1]);
  if (age > 100) throw new Error(`Umur harus berada dalam rentang 0-100 pada ${formatSource(source)}.`);
  return age;
}

function normalizeGender(value: string, source: Source): string {
  const normalized = normalizeHeader(value);
  if (["l", "lk", "laki", "lakilaki", "pria", "male"].includes(normalized)) {
    return "Laki-laki";
  }
  if (["p", "pr", "perempuan", "wanita", "female"].includes(normalized)) {
    return "Perempuan";
  }
  throw new Error(`Jenis kelamin kosong/tidak dikenali pada ${formatSource(source)}.`);
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatSource(source: Source): string {
  return `${source.file}, sheet "${source.sheet}", baris ${source.row}`;
}

function sourceIssue(source: Source, message: string): Issue {
  return { source, message };
}

function parseStudent(
  sheet: XLSX.WorkSheet,
  row: unknown[],
  rowIndex: number,
  indexes: Map<Column, number>,
  source: Source,
): StudentRecord {
  const text = (column: Column) =>
    textValue(sheet, row, rowIndex, indexes, column, source);
  const nama = text("nama");
  if (!nama) throw new Error(`Nama wajib diisi pada ${formatSource(source)}.`);
  if (nama.length > 150) {
    throw new Error(`Nama melebihi 150 karakter pada ${formatSource(source)}.`);
  }

  const nisnText = text("nisn");
  const nikText = text("nik");
  const sourceNis = text("nis");
  const nis = sourceNis || nisnText || nikText;
  if (!nis) {
    throw new Error(`NIS tidak tersedia dan tidak dapat dipetakan dari NISN/NIK pada ${formatSource(source)}.`);
  }
  if (nis.length > 50) throw new Error(`NIS melebihi 50 karakter pada ${formatSource(source)}.`);
  if (nisnText && !/^\d{10}$/.test(nisnText)) {
    throw new Error(`NISN harus terdiri dari 10 digit pada ${formatSource(source)}.`);
  }
  if (nikText && !/^\d{16}$/.test(nikText)) {
    throw new Error(`NIK harus terdiri dari 16 digit pada ${formatSource(source)}.`);
  }

  const tingkatRombel = text("tingkatRombel");
  if (!tingkatRombel) {
    throw new Error(`Tingkat/rombel wajib diisi pada ${formatSource(source)}.`);
  }
  if (tingkatRombel.length > 50) {
    throw new Error(`Tingkat/rombel melebihi 50 karakter pada ${formatSource(source)}.`);
  }

  const birthplace = text("tempatLahir");
  const dateValue = cellValue(
    sheet,
    row,
    rowIndex,
    indexes.get("tanggalLahir"),
    source,
    "tanggalLahir",
  );
  const status = text("status") || "Aktif";
  if (status.length > 30) {
    throw new Error(`Status melebihi 30 karakter pada ${formatSource(source)}.`);
  }

  const data: StudentData = {
    nis,
    nisn: optionalText(nisnText, "NISN", 10, source),
    nik: optionalText(nikText, "NIK", 16, source),
    nama,
    tempatLahir: optionalText(birthplace, "Tempat lahir", 100, source),
    tanggalLahir: parseDate(dateValue, source),
    tingkatRombel,
    umur: parseAge(text("umur"), source),
    jenisKelamin: normalizeGender(text("jenisKelamin"), source),
    status,
    alamat: optionalText(text("alamat"), "Alamat", 2000, source),
    kebutuhanKhusus: optionalText(text("kebutuhanKhusus"), "Kebutuhan khusus", 1000, source),
    disabilitas: optionalText(text("disabilitas"), "Disabilitas", 1000, source),
    ayahKandung: optionalText(text("ayahKandung"), "Nama ayah", 150, source),
    ibuKandung: optionalText(text("ibuKandung"), "Nama ibu", 150, source),
    wali: optionalText(text("wali"), "Nama wali", 150, source),
  };

  return { data, source };
}

function workbookRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });
}

function parseWorkbook(
  file: string,
  requestedGroup: Group,
): {
  records: StudentRecord[];
  issues: Issue[];
  stats: WorkbookStats;
} {
  const workbookPath = path.join(DATA_DIRECTORY, file);
  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const configured = SOURCES.find((source) => source.file === file);
  if (!configured) throw new Error(`Konfigurasi workbook tidak ditemukan untuk ${file}.`);

  const records: StudentRecord[] = [];
  const issues: Issue[] = [];
  const stats: WorkbookStats = {
    totalRows: 0,
    blankRows: 0,
    excludedRows: 0,
    excludedSheets: [],
    ageWithMonthPrecision: 0,
  };
  const expectedSheets = new Set(configured.expectedSheets);
  const foundSheets = new Set(workbook.SheetNames);

  for (const expected of configured.expectedSheets) {
    if (!foundSheets.has(expected)) {
      issues.push(sourceIssue(
        { file, sheet: expected, row: 1 },
        "Sheet kelas yang diwajibkan tidak ditemukan.",
      ));
    }
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      issues.push(sourceIssue({ file, sheet: sheetName, row: 1 }, "Sheet tidak dapat dibaca."));
      continue;
    }

    const rows = workbookRows(sheet);
    const { rowIndex, indexes } = findHeader(rows, `${file}, sheet "${sheetName}"`);
    const header = rows[rowIndex] ?? [];
    const mappedColumnIndexes = new Set(indexes.values());
    const unsupportedColumns: { index: number; label: string }[] = [];
    header.forEach((value, index) => {
      if (!hasValue(value) || mappedColumnIndexes.has(index)) return;
      const label = String(value).trim();
      if (normalizeHeader(label) === "no") {
        return;
      } else {
        unsupportedColumns.push({ index, label });
      }
    });
    const isExpectedClass = expectedSheets.has(sheetName);
    const isInactive = sheetName === INACTIVE_SHEET;
    if (!isExpectedClass && !isInactive) {
      issues.push(sourceIssue(
        { file, sheet: sheetName, row: rowIndex + 1 },
        "Sheet tidak dikenali sebagai rombel yang diimpor atau sheet Tidak Aktif.",
      ));
    }

    for (let index = rowIndex + 1; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      stats.totalRows += 1;
      if (!row.some(hasValue)) {
        stats.blankRows += 1;
        continue;
      }

      const source = { file, sheet: sheetName, row: index + 1 };
      if (isInactive || !isExpectedClass) {
        stats.excludedRows += 1;
        if (!stats.excludedSheets.includes(sheetName)) stats.excludedSheets.push(sheetName);
        continue;
      }
      const unsupported = unsupportedColumns.find(({ index }) => hasValue(row[index]));
      if (unsupported) {
        issues.push(sourceIssue(
          source,
          `Kolom "${unsupported.label}" berisi data tetapi tidak memiliki field penyimpanan pada model Siswa; baris ini tidak dapat diimpor.`,
        ));
        continue;
      }
      const ageColumn = indexes.get("umur");
      if (ageColumn !== undefined) {
        const age = String(row[ageColumn] ?? "").trim();
        if (/^\d{1,3}\s*th\s*,\s*\d{1,2}\s*bln$/i.test(age)) {
          stats.ageWithMonthPrecision += 1;
        }
      }

      try {
        const record = parseStudent(sheet, row, index, indexes, source);
        const expectedGroupPrefix = requestedGroup === "A" ? "Kelompok A -" : "Kelompok B -";
        if (!record.data.tingkatRombel.startsWith(expectedGroupPrefix)) {
          throw new Error(
            `Rombel "${record.data.tingkatRombel}" tidak sesuai dengan workbook Kelompok ${requestedGroup} pada ${formatSource(source)}.`,
          );
        }
        if (record.data.tingkatRombel !== sheetName) {
          throw new Error(
            `Nilai tingkat/rombel tidak cocok dengan nama sheet pada ${formatSource(source)}.`,
          );
        }
        records.push(record);
      } catch (error) {
        issues.push(sourceIssue(
          source,
          error instanceof Error ? error.message : "Format data tidak valid.",
        ));
      }
    }
  }

  return { records, issues, stats };
}

function findWorkbookDuplicates(records: StudentRecord[]): {
  duplicates: Issue[];
  uniqueRecords: StudentRecord[];
} {
  const duplicateFields = new Map<StudentRecord, Set<string>>();
  const uniqueKeys: { field: "nis" | "nisn" | "nik"; value: (data: StudentData) => string | null }[] = [
    { field: "nis", value: (data) => data.nis },
    { field: "nisn", value: (data) => data.nisn ?? null },
    { field: "nik", value: (data) => data.nik ?? null },
  ];

  for (const { field, value } of uniqueKeys) {
    const occurrences = new Map<string, StudentRecord[]>();
    for (const record of records) {
      const key = value(record.data);
      if (!key) continue;
      const matching = occurrences.get(key) ?? [];
      matching.push(record);
      occurrences.set(key, matching);
    }

    for (const matching of occurrences.values()) {
      if (matching.length < 2) continue;
      for (const record of matching) {
        const fields = duplicateFields.get(record) ?? new Set<string>();
        fields.add(field);
        duplicateFields.set(record, fields);
      }
    }
  }

  const duplicates = [...duplicateFields].map(([record, fields]) =>
    sourceIssue(record.source, `Identifier unik duplikat dalam file Excel (${[...fields].join(", ")}).`),
  );
  return {
    duplicates,
    uniqueRecords: records.filter((record) => !duplicateFields.has(record)),
  };
}

function getTarget(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error("DATABASE_URL tidak tersedia. Atur variabel target sebelum menjalankan pemeriksaan.");
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL tidak memiliki format URL yang valid.");
  }

  if (
    (url.protocol !== "postgresql:" && url.protocol !== "postgres:") ||
    !url.hostname.endsWith(".neon.tech") ||
    !url.pathname.slice(1)
  ) {
    throw new Error(
      "Target harus berupa DATABASE_URL PostgreSQL Neon yang valid; URL dan kredensial tidak ditampilkan.",
    );
  }

  return {
    host: url.hostname,
    database: decodeURIComponent(url.pathname.slice(1)),
    pooled: url.hostname.includes("-pooler"),
  };
}

function databaseErrorMessage(error: unknown, connectionString: string): string {
  const code = error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code
    : error instanceof Error && "code" in error
      ? String(error.code)
      : null;
  const message = error instanceof Error
    ? error.message
      .replaceAll(connectionString, "[DATABASE_URL REDACTED]")
      .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[REDACTED]@")
      .replace(/password=[^\s&]+/gi, "password=[REDACTED]")
    : "Unknown error";
  return `${code ? `${code}: ` : ""}${message}`;
}

async function findExisting(
  client: PrismaClient | Prisma.TransactionClient,
  records: StudentRecord[],
): Promise<ExistingStudent[]> {
  if (records.length === 0) return [];
  const uniqueNis = [...new Set(records.map(({ data }) => data.nis))];
  const uniqueNisn = [...new Set(records.flatMap(({ data }) => data.nisn ? [data.nisn] : []))];
  const uniqueNik = [...new Set(records.flatMap(({ data }) => data.nik ? [data.nik] : []))];
  const OR: Prisma.SiswaWhereInput[] = [{ nis: { in: uniqueNis } }];
  if (uniqueNisn.length) OR.push({ nisn: { in: uniqueNisn } });
  if (uniqueNik.length) OR.push({ nik: { in: uniqueNik } });

  return client.siswa.findMany({
    where: { OR },
    select: {
      nis: true,
      nisn: true,
      nik: true,
      nama: true,
      tempatLahir: true,
      tanggalLahir: true,
      tingkatRombel: true,
      umur: true,
      jenisKelamin: true,
      status: true,
      alamat: true,
      kebutuhanKhusus: true,
      disabilitas: true,
      ayahKandung: true,
      ibuKandung: true,
      wali: true,
    },
  });
}

function dataMatchesExisting(data: StudentData, existing: ExistingStudent): boolean {
  const dateText = data.tanggalLahir instanceof Date
    ? data.tanggalLahir.toISOString().slice(0, 10)
    : data.tanggalLahir ?? null;
  const existingDateText = existing.tanggalLahir?.toISOString().slice(0, 10) ?? null;
  return data.nis === existing.nis &&
    (data.nisn ?? null) === existing.nisn &&
    (data.nik ?? null) === existing.nik &&
    data.nama === existing.nama &&
    (data.tempatLahir ?? null) === existing.tempatLahir &&
    dateText === existingDateText &&
    data.tingkatRombel === existing.tingkatRombel &&
    (data.umur ?? null) === existing.umur &&
    data.jenisKelamin === existing.jenisKelamin &&
    (data.status ?? "Aktif") === existing.status &&
    (data.alamat ?? null) === existing.alamat &&
    (data.kebutuhanKhusus ?? null) === existing.kebutuhanKhusus &&
    (data.disabilitas ?? null) === existing.disabilitas &&
    (data.ayahKandung ?? null) === existing.ayahKandung &&
    (data.ibuKandung ?? null) === existing.ibuKandung &&
    (data.wali ?? null) === existing.wali;
}

function assessDatabase(
  records: StudentRecord[],
  existing: ExistingStudent[],
): DatabaseAssessment {
  const newRecords: StudentRecord[] = [];
  const duplicates: Issue[] = [];
  const conflicts: Issue[] = [];

  for (const record of records) {
    const { data } = record;
    const matches = existing.filter((student) =>
      student.nis === data.nis ||
      (!!data.nisn && student.nisn === data.nisn) ||
      (!!data.nik && student.nik === data.nik),
    );

    if (matches.length === 0) {
      newRecords.push(record);
    } else if (matches.length === 1 && dataMatchesExisting(data, matches[0])) {
      duplicates.push(sourceIssue(record.source, "Data identik sudah ada di database; tidak akan diubah."));
    } else {
      conflicts.push(sourceIssue(
        record.source,
        "NIS/NISN/NIK cocok dengan data database yang berbeda atau detail datanya tidak identik; perlu ditinjau manual.",
      ));
    }
  }

  return { newRecords, duplicates, conflicts };
}

function printIssues(title: string, issues: Issue[]): void {
  console.log(`\n${title}: ${issues.length}`);
  for (const issue of issues) {
    const message = issue.message.replaceAll(` pada ${formatSource(issue.source)}`, "");
    console.log(`- ${formatSource(issue.source)}: ${message}`);
  }
}

function printRecords(title: string, records: StudentRecord[]): void {
  console.log(`\n${title}: ${records.length}`);
  for (const record of records) console.log(`- ${formatSource(record.source)}`);
}

async function confirmImport(target: { host: string; database: string }): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Mode impor memerlukan terminal interaktif untuk konfirmasi target database.");
  }

  const confirmation = `YA IMPOR ${target.database} PADA ${target.host}`;
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(
      `Ketik persis "${confirmation}" untuk menyisipkan data baru secara atomik: `,
    );
    return answer.trim() === confirmation;
  } finally {
    terminal.close();
  }
}

export async function runSiswaImport(mode: Mode, selectedGroups?: Group[]): Promise<void> {
  const groups = selectedGroups ?? ["A", "B"];
  const selectedSources = SOURCES.filter((source) => groups.includes(source.group));
  const records: StudentRecord[] = [];
  const validationIssues: Issue[] = [];
  const stats: WorkbookStats = {
    totalRows: 0,
    blankRows: 0,
    excludedRows: 0,
    excludedSheets: [],
    ageWithMonthPrecision: 0,
  };

  for (const source of selectedSources) {
    try {
      const parsed = parseWorkbook(source.file, source.group);
      records.push(...parsed.records);
      validationIssues.push(...parsed.issues);
      stats.totalRows += parsed.stats.totalRows;
      stats.blankRows += parsed.stats.blankRows;
      stats.excludedRows += parsed.stats.excludedRows;
      stats.excludedSheets.push(...parsed.stats.excludedSheets);
      stats.ageWithMonthPrecision += parsed.stats.ageWithMonthPrecision;
    } catch (error) {
      validationIssues.push(sourceIssue(
        { file: source.file, sheet: "(workbook)", row: 1 },
        error instanceof Error ? error.message : "Workbook tidak dapat dibaca.",
      ));
    }
  }

  const workbookDuplicates = findWorkbookDuplicates(records);
  const targetError: string[] = [];
  const connectionString = process.env.DATABASE_URL;
  let target: ReturnType<typeof getTarget> | null = null;
  try {
    target = getTarget(connectionString);
  } catch (error) {
    targetError.push(error instanceof Error ? error.message : "Target database tidak valid.");
  }

  let databaseAssessment: DatabaseAssessment = {
    newRecords: [],
    duplicates: [],
    conflicts: [],
  };
  let prisma: PrismaClient | null = null;
  let databaseError: string | null = null;

  try {
    if (target && connectionString) {
      try {
        prisma = new PrismaClient({
          adapter: new PrismaNeon({ connectionString }),
        });
        if (workbookDuplicates.uniqueRecords.length === 0) {
          await prisma.siswa.count();
        }
        const existing = await findExisting(prisma, workbookDuplicates.uniqueRecords);
        databaseAssessment = assessDatabase(workbookDuplicates.uniqueRecords, existing);
      } catch (error) {
        databaseError = databaseErrorMessage(error, connectionString);
      }
    }

    const allIssues = validationIssues.length +
      workbookDuplicates.duplicates.length +
      databaseAssessment.conflicts.length +
      targetError.length +
      (databaseError ? 1 : 0);
    const validRows = records.length;
    const needsReview = validationIssues.length +
      workbookDuplicates.duplicates.length +
      databaseAssessment.conflicts.length;

    console.log(`\n=== Pemeriksaan impor siswa (${mode === "check" ? "tanpa menulis database" : "akan mengimpor"}) ===`);
    console.log(`File sumber: ${selectedSources.map(({ file }) => file).join("; ")}`);
    console.log(`Total baris data pada rentang sheet: ${stats.totalRows}`);
    console.log(`Baris kosong: ${stats.blankRows}`);
    console.log(`Baris pada sheet yang dikecualikan: ${stats.excludedRows} (${[...new Set(stats.excludedSheets)].join(", ") || "-"})`);
    console.log(`Baris siswa pada sheet kelas: ${validRows + validationIssues.length}`);
    console.log(`Baris valid: ${validRows}`);
    console.log("Pemetaan NIS: kolom NIS bila tersedia; jika kosong, gunakan NISN lalu NIK sesuai seed lama.");
    console.log(`Umur tahun+bulan tidak disimpan (field schema hanya Int?): ${stats.ageWithMonthPrecision}`);
    console.log(`Duplikasi dalam workbook: ${workbookDuplicates.duplicates.length}`);
    console.log(`Perlu ditinjau/diperbaiki: ${needsReview}`);
    if (target) {
      console.log(`Target DATABASE_URL: PostgreSQL Neon ${target.host}/${target.database} (pooler: ${target.pooled ? "ya" : "tidak"}; rahasia disembunyikan)`);
    }
    if (targetError.length) {
      console.log(`Target database: tidak valid (${targetError.join(" ")})`);
    }
    if (databaseError) {
      console.log(`Pemeriksaan database gagal: ${databaseError}`);
    } else {
      console.log(`Data baru: ${databaseAssessment.newRecords.length}`);
      console.log(`Data identik yang dilewati tanpa perubahan: ${databaseAssessment.duplicates.length}`);
      console.log(`Konflik identitas database: ${databaseAssessment.conflicts.length}`);
    }

    printRecords("Lokasi data baru", databaseAssessment.newRecords);
    printIssues("Data yang sudah ada dan dilewati", databaseAssessment.duplicates);
    printIssues("Duplikasi di sumber", workbookDuplicates.duplicates);
    printIssues("Baris perlu diperbaiki", validationIssues);
    printIssues("Konflik identitas database", databaseAssessment.conflicts);

    if (mode === "check") {
      if (allIssues > 0) {
        throw new Error("Pemeriksaan menemukan data/konfigurasi yang perlu diperbaiki; tidak ada perubahan database.");
      }
      console.log("\nPemeriksaan selesai. Database tidak diubah.");
      return;
    }

    if (allIssues > 0) {
      throw new Error("Impor dibatalkan karena masih ada baris bermasalah, konflik, atau pemeriksaan database gagal.");
    }
    if (!target || !prisma || !connectionString) {
      throw new Error("Koneksi database belum siap; tidak ada perubahan yang dilakukan.");
    }
    if (databaseAssessment.newRecords.length === 0) {
      console.log("\nTidak ada data baru untuk disisipkan; database tidak diubah.");
      return;
    }

    console.log(`\nJumlah data baru yang akan disisipkan: ${databaseAssessment.newRecords.length}`);
    console.log(`Target telah diperiksa: ${target.host}/${target.database}`);
    if (!(await confirmImport(target))) {
      throw new Error("Konfirmasi target tidak cocok; impor dibatalkan tanpa perubahan.");
    }

    try {
      const outcome = await prisma.$transaction(async (transaction) => {
        const current = await findExisting(transaction, workbookDuplicates.uniqueRecords);
        const latestAssessment = assessDatabase(workbookDuplicates.uniqueRecords, current);
        if (latestAssessment.conflicts.length > 0) {
          throw new Error("Identitas berubah sejak pemeriksaan; jalankan mode check dan tinjau konflik.");
        }

        const created = latestAssessment.newRecords;
        if (created.length === 0) {
          return { created: 0, duplicates: latestAssessment.duplicates.length };
        }

        const result = await transaction.siswa.createMany({
          data: created.map(({ data }) => data),
        });
        if (result.count !== created.length) {
          throw new Error("Jumlah data tersimpan tidak sesuai; transaksi dibatalkan.");
        }
        return { created: result.count, duplicates: latestAssessment.duplicates.length };
      });

      console.log(
        `Impor berhasil: ${outcome.created} siswa baru disisipkan; ${outcome.duplicates} data identik dilewati. Tidak ada data lama yang diubah.`,
      );
    } catch (error) {
      const safeMessage = databaseErrorMessage(error, connectionString);
      throw new Error(`Transaksi impor gagal dan dibatalkan: ${safeMessage}`);
    }
  } finally {
    await prisma?.$disconnect();
  }
}

const entryFile = path.basename(process.argv[1] ?? "").toLowerCase();
if (entryFile === "import-siswa.ts") {
  const args = process.argv.slice(2);
  const invalidArgs = args.filter((argument) => argument !== "--check");
  if (invalidArgs.length > 0 || args.filter((argument) => argument === "--check").length > 1) {
    console.error("Argumen tidak dikenal. Gunakan --check atau jalankan tanpa argumen untuk impor.");
    process.exitCode = 1;
  } else {
    const mode: Mode = args.includes("--check") ? "check" : "import";
    runSiswaImport(mode).catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : "Proses impor siswa gagal.",
      );
      process.exitCode = 1;
    });
  }
}
