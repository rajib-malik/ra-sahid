import { connection, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(request: Request) {
  await connection();
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { user: { name: user.name, email: user.email, role: user.role } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Gagal memuat profil pengguna:", error);
    return NextResponse.json(
      { error: "Profil akun belum dapat dimuat." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
