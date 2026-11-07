
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  authorizeApiRequest,
  isSameOriginRequest,
} from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(request: Request) {
  try {
    const body: unknown = await request.json();
    return isObject(body) ? body : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

// Mengubah tanggal dari input HTML menjadi Date.
// Tanggal kosong disimpan sebagai null.
function parseTanggalLahir(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new Error("Format tanggal lahir tidak valid.");
  }

  const tanggal = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    throw new Error("Format tanggal lahir harus YYYY-MM-DD.");
  }

  const date = new Date(`${tanggal}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== tanggal
  ) {
    throw new Error("Tanggal lahir tidak valid.");
  }

  return date;
}

function parseTempatLahir(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;

  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new Error("Format tempat lahir tidak valid.");
  }

  return value.trim() || null;
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_READ,
    request
  );

  if (authorization.response) return authorization.response;

  try {
    const guru = await prisma.guru.findMany({
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(guru, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Gagal memuat data guru:", error);

    return NextResponse.json(
      { error: "Gagal memuat data guru." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_WRITE,
    request
  );

  if (authorization.response) return authorization.response;

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
      (body.status !== undefined && typeof body.status !== "string")
    ) {
      return NextResponse.json(
        { error: "NIP, nama, dan jabatan wajib diisi." },
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
        tempat_lahir: tempatLahir ?? null,
        tanggal_lahir: tanggalLahir ?? null,
        status:
          typeof body.status === "string" && body.status.trim()
            ? body.status.trim()
            : "Aktif",
      },
    });

    return NextResponse.json(guru, { status: 201 });
  } catch (error) {
    if (error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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

export async function PUT(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_WRITE,
    request
  );

  if (authorization.response) return authorization.response;

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
      (body.status !== undefined && typeof body.status !== "string")
    ) {
      return NextResponse.json(
        { error: "ID, NIP, nama, dan jabatan wajib diisi." },
        { status: 400 }
      );
    }

    const tempatLahir = parseTempatLahir(body.tempat_lahir);
    const tanggalLahir = parseTanggalLahir(body.tanggal_lahir);

    const guru = await prisma.guru.update({
      where: { id: body.id.trim() },
      data: {
        nip: body.nip.trim(),
        nama: body.nama.trim(),
        jabatan: body.jabatan.trim(),
        ...(tempatLahir !== undefined
          ? { tempat_lahir: tempatLahir }
          : {}),
        ...(tanggalLahir !== undefined
          ? { tanggal_lahir: tanggalLahir }
          : {}),
        ...(typeof body.status === "string"
          ? { status: body.status.trim() }
          : {}),
      },
    });

    return NextResponse.json(guru);
  } catch (error) {
    if (error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

export async function DELETE(request: Request) {
  const authorization = await authorizeApiRequest(
    PERMISSIONS.OPERATIONAL_WRITE,
    request
  );

  if (authorization.response) return authorization.response;

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID guru wajib diisi." },
      { status: 400 }
    );
  }

  try {
    await prisma.guru.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
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
