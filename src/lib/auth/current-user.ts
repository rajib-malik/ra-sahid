import "server-only";

import { prisma } from "@/lib/prisma";
import { ROLES, type UserRole } from "@/lib/auth/authorization";
import { getSessionCookieToken, getSessionUserId } from "@/lib/auth/session";

function toUserRole(role: string): UserRole | null {
  if (role === "ADMIN") return ROLES.ADMIN;
  if (role === "KEPALA_SEKOLAH") return ROLES.KEPALA_SEKOLAH;
  if (role === "GURU") return ROLES.GURU;
  return null;
}

export async function getCurrentUser(request?: Request) {
  const token = await getSessionCookieToken(request);

  if (!token) {
    return null;
  }

  const userId = await getSessionUserId(token);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const role = toUserRole(user.role);
  if (!role) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
  };
}
