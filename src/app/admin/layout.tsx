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
  DollarSign 
} from "lucide-react";

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(ROLES).some((role) => role === value);
}

function isCurrentUserResponse(value: unknown): value is { user: { name: string; role: UserRole } } {
  if (typeof value !== "object" || value === null || !("user" in value)) return false;
  const user = value.user;
  return typeof user === "object" && user !== null &&
    "name" in user && typeof user.name === "string" &&
    "role" in user && isUserRole(user.role);
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4">
          <p className="text-sm text-slate-500">Memuat ruang kerja...</p>
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
  
  // State untuk Dropdown Profil & Modal Konfirmasi Keluar
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
        const response = await apiFetch("/api/auth/current-user", { cache: "no-store" });
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

  // Tutup dropdown saat pengguna mengklik di luar area dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutConfirm = async () => {
    setLogoutSedangDiproses(true);
    setPesanErrorLogout("");
    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Keluar gagal. Silakan coba kembali.");
      }

      setShowLogoutModal(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal mengakhiri sesi admin:", error);
      setPesanErrorLogout(error instanceof Error
        ? error.message
        : "Tidak dapat terhubung ke server. Silakan coba kembali.");
    } finally {
      setLogoutSedangDiproses(false);
    }
  };

  const namaPeran = rolePengguna === ROLES.GURU
    ? "Guru"
    : rolePengguna === ROLES.KEPALA_SEKOLAH
      ? "Kepala Sekolah"
      : "Administrator";

  // Daftar menu navigasi admin secara lengkap
  const menuNavigasi = [
    {
      nama: "Dashboard",
      href: "/admin/dashboard",
      icon: <Home className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Data Siswa",
      href: "/admin/siswa",
      icon: <Users className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Data Guru & Staf",
      href: "/admin/guru",
      icon: <UserCheck className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Akademik",
      href: "/admin/akademik",
      icon: <BookOpen className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Absensi Harian",
      href: "/admin/absensi",
      icon: <CalendarDays className="h-[18px] w-[18px]" />,
    },
    {
      nama: "E-Raport Otomatis",
      href: "/admin/raport",
      icon: <FileText className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Input Nilai Harian",
      href: "/admin/nilai-harian",
      icon: <Edit3 className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Keuangan",
      href: "/admin/keuangan",
      icon: <DollarSign className="h-[18px] w-[18px]" />,
    },
    {
      nama: "Pengaturan",
      href: "/admin/pengaturan",
      icon: <Settings className="h-[18px] w-[18px]" />,
    },
  ];
  const menuYangDiizinkan = rolePengguna === ROLES.GURU
    ? menuNavigasi.filter((menu) => menu.href === "/admin/absensi" || menu.href === "/admin/nilai-harian")
    : rolePengguna
      ? menuNavigasi
      : [];

  return (
    <div className="min-h-screen bg-[#f7f9fc] md:flex">
      {/* Sidebar Admin Khas */}
      <aside className="flex flex-col border-b border-slate-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-5 md:px-6 md:py-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-800 text-sm font-bold text-white shadow-sm">
            RA
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">RA Sahid</p>
            <p className="mt-0.5 text-xs text-slate-500">Panel {namaPeran}</p>
          </div>
        </div>
        
        <nav
          aria-label="Navigasi administrasi"
          className="flex-1 overflow-y-auto px-3 pb-3 md:px-4"
        >
          <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Menu utama
          </p>
          
          {menuYangDiizinkan.map((menu) => {
            const isActive = pathname === menu.href;
            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 font-semibold text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {menu.icon}
                {menu.nama}
              </Link>
            );
          })}
          {memuatPengguna && (
            <p className="px-3 py-3 text-xs text-slate-500">Memverifikasi sesi...</p>
          )}
          {!memuatPengguna && !rolePengguna && (
            <p role="alert" className="px-3 py-3 text-xs text-rose-700">
              Sesi tidak dapat diverifikasi. Silakan masuk kembali.
            </p>
          )}
        </nav>
        
        <div className="mx-4 mb-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 md:block">
          <p className="text-xs font-semibold text-slate-700">Akses {namaPeran.toLowerCase()}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {rolePengguna === ROLES.GURU
              ? "Akses dibatasi untuk absensi dan nilai harian."
              : "Kelola sistem sesuai peran dan izin akun Anda."}
          </p>
        </div>
      </aside>

      {/* Konten Utama & Header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 lg:px-9 relative z-40">
          <div>
            <p className="text-xs text-slate-500">Sistem Informasi Manajemen</p>
            <p className="text-sm font-semibold text-slate-900">RA Sahid</p>
          </div>

          {/* Bagian Profil Admin dengan Dropdown Interaktif */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 focus:outline-none rounded-xl p-1.5 transition hover:bg-slate-50"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">{namaPengguna || namaPeran}</p>
                <p className="text-xs text-slate-500">{namaPeran}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-xs font-bold text-white shadow-xs">
                {(namaPengguna || namaPeran)
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("")}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-fade-in z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">Masuk sebagai</p>
                  <p className="text-[10px] text-slate-500 truncate">{namaPeran}</p>
                </div>
                {rolePengguna && rolePengguna !== ROLES.GURU && (
                <Link
                  href="/admin/pengaturan"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                >
                  <Settings className="h-4 w-4 text-slate-400" /> Pengaturan Sistem
                </Link>
                )}
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setPesanErrorLogout("");
                    setShowLogoutModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="h-4 w-4 text-red-500" /> Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
          {children}
        </main>
      </div>

      {/* Modal Konfirmasi Keluar Admin */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mx-auto border border-red-100">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Keluar</h3>
              <p className="text-xs text-slate-500">Apakah Anda yakin ingin keluar dari Panel Administrator?</p>
            </div>
            {pesanErrorLogout && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">
                {pesanErrorLogout}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={logoutSedangDiproses}
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={logoutSedangDiproses}
                onClick={handleLogoutConfirm}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
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