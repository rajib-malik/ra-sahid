"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Student = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  status: string;
};

type RaportEntry = {
  aspek: string;
  nilaiAngka: number;
  predikat: string;
  catatan: string;
  jumlahPenilaian: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function isValidIdentifier(value: unknown) {
  return (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value));
}

function isStudent(value: unknown): value is Record<string, unknown> {
  return isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama);
}

function normalizeStudent(value: unknown): Student | null {
  if (!isStudent(value)) return null;
  return {
    id: text(value.id),
    nis: text(value.nis),
    nama: text(value.nama),
    kelas: text(value.tingkatRombel, text(value.kelas)),
    status: text(value.status, "Aktif"),
  };
}

function isRaportEntry(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

function numericValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRaportEntry(value: unknown): RaportEntry | null {
  if (!isRaportEntry(value)) return null;
  return {
    aspek: text(value.aspek, "Mata pelajaran"),
    nilaiAngka: numericValue(value.nilaiAngka, 0),
    predikat: text(value.predikat, "-"),
    catatan: text(value.catatan),
    jumlahPenilaian: Math.max(0, Math.trunc(numericValue(value.jumlahPenilaian, 0))),
  };
}

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

function getTahunAjaranSaatIni() {
  const sekarang = new Date();
  const tahunMulai = sekarang.getMonth() >= 6 ? sekarang.getFullYear() : sekarang.getFullYear() - 1;
  return `${tahunMulai}/${tahunMulai + 1}`;
}

export default function RaportResmiPage() {
  const [siswa, setSiswa] = useState<Student[]>([]);
  const [nis, setNis] = useState("");
  const [semester, setSemester] = useState("Semester 1 (Ganjil)");
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni);
  const [raport, setRaport] = useState<RaportEntry[]>([]);
  const [memuatSiswa, setMemuatSiswa] = useState(true);
  const [memuatRaport, setMemuatRaport] = useState(false);
  const [pesanError, setPesanError] = useState("");

  useEffect(() => {
    async function muatSiswa() {
      try {
        const response = await apiFetch("/api/siswa", { cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok || !Array.isArray(result) || !result.every(isStudent)) {
          throw new Error(getErrorMessage(result, "Gagal memuat daftar siswa."));
        }
        const normalizedStudents = result.map(normalizeStudent).filter((student): student is Student => student !== null);
        setSiswa(normalizedStudents);
        setNis((current) => normalizedStudents.some((student) => student.nis === current)
          ? current
          : normalizedStudents[0]?.nis ?? "");
      } catch (error) {
        console.error("Gagal memuat daftar siswa untuk raport:", error);
        setPesanError(error instanceof Error ? error.message : "Gagal memuat daftar siswa.");
      } finally {
        setMemuatSiswa(false);
      }
    }
    void Promise.resolve().then(muatSiswa);
  }, []);

  useEffect(() => {
    let aktif = true;

    async function muatRaport() {
      const nisValid = nis.trim();
      const tahunAjaranValid = /^(\d{4})\/(\d{4})$/.exec(tahunAjaran.trim());
      const semesterValid = semester === "Semester 1 (Ganjil)" || semester === "Semester 2 (Genap)";
      if (
        !nisValid ||
        nisValid.length > 100 ||
        !semesterValid ||
        !tahunAjaranValid ||
        Number(tahunAjaranValid[2]) !== Number(tahunAjaranValid[1]) + 1
      ) {
        if (aktif) {
          setRaport([]);
          setMemuatRaport(false);
        }
        return;
      }

      setMemuatRaport(true);
      try {
        const query = new URLSearchParams({
          nis: nisValid,
          semester,
          tahunAjaran: tahunAjaran.trim(),
        });
        const response = await apiFetch(`/api/raport?${query.toString()}`, { cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok || !Array.isArray(result)) {
          throw new Error(getErrorMessage(result, "Gagal memuat rekap nilai raport."));
        }
        if (!aktif) return;
        setRaport(result.map(normalizeRaportEntry).filter((entry): entry is RaportEntry => entry !== null));
        setPesanError("");
      } catch (error) {
        if (!aktif) return;
        console.error("Gagal memuat rekap nilai raport:", error);
        setPesanError(error instanceof Error ? error.message : "Gagal memuat rekap nilai raport.");
      } finally {
        if (aktif) setMemuatRaport(false);
      }
    }
    void Promise.resolve().then(muatRaport);
    return () => {
      aktif = false;
    };
  }, [nis, semester, tahunAjaran]);

  const siswaTerpilih = siswa.find((item) => item.nis === nis);
  const rekapRaport = nis ? raport : [];

  return (
    <div className="space-y-6">
      <div className="non-printable flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">E-Raport Resmi Madrasah</h1>
          <p className="text-sm text-slate-500">Rekap nilai dihitung otomatis dari data Nilai Harian siswa.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
          Cetak / Download PDF
        </button>
      </div>

      {pesanError && <p role="alert" className="non-printable rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{pesanError}</p>}

      <div className="non-printable grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <label htmlFor="siswa-raport" className="block text-xs font-semibold text-slate-700">Pilih Siswa</label>
          <select id="siswa-raport" value={nis} onChange={(event) => setNis(event.target.value)} disabled={memuatSiswa || siswa.length === 0} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
            <option value="">{memuatSiswa ? "Memuat siswa..." : "Pilih siswa"}</option>
            {siswa.map((student) => <option key={student.nis} value={student.nis}>{student.nis} — {student.nama} ({student.kelas})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="semester-raport" className="block text-xs font-semibold text-slate-700">Periode Semester</label>
          <select id="semester-raport" value={semester} onChange={(event) => setSemester(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
            <option>Semester 1 (Ganjil)</option>
            <option>Semester 2 (Genap)</option>
          </select>
        </div>
        <div>
          <label htmlFor="tahun-ajaran-raport" className="block text-xs font-semibold text-slate-700">Tahun Ajaran (YYYY/YYYY)</label>
          <input id="tahun-ajaran-raport" value={tahunAjaran} onChange={(event) => setTahunAjaran(event.target.value)} pattern="\d{4}/\d{4}" maxLength={9} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
        </div>
      </div>

      <div id="area-raport" className="space-y-6 rounded-2xl border border-slate-300 bg-white p-8 text-slate-900 shadow-sm">
        <div className="space-y-1 border-b-2 border-slate-900 pb-4 text-center">
          <p className="text-xs font-bold tracking-widest text-slate-600">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
          <h2 className="text-xl font-extrabold">RAUDHATUL ATHFAL (RA) SAHID</h2>
          <p className="text-xs text-slate-600">Laporan Penilaian Perkembangan Anak Didik</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p><span className="font-semibold text-slate-500">Nama Anak:</span> {siswaTerpilih?.nama ?? "-"}</p>
          <p><span className="font-semibold text-slate-500">Kelompok:</span> {siswaTerpilih?.kelas ?? "-"}</p>
          <p><span className="font-semibold text-slate-500">NIS:</span> {siswaTerpilih?.nis ?? "-"}</p>
          <p><span className="font-semibold text-slate-500">Semester:</span> {semester} ({tahunAjaran})</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase text-slate-700">Rekapitulasi Nilai Harian per Mata Pelajaran</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">Rata-rata</th>
                  <th className="px-4 py-3">Predikat</th>
                  <th className="px-4 py-3">Jumlah Penilaian</th>
                  <th className="px-4 py-3">Catatan Nilai Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!nis ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    {memuatSiswa
                      ? "Memuat daftar siswa..."
                      : "Silakan pilih siswa terlebih dahulu untuk melihat rekap raport."}
                  </td></tr>
                ) : memuatRaport ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Menghitung rekap nilai...</td></tr>
                ) : rekapRaport.length ? rekapRaport.map((entry) => (
                  <tr key={entry.aspek} className="align-top">
                    <td className="px-4 py-3 font-semibold">{entry.aspek}</td>
                    <td className="px-4 py-3">{entry.nilaiAngka.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">{entry.predikat}</td>
                    <td className="px-4 py-3">{entry.jumlahPenilaian}</td>
                    <td className="px-4 py-3 leading-relaxed">{entry.catatan || "-"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada nilai harian pada semester ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #area-raport, #area-raport * { visibility: visible; }
          #area-raport { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          aside, header, nav, footer, .non-printable { display: none !important; }
        }
      `}</style>
    </div>
  );
}
