import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { authorizeApiRequest, isSameOriginRequest } from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAttendanceDate(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(normalized);
  if (!match) return null;

  const date = new Date(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) return null;
  if (normalized !== match[1] && Number.isNaN(new Date(normalized).getTime())) return null;
  return match[1];
}

function isAttendanceStatus(value: unknown): value is "Hadir" | "Sakit" | "Izin" | "Alpa" {
  return value === "Hadir" || value === "Sakit" || value === "Izin" || value === "Alpa";
}

async function readBody(request: Request) {
  try {
    const body: unknown = await request.json();
    return isObject(body) ? body : null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.ACADEMIC_READ, request);
  if (authorization.response) return authorization.response;

  const tanggal = new URL(request.url).searchParams.get("tanggal");
  try {
    const records = await prisma.absensi.findMany({
      where: tanggal ? { tanggal } : undefined,
      orderBy: [{ tanggal: "desc" }, { siswa: { nama: "asc" } }],
      include: { siswa: { select: { nama: true, tingkatRombel: true } } },
    });
    return NextResponse.json(records.map((record) => ({
      id: record.id,
      nis: record.nis,
      nama: record.siswa.nama,
      kelas: record.siswa.tingkatRombel,
      tanggal: record.tanggal,
      status: record.status,
      keterangan: record.keterangan,
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("API Absensi Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.ACADEMIC_WRITE, request);
  if (authorization.response) return authorization.response;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  try {
    const body = await readBody(request);
    const tanggal = body ? normalizeAttendanceDate(body.tanggal) : null;
    const status = typeof body?.status === "string" ? body.status.trim() : null;
    if (
      !body ||
      typeof body.nis !== "string" || !body.nis.trim() ||
      !tanggal ||
      !isAttendanceStatus(status) ||
      (body.keterangan !== undefined && body.keterangan !== null && typeof body.keterangan !== "string")
    ) {
      return NextResponse.json({ error: "NIS, tanggal, dan status absensi yang valid wajib diisi." }, { status: 400 });
    }

    const siswa = await prisma.siswa.findUnique({ where: { nis: body.nis.trim() } });
    if (!siswa) return NextResponse.json({ error: "Siswa dengan NIS tersebut tidak ditemukan." }, { status: 400 });

    const existingAttendance = await prisma.absensi.findUnique({
      where: { nis_tanggal: { nis: siswa.nis, tanggal } },
      select: { id: true },
    });
    if (existingAttendance) {
      return NextResponse.json(
        { error: "Absensi untuk hari ini sudah diisi dan tidak dapat diisi ulang." },
        { status: 400 },
      );
    }

    const data = {
      nama: siswa.nama,
      status,
      keterangan: typeof body.keterangan === "string" && body.keterangan.trim() ? body.keterangan.trim() : null,
    };
    const attendance = await prisma.absensi.create({
      data: {
        tanggal,
        siswa: { connect: { nis: siswa.nis } },
        ...data,
      },
      include: { siswa: { select: { nama: true, tingkatRombel: true } } },
    });
    return NextResponse.json({
      id: attendance.id,
      nis: attendance.nis,
      nama: attendance.siswa.nama,
      kelas: attendance.siswa.tingkatRombel,
      tanggal: attendance.tanggal,
      status: attendance.status,
      keterangan: attendance.keterangan,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Absensi untuk hari ini sudah diisi dan tidak dapat diisi ulang." },
          { status: 400 },
        );
      }
      console.error("Prisma gagal menyimpan data absensi:", error);
    } else {
      console.error("Gagal menyimpan data absensi:", error);
    }
    return NextResponse.json({ error: "Gagal menyimpan data absensi." }, { status: 500 });
  }
}
