import "server-only";

import { cookies } from "next/headers";
import { errors, jwtVerify, SignJWT } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export { SESSION_COOKIE };
export const SESSION_DURATION_SECONDS = 60 * 60 * 8;

const SESSION_ISSUER = "ra-sahid";
const SESSION_AUDIENCE = "ra-sahid-app";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (
    !secret ||
    secret.startsWith("replace-with-") ||
    new TextEncoder().encode(secret).byteLength < 32
  ) {
    throw new Error("SESSION_SECRET harus diatur dan minimal 32 byte.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function getSessionUserId(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    return typeof payload.sub === "string" ? payload.sub : null;
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return null;
    }

    throw error;
  }
}

function getRequestSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const matchingCookies = cookieHeader.split(";").flatMap((cookie) => {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== SESSION_COOKIE) {
      return [];
    }

    return [cookie.slice(separator + 1).trim()];
  });

  if (matchingCookies.length !== 1) return null;

  try {
    return decodeURIComponent(matchingCookies[0]);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

export async function getSessionCookieToken(request?: Request) {
  if (request) {
    return getRequestSessionCookie(request);
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export function getSessionCookieOptions(request: Request) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.toLowerCase();
  const isLocalhost =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.startsWith("127.");
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim()
    .toLowerCase();
  const isHttps = requestUrl.protocol === "https:" || forwardedProtocol === "https";

  return {
    httpOnly: true,
    secure: isHttps || (!isLocalhost && process.env.NODE_ENV === "production"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
