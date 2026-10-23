import "server-only";

import { NextResponse } from "next/server";
import {
  hasPermission,
  type Permission,
} from "@/lib/auth/authorization";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function authorizeApiRequest(permission: Permission, request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser(request);
  } catch (error) {
    console.error("Gagal memverifikasi sesi API:", {
      method: request.method,
      path: new URL(request.url).pathname,
      permission,
      error,
    });
    return {
      user: null,
      response: NextResponse.json(
        { error: "Sesi tidak dapat diverifikasi. Silakan coba lagi." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  if (!hasPermission(user.role, permission)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Anda tidak memiliki izin untuk tindakan ini." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  return { user, response: null };
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }

    throw error;
  }
}
