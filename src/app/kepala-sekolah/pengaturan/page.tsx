"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, ShieldCheck, User } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

type Profile = { name: string; email: string; role: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roleLabel(role: string) {
  if (role === "kepala_sekolah") return "Kepala Madrasah";
  if (role === "admin") return "Administrator";
  if (role === "guru") return "Guru";
  return role;
}

function getProfile(value: unknown): Profile | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const { name, email, role } = value.user;
  if (typeof name !== "string" || typeof email !== "string" || typeof role !== "string") return null;
  return { name, email, role };
}

function getErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Profil akun belum dapat dimuat. Silakan coba kembali.";
}

export default function KepsekPengaturanPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const muatProfil = useCallback(async () => {
    setMemuat(true);
    try {
      const response = await apiFetch("/api/auth/current-user", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(result));
      const currentProfile = getProfile(result);
      if (!currentProfile) throw new Error("Format profil akun tidak valid.");
      setProfile(currentProfile);
      setPesanError("");
    } catch (error) {
      setProfile(null);
      setPesanError(error instanceof Error ? error.message : "Profil akun belum dapat dimuat.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(muatProfil);
  }, [muatProfil]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profil Akun</h1>
        <p className="text-sm text-slate-500">Informasi akun yang sedang aktif dan diverifikasi oleh sistem.</p>
      </div>

      {pesanError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{pesanError}</span>
          <button type="button" onClick={() => void muatProfil()} disabled={memuat} className="font-semibold underline disabled:opacity-50">
            {memuat ? "Memuat..." : "Coba lagi"}
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700"><User className="h-5 w-5" /></span>
          <div>
            <h2 className="font-bold text-slate-900">Identitas Akun</h2>
            <p className="text-xs text-slate-500">Data dimuat dari akun yang tersimpan di database.</p>
          </div>
        </div>

        {memuat ? (
          <div role="status" className="space-y-4 py-6">
            <p className="text-sm text-slate-500">Memuat profil akun...</p>
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : profile ? (
          <dl className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</dt>
              <dd className="mt-2 font-semibold text-slate-900">{profile.name}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Mail className="h-4 w-4" /> Email</dt>
              <dd className="mt-2 font-semibold text-slate-900">{profile.email}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><ShieldCheck className="h-4 w-4" /> Peran</dt>
              <dd className="mt-2 font-semibold text-slate-900">{roleLabel(profile.role)}</dd>
            </div>
          </dl>
        ) : !pesanError ? (
          <p className="py-6 text-sm text-slate-500">Informasi profil belum tersedia.</p>
        ) : null}

        <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
          Informasi identitas dan keamanan dikelola oleh administrator sistem. Halaman ini hanya menampilkan data profil dari akun aktif; perubahan kata sandi tidak tersedia di modul pemantauan.
        </p>
      </section>
    </div>
  );
}
