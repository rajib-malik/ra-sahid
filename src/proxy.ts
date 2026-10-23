import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/lib/auth/authorization";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function proxy(request: NextRequest) {
  const user = await getCurrentUser(request);

  if (user) {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/admin")) {
      if (user.role === ROLES.GURU) {
        if (path === "/admin/absensi" || path === "/admin/nilai-harian") {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/admin/nilai-harian", request.url));
      }
      if (user.role !== ROLES.ADMIN) {
        return NextResponse.redirect(new URL("/kepala-sekolah", request.url));
      }
    }
    if (path.startsWith("/kepala-sekolah") && user.role !== ROLES.KEPALA_SEKOLAH) {
      return NextResponse.redirect(new URL(
        user.role === ROLES.GURU ? "/admin/nilai-harian" : "/admin/dashboard",
        request.url,
      ));
    }
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/kepala-sekolah/:path*", "/api/admin/:path*"],
};
