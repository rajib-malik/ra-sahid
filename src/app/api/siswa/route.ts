import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { authorizeApiRequest, isSameOriginRequest } from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

type SiswaInput = {
  id?: string;
  nis: string;
  nisn?: string | null;
  nik?: string | null;
  nama: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  tingkatRombel: string;
  umur?: number | null;
  jenisKelamin: string;
  status?: string;
  alamat?: string | null;
  kebutuhanKhusus?: string | null;
  disabilitas?: string | null;
  ayahKandung?: string | null;
  ibuKandung?: string | null;
  wali?: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return isObject(body) ? body : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function isOptionalText(value: unknown, maximumLength: number) {
  return value === undefined || value === null ||
    (typeof value === "string" && value.length <= maximumLength);
}

function isOptionalDigits(value: unknown, length: number) {
  return value === undefined || value === null || value === "" ||
    (typeof value === "string" && new RegExp(`^\\d{${length}}$`).test(value));
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isSiswaInput(value: Record<string, unknown>): value is Record<string, unknown> & SiswaInput {
  return (
    typeof value.nis === "string" && !!value.nis.trim() && value.nis.trim().length <= 50 &&
    isOptionalText(value.nisn, 10) &&
    isOptionalDigits(value.nisn, 10) &&
    isOptionalText(value.nik, 16) &&
    isOptionalDigits(value.nik, 16) &&
    typeof value.nama === "string" && !!value.nama.trim() && value.nama.trim().length <= 150 &&
    isOptionalText(value.tempatLahir, 100) &&
    (value.tanggalLahir === undefined || value.tanggalLahir === null || value.tanggalLahir === "" ||
      (typeof value.tanggalLahir === "string" && isValidDate(value.tanggalLahir))) &&
    typeof value.tingkatRombel === "string" && !!value.tingkatRombel.trim() && value.tingkatRombel.trim().length <= 50 &&
    (value.umur === undefined || value.umur === null ||
      (typeof value.umur === "number" && Number.isInteger(value.umur) && value.umur >= 0 && value.umur <= 100)) &&
    typeof value.jenisKelamin === "string" && ["Laki-laki", "Perempuan"].includes(value.jenisKelamin) &&
    (value.status === undefined ||
      (typeof value.status === "string" && !!value.status.trim() && value.status.trim().length <= 30)) &&
    isOptionalText(value.alamat, 2000) &&
    isOptionalText(value.kebutuhanKhusus, 1000) &&
    isOptionalText(value.disabilitas, 1000) &&
    isOptionalText(value.ayahKandung, 150) &&
    isOptionalText(value.ibuKandung, 150) &&
    isOptionalText(value.wali, 150)
  );
}

function siswaData(value: SiswaInput) {
  const tanggalLahir = typeof value.tanggalLahir === "string" && value.tanggalLahir
    ? new Date(`${value.tanggalLahir}T00:00:00.000Z`)
    : null;
  const optionalText = (text: string | null | undefined) => text?.trim() || null;

  return {
    nis: value.nis.trim(),
    nisn: optionalText(value.nisn),
    nik: optionalText(value.nik),
    nama: value.nama.trim(),
    tempatLahir: optionalText(value.tempatLahir),
    tanggalLahir,
    tingkatRombel: value.tingkatRombel.trim(),
    umur: value.umur ?? null,
    jenisKelamin: value.jenisKelamin,
    status: value.status?.trim() || "Aktif",
    alamat: optionalText(value.alamat),
    kebutuhanKhusus: optionalText(value.kebutuhanKhusus),
    disabilitas: optionalText(value.disabilitas),
    ayahKandung: optionalText(value.ayahKandung),
    ibuKandung: optionalText(value.ibuKandung),
    wali: optionalText(value.wali),
  };
}

function serializeSiswa(record: {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...record,
    tanggalLahir: record.tanggalLahir?.toISOString().slice(0, 10) ?? null,
    kelas: record.tingkatRombel,
    jk: record.jenisKelamin,
  };
}

function handleUniqueConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      { error: "NIS, NISN, atau NIK tersebut sudah terdaftar." },
      { status: 409 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.STUDENTS_READ, request);
  if (authorization.response) return authorization.response;

  try {
    const siswa = await prisma.siswa.findMany({ orderBy: { nama: "asc" } });
    if (authorization.user.role === "guru") {
      return NextResponse.json(siswa.map((record) => ({
        id: record.id,
        nis: record.nis,
        nisn: record.nisn,
        nama: record.nama,
        tingkatRombel: record.tingkatRombel,
        status: record.status,
        kelas: record.tingkatRombel,
      })), { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(siswa.map(serializeSiswa), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma gagal memuat data siswa:", {
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Gagal memuat data siswa:", error);
    }
    return NextResponse.json({ error: "Gagal memuat data siswa." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.OPERATIONAL_WRITE, request);
  if (authorization.response) return authorization.response;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  try {
    const body = await readBody(request);
    if (!body || !isSiswaInput(body)) {
      return NextResponse.json({ error: "Data siswa tidak lengkap atau format salah." }, { status: 400 });
    }
    const siswa = await prisma.siswa.create({ data: siswaData(body) });
    return NextResponse.json(serializeSiswa(siswa), { status: 201 });
  } catch (error) {
    const conflict = handleUniqueConflict(error);
    if (conflict) return conflict;
    console.error("Gagal menyimpan data siswa:", error);
    return NextResponse.json({ error: "Gagal menyimpan data siswa." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.OPERATIONAL_WRITE, request);
  if (authorization.response) return authorization.response;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  try {
    const body = await readBody(request);
    if (!body || typeof body.id !== "string" || !body.id.trim() || !isSiswaInput(body)) {
      return NextResponse.json({ error: "ID dan data siswa wajib diisi dengan format yang benar." }, { status: 400 });
    }
    const siswa = await prisma.siswa.update({
      where: { id: body.id.trim() },
      data: siswaData(body),
    });
    return NextResponse.json(serializeSiswa(siswa));
  } catch (error) {
    const conflict = handleUniqueConflict(error);
    if (conflict) return conflict;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }
    console.error("Gagal memperbarui data siswa:", error);
    return NextResponse.json({ error: "Gagal memperbarui data siswa." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.OPERATIONAL_WRITE, request);
  if (authorization.response) return authorization.response;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "ID siswa wajib diisi." }, { status: 400 });

  try {
    await prisma.siswa.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Siswa tidak dapat dihapus karena masih memiliki data akademik, absensi, atau keuangan." },
          { status: 409 },
        );
      }
    }
    console.error("Gagal menghapus data siswa:", error);
    return NextResponse.json({ error: "Gagal menghapus data siswa." }, { status: 500 });
  }
}
