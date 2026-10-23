import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, PERMISSIONS, ROLES } from "../src/lib/auth/authorization.ts";

test("admin dapat mengelola operasional dan membaca laporan", () => {
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.DASHBOARD_READ), true);
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.OPERATIONAL_READ), true);
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.OPERATIONAL_WRITE), true);
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.REPORTS_READ), true);
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.REPORTS_EXPORT), true);
});

test("kepala sekolah hanya dapat membaca dan mengekspor laporan", () => {
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.DASHBOARD_READ),
    true,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.OPERATIONAL_READ),
    true,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.STUDENTS_READ),
    true,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.ACADEMIC_READ),
    true,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.ACADEMIC_WRITE),
    false,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.OPERATIONAL_WRITE),
    false,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.REPORTS_READ),
    true,
  );
  assert.equal(
    hasPermission(ROLES.KEPALA_SEKOLAH, PERMISSIONS.REPORTS_EXPORT),
    true,
  );
});

test("guru hanya dapat membaca siswa dan mengelola absensi serta nilai harian", () => {
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.DASHBOARD_READ), false);
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.STUDENTS_READ), true);
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.ACADEMIC_READ), true);
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.ACADEMIC_WRITE), true);
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.OPERATIONAL_READ), false);
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.OPERATIONAL_WRITE), false);
  assert.equal(hasPermission(ROLES.GURU, PERMISSIONS.REPORTS_READ), false);
});

test("role yang tidak dikenal tidak mendapat izin", () => {
  assert.equal(hasPermission("superuser", PERMISSIONS.DASHBOARD_READ), false);
  assert.equal(hasPermission("", PERMISSIONS.OPERATIONAL_WRITE), false);
});
