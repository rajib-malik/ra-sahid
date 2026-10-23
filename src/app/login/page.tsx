import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Masuk | RA Sahid",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4">
          <p className="text-sm text-slate-500">Memuat halaman masuk...</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

async function LoginPageContent() {
  const user = await getCurrentUser();

  if (user) {
    const tujuan = user.role === "kepala_sekolah"
      ? "/kepala-sekolah"
      : user.role === "guru"
        ? "/admin/nilai-harian"
        : "/admin/dashboard";
    redirect(tujuan);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-[1fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-emerald-900 p-10 text-white md:flex">
          <div className="absolute -right-24 -bottom-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-10 -bottom-14 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold">
              RA
            </div>
            <div>
              <p className="text-sm font-semibold">RA Sahid</p>
              <p className="text-xs text-emerald-100/75">
                Sistem Informasi Manajemen
              </p>
            </div>
          </div>
          <div className="relative max-w-sm">
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200 uppercase">
              Portal internal
            </p>
            <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight">
              Ruang kerja bersama untuk pendidikan yang lebih terarah.
            </h1>
            <p className="mt-4 text-sm leading-6 text-emerald-100/80">
              Gunakan akun yang diberikan oleh pengelola RA Sahid untuk
              melanjutkan.
            </p>
          </div>
          <p className="relative text-xs text-emerald-100/60">
            Akses khusus kepala sekolah dan guru RA Sahid.
          </p>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-xs font-bold text-white">
              RA
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">RA Sahid</p>
              <p className="text-xs text-slate-500">
                Sistem Informasi Manajemen
              </p>
            </div>
          </div>
          <div className="mb-8">
            <p className="text-sm font-semibold text-emerald-800">
              Selamat datang
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Masuk ke akun Anda
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Masukkan email dan kata sandi yang terdaftar.
            </p>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Jika Anda belum memiliki akun atau tidak dapat masuk, hubungi
            pengelola sistem RA Sahid.
          </p>
        </section>
      </div>
    </main>
  );
}
