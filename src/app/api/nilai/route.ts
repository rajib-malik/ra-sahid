import { NextResponse } from "next/server";
import { authorizeApiRequest, isSameOriginRequest } from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type GradeEntry = {
  nis: string;
  nilaiAngka: number;
  predikat: "BSB" | "BSH" | "MB" | "BB";
  catatan: string;
};

type GradeInput = {
  tanggal: string;
  aspek: string;
  entries: GradeEntry[];
};

function isGradeEntry(value: unknown): value is GradeEntry {
  return isObject(value) &&
    typeof value.nis === "string" && !!value.nis.trim() &&
    typeof value.nilaiAngka === "number" && Number.isFinite(value.nilaiAngka) &&
    value.nilaiAngka >= 0 && value.nilaiAngka <= 100 &&
    typeof value.predikat === "string" && ["BSB", "BSH", "MB", "BB"].includes(value.predikat) &&
    typeof value.catatan === "string" && value.catatan.length <= 500;
}

function isGradeInput(value: unknown): value is GradeInput {
  return isObject(value) &&
    typeof value.tanggal === "string" && isValidDate(value.tanggal) &&
    typeof value.aspek === "string" && !!value.aspek.trim() && value.aspek.trim().length <= 100 &&
    Array.isArray(value.entries) && value.entries.length > 0 && value.entries.length <= 500 &&
    value.entries.every(isGradeEntry);
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.ACADEMIC_READ, request);
  if (authorization.response) return authorization.response;

  const search = new URL(request.url).searchParams;
  if (search.get("daftarMataPelajaran") === "true") {
    try {
      const records = await prisma.nilaiHarian.findMany({
        distinct: ["aspek"],
        select: { aspek: true },
        orderBy: { aspek: "asc" },
      });
      return NextResponse.json(records.map((record) => record.aspek), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.error("Gagal memuat daftar mata pelajaran:", error);
      return NextResponse.json({ error: "Gagal memuat daftar mata pelajaran." }, { status: 500 });
    }
  }

  const tanggal = search.get("tanggal");
  const kelas = search.get("kelas");
  const aspek = search.get("aspek");
  if (!tanggal || !isValidDate(tanggal)) {
    return NextResponse.json({ error: "Tanggal wajib diisi dengan format yang valid." }, { status: 400 });
  }
  if ((kelas && kelas.length > 100) || (aspek && (!aspek.trim() || aspek.length > 100))) {
    return NextResponse.json({ error: "Filter kelas atau mata pelajaran tidak valid." }, { status: 400 });
  }

  try {
    const records = await prisma.nilaiHarian.findMany({
      where: {
        tanggal,
        ...(aspek ? { aspek } : {}),
        ...(kelas ? { siswa: { tingkatRombel: kelas } } : {}),
      },
      include: { siswa: { select: { nama: true, tingkatRombel: true } } },
      orderBy: [{ siswa: { nama: "asc" } }, { aspek: "asc" }],
    });
    return NextResponse.json(records.map((record) => ({
      id: record.id,
      nis: record.nis,
      nama: record.siswa.nama,
      kelas: record.siswa.tingkatRombel,
      tanggal: record.tanggal,
      aspek: record.aspek,
      nilaiAngka: record.nilaiAngka,
      predikat: record.predikat,
      catatan: record.catatan,
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal memuat nilai harian:", error);
    return NextResponse.json({ error: "Gagal memuat nilai harian." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.ACADEMIC_WRITE, request);
  if (authorization.response) return authorization.response;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Format JSON tidak valid." }, { status: 400 });
      }
      throw error;
    }
    if (!isGradeInput(body)) {
      return NextResponse.json({ error: "Tanggal, aspek, dan seluruh nilai siswa harus diisi dengan benar." }, { status: 400 });
    }

    const entries = body.entries;
    const uniqueNis = new Set(entries.map((entry) => entry.nis.trim()));
    if (uniqueNis.size !== entries.length) {
      return NextResponse.json({ error: "Setiap siswa hanya boleh memiliki satu nilai untuk aspek dan tanggal yang sama." }, { status: 400 });
    }
    const students = await prisma.siswa.findMany({
      where: { nis: { in: [...uniqueNis] } },
      select: { nis: true },
    });
    if (students.length !== uniqueNis.size) {
      return NextResponse.json({ error: "Satu atau lebih siswa tidak ditemukan." }, { status: 400 });
    }

    const result = await prisma.$transaction(
      entries.map((entry) => {
        const nis = entry.nis.trim();
        return prisma.nilaiHarian.upsert({
          where: {
            nis_tanggal_aspek: { nis, tanggal: body.tanggal, aspek: body.aspek.trim() },
          },
          create: {
            tanggal: body.tanggal,
            aspek: body.aspek.trim(),
            nilaiAngka: entry.nilaiAngka,
            predikat: entry.predikat,
            catatan: entry.catatan.trim(),
            siswa: { connect: { nis } },
          },
          update: {
            nilaiAngka: entry.nilaiAngka,
            predikat: entry.predikat,
            catatan: entry.catatan.trim(),
          },
        });
      }),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan nilai harian:", error);
    return NextResponse.json({ error: "Gagal menyimpan nilai harian." }, { status: 500 });
  }
}
