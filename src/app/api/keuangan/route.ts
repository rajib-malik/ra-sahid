import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authorizeApiRequest, isSameOriginRequest } from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

type KeuanganInput = {
  id?: string;
  nis: string;
  jenis: string;
  keterangan?: string | null;
  jumlah: number;
  status: string;
  tanggal: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function isKeuanganInput(body: Record<string, unknown>): body is Record<string, unknown> & KeuanganInput {
  return (
    typeof body.nis === "string" && !!body.nis.trim() &&
    typeof body.jenis === "string" && !!body.jenis.trim() &&
    typeof body.jumlah === "number" && Number.isFinite(body.jumlah) && body.jumlah >= 0 &&
    typeof body.status === "string" && !!body.status.trim() &&
    typeof body.tanggal === "string" && !!body.tanggal.trim() &&
    (body.keterangan === undefined || body.keterangan === null || typeof body.keterangan === "string")
  );
}

function toKeuanganData(body: KeuanganInput) {
  return {
    jenis: body.jenis.trim(),
    keterangan: typeof body.keterangan === "string" && body.keterangan.trim() ? body.keterangan.trim() : null,
    jumlah: body.jumlah,
    status: body.status.trim(),
    tanggal: body.tanggal.trim(),
  };
}

function serializeKeuangan(record: {
  id: string;
  nis: string;
  jenis: string;
  keterangan: string | null;
  jumlah: number;
  status: string;
  tanggal: string;
  createdAt: Date;
  siswa: { nama: string; tingkatRombel: string };
}) {
  return {
    id: record.id,
    nis: record.nis,
    nama: record.siswa.nama,
    kelas: record.siswa.tingkatRombel,
    jenis: record.jenis,
    keterangan: record.keterangan,
    jumlah: record.jumlah,
    status: record.status,
    tanggal: record.tanggal,
    createdAt: record.createdAt,
  };
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.OPERATIONAL_READ, request);
  if (authorization.response) return authorization.response;

  try {
    const records = await prisma.keuangan.findMany({
      include: { siswa: { select: { nama: true, tingkatRombel: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records.map(serializeKeuangan), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("API Keuangan Error:", error);
    return NextResponse.json({ error: "Gagal memuat data keuangan." }, { status: 500 });
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
    if (!body || !isKeuanganInput(body)) {
      return NextResponse.json({ error: "NIS, jenis, jumlah, status, dan tanggal wajib diisi dengan benar." }, { status: 400 });
    }
    const siswa = await prisma.siswa.findUnique({ where: { nis: body.nis.trim() } });
    if (!siswa) return NextResponse.json({ error: "Siswa dengan NIS tersebut tidak ditemukan." }, { status: 400 });

    const record = await prisma.keuangan.create({
      data: {
        ...toKeuanganData(body),
        nama: siswa.nama,
        kelas: siswa.tingkatRombel,
        siswa: { connect: { nis: siswa.nis } },
      },
      include: { siswa: { select: { nama: true, tingkatRombel: true } } },
    });
    return NextResponse.json(serializeKeuangan(record), { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan data keuangan:", error);
    return NextResponse.json({ error: "Gagal menyimpan data keuangan." }, { status: 500 });
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
    if (!body || typeof body.id !== "string" || !body.id.trim() || !isKeuanganInput(body)) {
      return NextResponse.json({ error: "ID, NIS, jenis, jumlah, status, dan tanggal wajib diisi dengan benar." }, { status: 400 });
    }
    const siswa = await prisma.siswa.findUnique({ where: { nis: body.nis.trim() } });
    if (!siswa) return NextResponse.json({ error: "Siswa dengan NIS tersebut tidak ditemukan." }, { status: 400 });

    const record = await prisma.keuangan.update({
      where: { id: body.id },
      data: {
        ...toKeuanganData(body),
        nama: siswa.nama,
        kelas: siswa.tingkatRombel,
        siswa: { connect: { nis: siswa.nis } },
      },
      include: { siswa: { select: { nama: true, tingkatRombel: true } } },
    });
    return NextResponse.json(serializeKeuangan(record));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Data keuangan tidak ditemukan." }, { status: 404 });
    }
    console.error("Gagal memperbarui data keuangan:", error);
    return NextResponse.json({ error: "Gagal memperbarui data keuangan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.OPERATIONAL_WRITE, request);
  if (authorization.response) return authorization.response;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID data keuangan wajib diisi." }, { status: 400 });
  }

  try {
    await prisma.keuangan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Data keuangan tidak ditemukan." }, { status: 404 });
    }
    console.error("Gagal menghapus data keuangan:", error);
    return NextResponse.json({ error: "Gagal menghapus data keuangan." }, { status: 500 });
  }
}
