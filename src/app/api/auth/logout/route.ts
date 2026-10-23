import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginRequest } from "@/lib/auth/api-authorization";
import {
  SESSION_COOKIE,
  getSessionCookieOptions,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Permintaan tidak valid." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, "", {
    ...getSessionCookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
