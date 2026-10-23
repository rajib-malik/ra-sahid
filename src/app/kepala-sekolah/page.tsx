"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BookOpenCheck, CalendarCheck2, CircleAlert, RefreshCw, Users, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

type DashboardSummary = {
  tanggal: string;
  diperbaruiPada: string;
  siswaAktif: number;
  guruTerdaftar: number;
  keuangan: {
    totalKasLunas: number;
    transaksiLunas: number;
    transaksiBelumLunas: number;
  };
  absensi: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
    persentaseHadir: number;
  };
  akademik: {
    penilaianHariIni: number;
    rataRataNilaiHariIni: number | null;
    penilaianBulanIni: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (!isRecord(value) || !isRecord(value.keuangan) || !isRecord(value.absensi) || !isRecord(value.akademik)) {
    return false;
  }
  return typeof value.tanggal === "string" &&
    typeof value.diperbaruiPada === "string" &&
    isCount(value.siswaAktif) &&
    isCount(value.guruTerdaftar) &&
    isCount(value.keuangan.totalKasLunas) &&
    isCount(value.keuangan.transaksiLunas) &&
    isCount(value.keuangan.transaksiBelumLunas) &&
    isCount(value.absensi.hadir) &&
    isCount(value.absensi.sakit) &&
    isCount(value.absensi.izin) &&
    isCount(value.absensi.alpa) &&
    isCount(value.absensi.total) &&
    isCount(value.absensi.persentaseHadir) &&
    isCount(value.akademik.penilaianHariIni) &&
    (value.akademik.rataRataNilaiHariIni === null || isCount(value.akademik.rataRataNilaiHariIni)) &&
    isCount(value.akademik.penilaianBulanIni);
}

function errorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Ringkasan belum dapat dimuat. Silakan coba kembali.";
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export default function KepsekDashboardPage() {
  const [ringkasan, setRingkasan] = useState<DashboardSummary | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const muatRingkasan = useCallback(async () => {
    setMemuat(true);
    try {
      const response = await apiFetch("/api/kepala-sekolah/ringkasan", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(result));
      if (!isDashboardSummary(result)) {
        throw new Error("Format ringkasan belum dapat dibaca. Silakan muat ulang halaman.");
      }
      setRingkasan(result);
      setPesanError("");
    } catch (error) {
      setPesanError(error instanceof Error
        ? error.message
        : "Ringkasan belum dapat dimuat. Silakan coba kembali.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(muatRingkasan);
    const interval = window.setInterval(() => void muatRingkasan(), 30_000);
    return () => window.clearInterval(interval);
  }, [muatRingkasan]);

  const kartu = [
    {
      label: "Siswa Aktif",
      nilai: ringkasan ? `${ringkasan.siswaAktif} anak` : "—",
      deskripsi: "Data siswa dari database",
      icon: Users,
      warna: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Guru Terdaftar",
      nilai: ringkasan ? `${ringkasan.guruTerdaftar} orang` : "—",
      deskripsi: "Tenaga pendidik dan staf",
      icon: Activity,
      warna: "bg-blue-50 text-blue-700",
    },
    {
      label: "Kas Terkumpul",
      nilai: ringkasan ? formatRupiah(ringkasan.keuangan.totalKasLunas) : "—",
      deskripsi: `${ringkasan?.keuangan.transaksiLunas ?? "—"} transaksi lunas`,
      icon: Wallet,
      warna: "bg-amber-50 text-amber-700",
    },
    {
      label: "Kehadiran Hari Ini",
      nilai: ringkasan ? `${ringkasan.absensi.persentaseHadir}%` : "—",
      deskripsi: `${ringkasan?.absensi.hadir ?? "—"} hadir dari ${ringkasan?.absensi.total ?? "—"} catatan`,
      icon: CalendarCheck2,
      warna: "bg-violet-50 text-violet-700",
    },
  ];

  const tanggalLabel = ringkasan
    ? new Date(`${ringkasan.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-900 to-emerald-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              Portal Eksekutif Kepala Madrasah
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Ringkasan RA Sahid</h1>
            <p className="mt-1 text-sm text-emerald-100">
              Pantau data operasional dan akademik yang sama dengan panel Admin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void muatRingkasan()}
            disabled={memuat}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 sm:self-center"
          >
            <RefreshCw className={`h-4 w-4 ${memuat ? "animate-spin" : ""}`} />
            Perbarui
          </button>
        </div>
        <p className="mt-4 text-xs text-emerald-100">
          {ringkasan ? `Data per ${tanggalLabel}` : memuat ? "Mengambil data terbaru..." : "Data belum tersedia"}
          {ringkasan && ` · diperbarui ${new Date(ringkasan.diperbaruiPada).toLocaleTimeString("id-ID")}`}
        </p>
      </section>

      {pesanError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">{pesanError}</div>
          <button type="button" onClick={() => void muatRingkasan()} className="font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      <section aria-label="Statistik utama" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{memuat && !ringkasan ? "…" : item.nilai}</p>
                </div>
                <span className={`rounded-xl p-2.5 ${item.warna}`}><Icon className="h-5 w-5" /></span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{item.deskripsi}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CalendarCheck2 className="h-5 w-5" /></span>
            <div>
              <h2 className="font-bold text-slate-900">Ringkasan Absensi</h2>
              <p className="text-xs text-slate-500">Rekap kehadiran hari ini</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Hadir", ringkasan?.absensi.hadir],
              ["Sakit", ringkasan?.absensi.sakit],
              ["Izin", ringkasan?.absensi.izin],
              ["Alpa", ringkasan?.absensi.alpa],
            ].map(([status, jumlah]) => (
              <div key={status} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{status}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{jumlah ?? (memuat ? "…" : 0)}</p>
              </div>
            ))}
          </div>
          <Link href="/kepala-sekolah/akademik" className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Buka pemantauan akademik <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="rounded-lg bg-violet-50 p-2 text-violet-700"><BookOpenCheck className="h-5 w-5" /></span>
            <div>
              <h2 className="font-bold text-slate-900">Aktivitas Akademik</h2>
              <p className="text-xs text-slate-500">Nilai harian yang tercatat di sistem</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-sm text-slate-600">Penilaian hari ini</dt>
              <dd className="font-bold text-slate-900">{ringkasan?.akademik.penilaianHariIni ?? (memuat ? "…" : 0)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-sm text-slate-600">Rata-rata nilai hari ini</dt>
              <dd className="font-bold text-slate-900">
                {ringkasan?.akademik.rataRataNilaiHariIni === null
                  ? "Belum ada nilai"
                  : ringkasan
                    ? `${ringkasan.akademik.rataRataNilaiHariIni?.toLocaleString("id-ID", { maximumFractionDigits: 1 }) ?? "—"}`
                    : memuat ? "…" : "Belum ada nilai"}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-sm text-slate-600">Penilaian bulan ini</dt>
              <dd className="font-bold text-slate-900">{ringkasan?.akademik.penilaianBulanIni ?? (memuat ? "…" : 0)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-sm text-slate-600">Transaksi belum lunas</dt>
              <dd className="font-bold text-slate-900">{ringkasan?.keuangan.transaksiBelumLunas ?? (memuat ? "…" : 0)}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}
