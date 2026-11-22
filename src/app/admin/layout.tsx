
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { ROLES, type UserRole } from "@/lib/auth/authorization";
import {
  LogOut,
  Settings,
  Home,
  Users,
  UserCheck,
  BookOpen,
  CalendarDays,
  FileText,
  Edit3,
  DollarSign,
  Menu,
  X,
} from "lucide-react";

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    Object.values(ROLES).some((role) => role === value)
  );
}

function isCurrentUserResponse(
  value: unknown,
): value is { user: { name: string; role: UserRole } } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("user" in value)
  ) {
    return false;
  }

  const user = value.user;

  return (
    typeof user === "object" &&
    user !== null &&
    "name" in user &&
    typeof user.name === "string" &&
    "role" in user &&
    isUserRole(user.role)
  );
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <p className="text-sm font-medium text-slate-600">
            Memuat ruang kerja...
          </p>
        </main>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}

function AdminLayoutContent({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutSedangDiproses, setLogoutSedangDiproses] = useState(false);
  const [pesanErrorLogout, setPesanErrorLogout] = useState("");
  const [rolePengguna, setRolePengguna] = useState<UserRole | null>(null);
  const [namaPengguna, setNamaPengguna] = useState("");
  const [memuatPengguna, setMemuatPengguna] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let aktif = true;

    async function muatPengguna() {
      try {
        const response = await apiFetch("/api/auth/current-user", {
          cache: "no-store",
        });

        const result: unknown = await response.json();

        if (!response.ok || !isCurrentUserResponse(result)) {
          throw new Error("Gagal memverifikasi sesi pengguna.");
        }

        if (!aktif) return;

        setRolePengguna(result.user.role);
        setNamaPengguna(result.user.name);
      } catch (error) {
        if (!aktif) return;
        console.error("Gagal memuat pengguna panel:", error);
      } finally {
        if (aktif) setMemuatPengguna(false);
      }
    }

    void Promise.resolve().then(muatPengguna);

    return () => {
      aktif = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const handleLogoutConfirm = async () => {
    setLogoutSedangDiproses(true);
    setPesanErrorLogout("");

    try {
      const response = await apiFetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Keluar gagal. Silakan coba kembali.");
      }

      setShowLogoutModal(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal mengakhiri sesi admin:", error);

      setPesanErrorLogout(
        error instanceof Error
          ? error.message
          : "Tidak dapat terhubung ke server. Silakan coba kembali.",
      );
    } finally {
      setLogoutSedangDiproses(false);
    }
  };

  const namaPeran =
    rolePengguna === ROLES.GURU
      ? "Guru"
      : rolePengguna === ROLES.KEPALA_SEKOLAH
        ? "Kepala Sekolah"
        : "Administrator";

  const menuNavigasi = [
    {
      nama: "Dashboard",
      href: "/admin/dashboard",
      icon: <Home className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Data Siswa",
      href: "/admin/siswa",
      icon: <Users className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Data Guru & Staf",
      href: "/admin/guru",
      icon: <UserCheck className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Akademik",
      href: "/admin/akademik",
      icon: <BookOpen className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Absensi Harian",
      href: "/admin/absensi",
      icon: <CalendarDays className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "E-Raport Otomatis",
      href: "/admin/raport",
      icon: <FileText className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Input Nilai Harian",
      href: "/admin/nilai-harian",
      icon: <Edit3 className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Keuangan",
      href: "/admin/keuangan",
      icon: <DollarSign className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      nama: "Pengaturan",
      href: "/admin/pengaturan",
      icon: <Settings className="h-[18px] w-[18px] shrink-0" />,
    },
  ];

  const menuYangDiizinkan =
    rolePengguna === ROLES.GURU
      ? menuNavigasi.filter(
          (menu) =>
            menu.href === "/admin/absensi" ||
            menu.href === "/admin/nilai-harian",
        )
      : rolePengguna
        ? menuNavigasi
        : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      {/* SIDEBAR */}
      <aside className="relative z-30 flex w-full flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:px-6 md:py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-sm font-bold text-white shadow-sm">
              RA
            </div>

            <div>
              <p className="text-sm font-bold text-slate-950">RA Sahid</p>
              <p className="mt-0.5 text-xs font-medium text-slate-600">
                Panel {namaPeran}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <div
          className={`${
            mobileMenuOpen ? "flex" : "hidden"
          } flex-1 flex-col md:flex`}
        >
          <nav
            aria-label="Navigasi administrasi"
            className="flex-1 overflow-y-auto px-3 pb-3 md:px-4"
          >
            <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Menu utama
            </p>

            {menuYangDiizinkan.map((menu) => {
              const isActive =
                pathname === menu.href ||
                (menu.href !== "/admin/dashboard" &&
                  pathname.startsWith(`${menu.href}/`));

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-emerald-50 font-bold text-emerald-900"
                      : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {menu.icon}
                  <span>{menu.nama}</span>
                </Link>
              );
            })}

            {memuatPengguna && (
              <p className="px-3 py-3 text-xs font-medium text-slate-600">
                Memverifikasi sesi...
              </p>
            )}

            {!memuatPengguna && !rolePengguna && (
              <p
                role="alert"
                className="px-3 py-3 text-xs font-medium text-rose-800"
              >
                Sesi tidak dapat diverifikasi. Silakan masuk kembali.
              </p>
            )}
          </nav>

          <div className="mx-4 mb-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 md:block">
            <p className="text-xs font-bold text-slate-800">
              Akses {namaPeran.toLowerCase()}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              {rolePengguna === ROLES.GURU
                ? "Akses dibatasi untuk absensi dan nilai harian."
                : "Kelola sistem sesuai peran dan izin akun Anda."}
            </p>
          </div>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-9">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Sistem Informasi Manajemen
            </p>
            <p className="text-sm font-bold text-slate-950">RA Sahid</p>
          </div>

          {/* PROFIL */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-label="Menu profil pengguna"
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:gap-3"
            >
              <div className="hidden text-right sm:block">
                <p className="max-w-[180px] truncate text-sm font-bold text-slate-900">
                  {namaPengguna || namaPeran}
                </p>
                <p className="text-xs font-medium text-slate-600">
                  {namaPeran}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-xs font-bold text-white shadow-sm">
                {(namaPengguna || namaPeran)
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("")}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-xs font-bold text-slate-900">
                    Masuk sebagai
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    {namaPengguna || namaPeran}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-emerald-800">
                    {namaPeran}
                  </p>
                </div>

                {rolePengguna && rolePengguna !== ROLES.GURU && (
                  <Link
                    href="/admin/pengaturan"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 hover:text-emerald-800"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    Pengaturan Sistem
                  </Link>
                )}

                <div className="mx-3 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setPesanErrorLogout("");
                    setShowLogoutModal(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        {/* AREA HALAMAN */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-9 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs font-medium text-slate-500 sm:px-6">
          © {new Date().getFullYear()} RA Sahid. Semua hak dilindungi.
        </footer>
      </div>

      {/* MODAL KONFIRMASI KELUAR */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700">
              <LogOut className="h-6 w-6" />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="text-base font-bold text-slate-950">
                Konfirmasi Keluar
              </h3>

              <p className="text-sm leading-6 text-slate-600">
                Apakah Anda yakin ingin keluar dari Panel Administrator?
              </p>
            </div>

            {pesanErrorLogout && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-800"
              >
                {pesanErrorLogout}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                disabled={logoutSedangDiproses}
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={logoutSedangDiproses}
                onClick={handleLogoutConfirm}
                className="flex-1 rounded-xl bg-rose-700 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:opacity-50"
              >
                {logoutSedangDiproses ? "Memproses..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
