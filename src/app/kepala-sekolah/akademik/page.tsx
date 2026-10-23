"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Student = { nis: string; nama: string; kelas: string; status: string };
type Grade = { nis: string; kelas: string; aspek: string; nilaiAngka: number; predikat: string; tanggal: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStudent(value: unknown): Student | null {
  if (!isRecord(value)) return null;
  const nis = toText(value.nis);
  const nama = toText(value.nama);
  if (!nis.trim() || !nama.trim()) return null;
  return {
    nis,
    nama,
    kelas: toText(value.tingkatRombel, toText(value.kelas, "Belum ditentukan")),
    status: toText(value.status, "Aktif"),
  };
}

function normalizeGrade(value: unknown): Grade | null {
  if (!isRecord(value)) return null;
  const nis = toText(value.nis);
  if (!nis.trim()) return null;
  return {
    nis,
    kelas: toText(value.tingkatRombel, toText(value.kelas, "Belum ditentukan")),
    aspek: toText(value.aspek, "Aspek belum ditentukan"),
    nilaiAngka: toNumber(value.nilaiAngka),
    predikat: toText(value.predikat, "-"),
    tanggal: toText(value.tanggal),
  };
}

function errorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function KepsekAkademikPage() {
  const [tanggal, setTanggal] = useState("");
  const [siswa, setSiswa] = useState<Student[]>([]);
  const [nilai, setNilai] = useState<Grade[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const muatAkademik = useCallback(async (tanggalData: string) => {
    setMemuat(true);
    try {
      async function loadArray(url: string, fallback: string) {
        try {
          const response = await apiFetch(url, { cache: "no-store" });
          const result: unknown = await response.json().catch(() => null);
          if (!response.ok) return { data: [], error: errorMessage(result, fallback) };
          if (!Array.isArray(result)) return { data: [], error: fallback };
          return { data: result, error: "" };
        } catch {
          return { data: [], error: fallback };
        }
      }

      const [siswaResult, nilaiResult] = await Promise.all([
        loadArray("/api/siswa", "Daftar siswa belum dapat dimuat."),
        loadArray(`/api/nilai?tanggal=${encodeURIComponent(tanggalData)}`, "Rekap nilai harian belum dapat dimuat."),
      ]);
      setSiswa(siswaResult.data.map(normalizeStudent).filter((item): item is Student => item !== null));
      setNilai(nilaiResult.data.map(normalizeGrade).filter((item): item is Grade => item !== null));
      setPesanError([siswaResult.error, nilaiResult.error].filter(Boolean).join(" "));
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    const hariIni = todayString();
    void Promise.resolve().then(() => {
      setTanggal(hariIni);
      return muatAkademik(hariIni);
    });
  }, [muatAkademik]);

  useEffect(() => {
    if (!tanggal) return;
    const interval = window.setInterval(() => void muatAkademik(tanggal), 30_000);
    return () => window.clearInterval(interval);
  }, [tanggal, muatAkademik]);

  const ringkasanKelas = useMemo(() => {
    const aktif = siswa.filter((item) => item.status.toLowerCase() === "aktif");
    const kelas = [...new Set(aktif.map((item) => item.kelas))].sort((a, b) => a.localeCompare(b, "id"));
    return kelas.map((namaKelas) => {
      const siswaKelas = aktif.filter((item) => item.kelas === namaKelas);
      const nisDinilai = new Set(nilai.filter((item) => item.kelas === namaKelas).map((item) => item.nis));
      const nilaiKelas = nilai.filter((item) => item.kelas === namaKelas);
      const rataRata = nilaiKelas.length
        ? nilaiKelas.reduce((sum, item) => sum + item.nilaiAngka, 0) / nilaiKelas.length
        : null;
      return {
        namaKelas,
        jumlahSiswa: siswaKelas.length,
        jumlahDinilai: nisDinilai.size,
        jumlahPenilaian: nilaiKelas.length,
        rataRata,
      };
    });
  }, [siswa, nilai]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pemantauan Akademik & E-Raport</h1>
          <p className="text-sm text-slate-500">Rekap langsung dari data siswa dan Nilai Harian Admin.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="tanggal-akademik" className="text-sm font-medium text-slate-600">Tanggal</label>
          <input id="tanggal-akademik" type="date" value={tanggal} onChange={(event) => {
            setTanggal(event.target.value);
            if (event.target.value) void muatAkademik(event.target.value);
          }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </div>
      </div>

      {pesanError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{pesanError}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Siswa Aktif</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{memuat ? "…" : siswa.filter((item) => item.status.toLowerCase() === "aktif").length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Penilaian pada Tanggal</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{memuat ? "…" : nilai.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Tanggal Pemantauan</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{tanggal || "Menyiapkan tanggal..."}</p>
        </article>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Rekap Penilaian per Rombel</h2>
          <p className="mt-1 text-xs text-slate-500">Jumlah siswa dinilai dan rata-rata nilai berdasarkan data untuk tanggal terpilih.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="px-5 py-3 font-semibold">Rombel</th><th className="px-5 py-3 font-semibold">Siswa Aktif</th><th className="px-5 py-3 font-semibold">Siswa Dinilai</th><th className="px-5 py-3 font-semibold">Jumlah Penilaian</th><th className="px-5 py-3 font-semibold">Rata-rata</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memuat ? <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Memuat data akademik...</td></tr>
                : ringkasanKelas.length ? ringkasanKelas.map((item) => (
                  <tr key={item.namaKelas}>
                    <td className="px-5 py-4 font-semibold">{item.namaKelas}</td>
                    <td className="px-5 py-4">{item.jumlahSiswa}</td>
                    <td className="px-5 py-4">{item.jumlahDinilai}</td>
                    <td className="px-5 py-4">{item.jumlahPenilaian}</td>
                    <td className="px-5 py-4">{item.rataRata === null ? "Belum ada nilai" : item.rataRata.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Data siswa aktif belum tersedia.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Rincian Nilai Harian</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="px-5 py-3 font-semibold">Nama Siswa</th><th className="px-5 py-3 font-semibold">Rombel</th><th className="px-5 py-3 font-semibold">Mata Pelajaran</th><th className="px-5 py-3 font-semibold">Nilai</th><th className="px-5 py-3 font-semibold">Predikat</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memuat ? <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Memuat penilaian...</td></tr>
                : nilai.length ? nilai.map((item, index) => (
                  <tr key={`${item.nis}-${item.aspek}-${index}`}>
                    <td className="px-5 py-4 font-medium">{siswa.find((student) => student.nis === item.nis)?.nama ?? item.nis}</td>
                    <td className="px-5 py-4">{item.kelas}</td>
                    <td className="px-5 py-4">{item.aspek}</td>
                    <td className="px-5 py-4">{item.nilaiAngka.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-4">{item.predikat}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Belum ada Nilai Harian untuk tanggal ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
