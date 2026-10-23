import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ROLES } from "@/lib/auth/authorization";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) || typeof body.email !== "string" ||
      !("password" in body) || typeof body.password !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Email dan kata sandi wajib diisi." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
    });
    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !(await bcrypt.compare(body.password, user.passwordHash))
    ) {
      return NextResponse.json(
        { success: false, message: "Email atau kata sandi salah." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const role = user.role === "ADMIN"
      ? ROLES.ADMIN
      : user.role === "KEPALA_SEKOLAH"
        ? ROLES.KEPALA_SEKOLAH
        : user.role === "GURU"
          ? ROLES.GURU
          : null;
    if (!role) {
      return NextResponse.json(
        { success: false, message: "Akun ini belum memiliki akses ke aplikasi." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json(
      { user: { id: user.id, role, name: user.name } },
      { headers: { "Cache-Control": "no-store" } },
    );
    
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(request));

    return response;
  } catch (error) {
    console.error("Login Error Detail:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Email atau kata sandi salah, atau terjadi gangguan server. Silakan coba kembali.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}