"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { 
  LogOut, 
  Settings, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BookOpen, 
  DollarSign
} from "lucide-react";

type CurrentUser = { name: string; email: string; role: string };

function getCurrentUser(value: unknown): CurrentUser | null {
  if (typeof value !== "object" || value === null || !("user" in value)) return null;
  const user = value.user;
  if (typeof user !== "object" || user === null ||
      !("name" in user) || typeof user.name !== "string" ||
      !("email" in user) || typeof user.email !== "string" ||
      !("role" in user) || typeof user.role !== "string") return null;
  return { name: user.name, email: user.email, role: user.role };
}

export default function KepsekLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadCurrentUser() {
      try {
        const response = await apiFetch("/api/auth/current-user", { cache: "no-store" });
        const result: unknown = await response.json().catch(() => null);
        const currentUser = getCurrentUser(result);
        if (!response.ok || !currentUser) throw new Error("Informasi akun belum dapat dimuat.");
        if (active) {
          setUser(currentUser);
          setUserError("");
        }
      } catch (error) {
        if (active) setUserError(error instanceof Error ? error.message : "Informasi akun belum dapat dimuat.");
      } finally {
        if (active) setUserLoading(false);
      }
    }
    void Promise.resolve().then(loadCurrentUser);
    return () => { active = false; };
  }, []);

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
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Keluar gagal. Silakan coba kembali.");
      setShowLogoutModal(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Keluar gagal. Silakan coba kembali.");
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabel = user?.role === "kepala_sekolah" ? "Kepala Madrasah" : user?.role ?? "Pengguna";

  const menuKepsek = [
    { nama: "Ringkasan Eksekutif", href: "/kepala-sekolah", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    { nama: "Data Siswa", href: "/kepala-sekolah/siswa", icon: <Users className="h-[18px] w-[18px]" /> },
    { nama: "Data Guru & Staf", href: "/kepala-sekolah/guru", icon: <UserCheck className="h-[18px] w-[18px]" /> },
    { nama: "Akademik & E-Raport", href: "/kepala-sekolah/akademik", icon: <BookOpen className="h-[18px] w-[18px]" /> },
    { nama: "Keuangan & Kas", href: "/kepala-sekolah/keuangan", icon: <DollarSign className="h-[18px] w-[18px]" /> },
    { nama: "Pengaturan Profil", href: "/kepala-sekolah/pengaturan", icon: <Settings className="h-[18px] w-[18px]" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Kepala Sekolah */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between print:hidden shadow-xs">
        <div>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-bold tracking-tight text-slate-900">RA Sahid</h2>
            <p className="text-xs text-slate-500">Portal Kepala Madrasah</p>
          </div>
          <nav className="p-4 space-y-1">
            {menuKepsek.map((item) => {
              const aktif = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    aktif 
                      ? "bg-emerald-600 text-white shadow-sm" 
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {item.icon}
                  <span>{item.nama}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Konten Utama & Header */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 print:hidden relative z-40">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
            Mode Pemantauan Kepala Madrasah (Read-Only)
          </span>
          {userError && <span role="alert" className="ml-3 text-xs text-rose-700">{userError}</span>}

          {/* Dropdown Profil Kepala Sekolah */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 focus:outline-none rounded-xl p-1.5 transition hover:bg-slate-50"
            >
              <div className="text-right">
                <p className="max-w-48 truncate text-xs font-bold text-slate-900">{userLoading ? "Memuat akun..." : user?.name ?? "Akun tidak tersedia"}</p>
                <p className="text-[10px] text-slate-500">{roleLabel}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                KS
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-fade-in z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">Masuk sebagai</p>
                  {userError
                    ? <p role="alert" className="text-[10px] text-rose-600">{userError}</p>
                    : <p className="truncate text-[10px] text-slate-500">{user?.email ?? roleLabel}</p>}
                </div>
                <Link
                  href="/kepala-sekolah/pengaturan"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                >
                  <Settings className="h-4 w-4 text-slate-400" /> Pengaturan Profil
                </Link>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
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

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>

      {/* Modal Konfirmasi Keluar */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mx-auto border border-red-100">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Keluar</h3>
              <p className="text-xs text-slate-500">Apakah Anda yakin ingin keluar dari sesi pemantauan Kepala Madrasah?</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleLogoutConfirm}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
              >
                {loggingOut ? "Memproses..." : "Ya, Keluar"}
              </button>
            </div>
            {logoutError && <p role="alert" className="text-center text-xs text-rose-700">{logoutError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}