export const ROLES = {
  ADMIN: "admin",
  KEPALA_SEKOLAH: "kepala_sekolah",
  GURU: "guru",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard:read",
  OPERATIONAL_READ: "operational:read",
  OPERATIONAL_WRITE: "operational:write",
  STUDENTS_READ: "students:read",
  ACADEMIC_READ: "academic:read",
  ACADEMIC_WRITE: "academic:write",
  REPORTS_READ: "reports:read",
  REPORTS_EXPORT: "reports:export",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.KEPALA_SEKOLAH]: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.OPERATIONAL_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.ACADEMIC_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  [ROLES.GURU]: [
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.ACADEMIC_READ,
    PERMISSIONS.ACADEMIC_WRITE,
  ],
};

export function isUserRole(role: string): role is UserRole {
  return Object.values(ROLES).includes(role as UserRole);
}

export function hasPermission(
  role: string,
  permission: Permission,
): boolean {
  return (
    isUserRole(role) && ROLE_PERMISSIONS[role].includes(permission)
  );
}
