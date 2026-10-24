import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authorizeApiRequest, isSameOriginRequest } from "@/lib/auth/api-authorization";
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
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.OPERATIONAL_READ, request);
  if (authorization.response) return authorization.response;

  try {
    const guru = await prisma.guru.findMany({ orderBy: { nama: "asc" } });
    return NextResponse.json(guru, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal memuat data guru:", error);
    return NextResponse.json({ error: "Gagal memuat data guru." }, { status: 500 });
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
    if (
      !body ||
      typeof body.nip !== "string" || !body.nip.trim() ||
      typeof body.nama !== "string" || !body.nama.trim() ||
      typeof body.jabatan !== "string" || !body.jabatan.trim() ||
      (body.status !== undefined && typeof body.status !== "string")
    ) {
      return NextResponse.json({ error: "NIP, nama, dan jabatan wajib diisi." }, { status: 400 });
    }

    const guru = await prisma.guru.create({
      data: {
        nip: body.nip.trim(),
        nama: body.nama.trim(),
        jabatan: body.jabatan.trim(),
        status: typeof body.status === "string" && body.status.trim() ? body.status.trim() : "Aktif",
      },
    });
    return NextResponse.json(guru, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "NIP tersebut sudah terdaftar." }, { status: 409 });
    }
    console.error("Gagal menyimpan data guru:", error);
    return NextResponse.json({ error: "Gagal menyimpan data guru." }, { status: 500 });
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
    if (
      !body ||
      typeof body.id !== "string" || !body.id.trim() ||
      typeof body.nip !== "string" || !body.nip.trim() ||
      typeof body.nama !== "string" || !body.nama.trim() ||
      typeof body.jabatan !== "string" || !body.jabatan.trim() ||
      (body.status !== undefined && typeof body.status !== "string")
    ) {
      return NextResponse.json({ error: "ID, NIP, nama, dan jabatan wajib diisi." }, { status: 400 });
    }

    const guru = await prisma.guru.update({
      where: { id: body.id },
      data: {
        nip: body.nip.trim(),
        nama: body.nama.trim(),
        jabatan: body.jabatan.trim(),
        ...(typeof body.status === "string" ? { status: body.status.trim() } : {}),
      },
    });
    return NextResponse.json(guru);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "NIP tersebut sudah terdaftar." }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Data guru tidak ditemukan." }, { status: 404 });
      }
    }
    console.error("Gagal memperbarui data guru:", error);
    return NextResponse.json({ error: "Gagal memperbarui data guru." }, { status: 500 });
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
    return NextResponse.json({ error: "ID guru wajib diisi." }, { status: 400 });
  }

  try {
    await prisma.guru.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Data guru tidak ditemukan." }, { status: 404 });
    }
    console.error("Gagal menghapus data guru:", error);
    return NextResponse.json({ error: "Gagal menghapus data guru." }, { status: 500 });
  }
}
