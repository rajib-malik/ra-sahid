
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  authorizeApiRequest,
  isSameOriginRequest,
} from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

async function readBody(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return isObject(body) ? body : null;
  } catch {
    return null;
  }
}

// Memvalidasi tanggal lahir dari input HTML YYYY-MM-DD.
function parseTanggalLahir(
  value: unknown
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new ValidationError("Format tanggal lahir tidak valid.");
  }

  const tanggal = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    throw new ValidationError(
      "Format tanggal lahir harus YYYY-MM-DD."
    );
  }

  const date = new Date(`${tanggal}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== tanggal
  ) {
    throw new ValidationError("Tanggal lahir tidak valid.");
  }

  return date;
}

// Memvalidasi tempat lahir.
function parseTempatLahir(
  value: unknown
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new ValidationError("Format tempat lahir tidak valid.");
  }

  return value.trim() || null;
}

// Memeriksa error Prisma.
function isPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

// ==========================================
// GET: MENAMPILKAN SEMUA DATA GURU
// ==========================================

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_READ,
    request
  );

  if (authorization.response) {
    return authorization.response;
  }

  try {
    const guru = await prisma.guru.findMany({
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json(guru, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Gagal memuat data guru:", error);

    return NextResponse.json(
      { error: "Gagal memuat data guru." },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: MENAMBAHKAN DATA GURU
// ==========================================

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_WRITE,
    request
  );

  if (authorization.response) {
    return authorization.response;
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  try {
    const body = await readBody(request);

    if (
      !body ||
      typeof body.nip !== "string" ||
      !body.nip.trim() ||
      typeof body.nama !== "string" ||
      !body.nama.trim() ||
      typeof body.jabatan !== "string" ||
      !body.jabatan.trim() ||
      (body.status !== undefined &&
        typeof body.status !== "string")
    ) {
      return NextResponse.json(
        {
          error: "NIP, nama, dan jabatan wajib diisi.",
        },
        { status: 400 }
      );
    }

    const tempatLahir = parseTempatLahir(body.tempat_lahir);
    const tanggalLahir = parseTanggalLahir(body.tanggal_lahir);

    const guru = await prisma.guru.create({
      data: {
        nip: body.nip.trim(),
        nama: body.nama.trim(),
        jabatan: body.jabatan.trim(),
        tempatLahir: tempatLahir ?? null,
        tanggalLahir: tanggalLahir ?? null,
        status:
          typeof body.status === "string" &&
          body.status.trim()
            ? body.status.trim()
            : "Aktif",
      },
    });

    return NextResponse.json(guru, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (isPrismaError(error) && error.code === "P2002") {
      return NextResponse.json(
        { error: "NIP tersebut sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("Gagal menyimpan data guru:", error);

    return NextResponse.json(
      { error: "Gagal menyimpan data guru." },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT: MEMPERBARUI DATA GURU
// ==========================================

export async function PUT(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_WRITE,
    request
  );

  if (authorization.response) {
    return authorization.response;
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  try {
    const body = await readBody(request);

    if (
      !body ||
      typeof body.id !== "string" ||
      !body.id.trim() ||
      typeof body.nip !== "string" ||
      !body.nip.trim() ||
      typeof body.nama !== "string" ||
      !body.nama.trim() ||
      typeof body.jabatan !== "string" ||
      !body.jabatan.trim() ||
      (body.status !== undefined &&
        typeof body.status !== "string")
    ) {
      return NextResponse.json(
        {
          error: "ID, NIP, nama, dan jabatan wajib diisi.",
        },
        { status: 400 }
      );
    }

    const tempatLahir = parseTempatLahir(body.tempat_lahir);
    const tanggalLahir = parseTanggalLahir(body.tanggal_lahir);

    const guru = await prisma.guru.update({
      where: {
        id: body.id.trim(),
      },
      data: {
        nip: body.nip.trim(),
        nama: body.nama.trim(),
        jabatan: body.jabatan.trim(),

        ...(tempatLahir !== undefined
          ? { tempatLahir }
          : {}),

        ...(tanggalLahir !== undefined
          ? { tanggalLahir }
          : {}),

        ...(typeof body.status === "string"
          ? {
              status: body.status.trim() || "Aktif",
            }
          : {}),
      },
    });

    return NextResponse.json(guru);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (isPrismaError(error)) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "NIP tersebut sudah terdaftar." },
          { status: 409 }
        );
      }

      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Data guru tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    console.error("Gagal memperbarui data guru:", error);

    return NextResponse.json(
      { error: "Gagal memperbarui data guru." },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE: MENGHAPUS DATA GURU
// ==========================================

export async function DELETE(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_WRITE,
    request
  );

  if (authorization.response) {
    return authorization.response;
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !id.trim()) {
    return NextResponse.json(
      { error: "ID guru wajib diisi." },
      { status: 400 }
    );
  }

  try {
    await prisma.guru.delete({
      where: {
        id: id.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data guru berhasil dihapus.",
    });
  } catch (error) {
    if (isPrismaError(error) && error.code === "P2025") {
      return NextResponse.json(
        { error: "Data guru tidak ditemukan." },
        { status: 404 }
      );
    }

    console.error("Gagal menghapus data guru:", error);

    return NextResponse.json(
      { error: "Gagal menghapus data guru." },
      { status: 500 }
    );
  }
}
