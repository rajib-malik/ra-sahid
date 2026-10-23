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

type DailyGrade = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  tanggal: string;
  aspek: string;
  nilaiAngka: number;
  predikat: string;
  catatan: string;
};

type GradeRow = {
  nis: string;
  nama: string;
  kelas: string;
  nilaiAngka: string;
  predikat: string;
  catatan: string;
};

const MATA_PELAJARAN_DEFAULT = [
  "Hafalan Doa Sehari-hari",
  "Praktik Motorik Halus (Menggunting/Menulis)",
  "Mengenal Angka & Huruf",
  "Kemandirian & Sosial",
];
const OPSI_TAMBAH_MATA_PELAJARAN = "__tambah_mata_pelajaran__";

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

function isDailyGrade(value: unknown): value is Record<string, unknown> {
  return isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama);
}

function numericValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDailyGrade(value: unknown): DailyGrade | null {
  if (!isDailyGrade(value)) return null;
  return {
    id: text(value.id),
    nis: text(value.nis),
    nama: text(value.nama),
    kelas: text(value.tingkatRombel, text(value.kelas)),
    tanggal: text(value.tanggal),
    aspek: text(value.aspek),
    nilaiAngka: numericValue(value.nilaiAngka),
    predikat: text(value.predikat, "BSH"),
    catatan: text(value.catatan),
  };
}

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

export default function NilaiHarianPage() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [kegiatan, setKegiatan] = useState("Hafalan Doa Sehari-hari");
  const [daftarMataPelajaran, setDaftarMataPelajaran] = useState(MATA_PELAJARAN_DEFAULT);
  const [tambahMataPelajaran, setTambahMataPelajaran] = useState(false);
  const [mataPelajaranBaru, setMataPelajaranBaru] = useState("");
  const [daftarSiswa, setDaftarSiswa] = useState<Student[]>([]);
  const [kelas, setKelas] = useState("");
  const [daftarNilai, setDaftarNilai] = useState<GradeRow[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");
  const mataPelajaranTerpilih = tambahMataPelajaran ? mataPelajaranBaru : kegiatan;

  useEffect(() => {
    async function muatSiswa() {
      try {
        const response = await apiFetch("/api/siswa", { cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok || !Array.isArray(result) || !result.every(isStudent)) {
          throw new Error(getErrorMessage(result, "Gagal memuat daftar siswa."));
        }
        const normalizedStudents = result.map(normalizeStudent).filter((student): student is Student => student !== null);
        setDaftarSiswa(normalizedStudents);
        setKelas((current) => current || normalizedStudents[0]?.kelas || "");
      } catch (error) {
        console.error("Gagal memuat siswa untuk nilai harian:", error);
        setPesanError(error instanceof Error ? error.message : "Gagal memuat daftar siswa.");
      }
    }
    void Promise.resolve().then(muatSiswa);
  }, []);

  useEffect(() => {
    async function muatMataPelajaran() {
      try {
        const response = await apiFetch("/api/nilai?daftarMataPelajaran=true", { cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok || !Array.isArray(result) || !result.every((item) => typeof item === "string")) {
          throw new Error(getErrorMessage(result, "Gagal memuat daftar mata pelajaran."));
        }
        setDaftarMataPelajaran([...new Set([...MATA_PELAJARAN_DEFAULT, ...result])]);
      } catch (error) {
        console.error("Gagal memuat daftar mata pelajaran:", error);
        setPesanError(error instanceof Error ? error.message : "Gagal memuat daftar mata pelajaran.");
      }
    }
    void Promise.resolve().then(muatMataPelajaran);
  }, []);

  useEffect(() => {
    let aktif = true;

    async function muatNilai() {
      if (!kelas || !mataPelajaranTerpilih.trim()) {
        if (!aktif) return;
        setDaftarNilai([]);
        setMemuat(false);
        return;
      }

      setMemuat(true);
      try {
        const [studentResponse, gradeResponse] = await Promise.all([
          apiFetch("/api/siswa", { cache: "no-store" }),
          apiFetch(`/api/nilai?tanggal=${encodeURIComponent(tanggal)}&kelas=${encodeURIComponent(kelas)}&aspek=${encodeURIComponent(mataPelajaranTerpilih)}`, { cache: "no-store" }),
        ]);
        const students: unknown = await studentResponse.json();
        const grades: unknown = await gradeResponse.json();
        if (!studentResponse.ok) throw new Error(getErrorMessage(students, "Gagal memuat daftar siswa."));
        if (!gradeResponse.ok) throw new Error(getErrorMessage(grades, "Gagal memuat nilai harian."));
        if (!Array.isArray(students) || !Array.isArray(grades)) {
          throw new Error("Format data siswa atau nilai harian tidak valid.");
        }
        if (!aktif) return;
        const normalizedStudents = students.map(normalizeStudent).filter((student): student is Student => student !== null);
        const normalizedGrades = grades.map(normalizeDailyGrade).filter((grade): grade is DailyGrade => grade !== null);
        setDaftarSiswa(normalizedStudents);
        const gradesByNis = new Map(normalizedGrades.map((grade) => [grade.nis, grade]));
        setDaftarNilai(normalizedStudents
          .filter((student) => student.kelas === kelas && student.status === "Aktif")
          .map((student) => {
            const grade = gradesByNis.get(student.nis);
            return {
              nis: student.nis,
              nama: student.nama,
              kelas: student.kelas,
              nilaiAngka: grade ? String(grade.nilaiAngka) : "",
              predikat: grade?.predikat ?? "BSH",
              catatan: grade?.catatan ?? "",
            };
          }));
        setPesanError("");
      } catch (error) {
        if (!aktif) return;
        console.error("Gagal memuat nilai harian:", error);
        setPesanError(error instanceof Error ? error.message : "Gagal memuat nilai harian.");
      } finally {
        if (aktif) setMemuat(false);
      }
    }
    void Promise.resolve().then(muatNilai);
    return () => {
      aktif = false;
    };
  }, [tanggal, kelas, mataPelajaranTerpilih]);

  function updateRow(nis: string, patch: Partial<GradeRow>) {
    setDaftarNilai((current) =>
      current.map((row) => row.nis === nis ? { ...row, ...patch } : row),
    );
  }

  async function handleSimpan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mataPelajaranTerpilih.trim()) {
      setPesanError("Nama mata pelajaran wajib diisi.");
      return;
    }
    if (!daftarNilai.length) {
      setPesanError("Tidak ada siswa aktif pada kelas ini.");
      return;
    }

    const entries = daftarNilai.map((row) => ({
      nis: row.nis,
      nilaiAngka: Number(row.nilaiAngka),
      predikat: row.predikat,
      catatan: row.catatan,
    }));
    if (entries.some((entry) => !Number.isFinite(entry.nilaiAngka) || entry.nilaiAngka < 0 || entry.nilaiAngka > 100)) {
      setPesanError("Nilai setiap siswa harus berupa angka antara 0 dan 100.");
      return;
    }

    setMenyimpan(true);
    setPesanError("");
    setPesanSukses("");
    try {
      const response = await apiFetch("/api/nilai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, aspek: mataPelajaranTerpilih.trim(), entries }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(result, "Gagal menyimpan nilai harian."));
      const namaMataPelajaran = mataPelajaranTerpilih.trim();
      setDaftarMataPelajaran((current) => [...new Set([...current, namaMataPelajaran])].sort((a, b) => a.localeCompare(b, "id")));
      setKegiatan(namaMataPelajaran);
      setTambahMataPelajaran(false);
      setMataPelajaranBaru("");
      setPesanSukses("Nilai harian berhasil disimpan ke database.");
    } catch (error) {
      console.error("Gagal menyimpan nilai harian:", error);
      setPesanError(error instanceof Error ? error.message : "Gagal menyimpan nilai harian.");
    } finally {
      setMenyimpan(false);
    }
  }

  const daftarKelas = [...new Set(daftarSiswa.map((student) => student.kelas))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Input Nilai Harian</h1>
        <p className="text-sm text-slate-500">Daftar siswa dan rekap nilai diambil dari database.</p>
      </div>

      {pesanError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{pesanError}</p>}
      {pesanSukses && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{pesanSukses}</p>}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <label htmlFor="tanggal-nilai" className="block text-xs font-semibold text-slate-700">Tanggal Kegiatan</label>
          <input id="tanggal-nilai" type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="mata-pelajaran-nilai" className="block text-xs font-semibold text-slate-700">Mata Pelajaran</label>
          <select
            id="mata-pelajaran-nilai"
            value={tambahMataPelajaran ? OPSI_TAMBAH_MATA_PELAJARAN : kegiatan}
            onChange={(event) => {
              const value = event.target.value;
              if (value === OPSI_TAMBAH_MATA_PELAJARAN) {
                setTambahMataPelajaran(true);
                setMataPelajaranBaru("");
              } else {
                setTambahMataPelajaran(false);
                setKegiatan(value);
              }
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
          >
            {daftarMataPelajaran.map((item) => <option key={item} value={item}>{item}</option>)}
            <option value={OPSI_TAMBAH_MATA_PELAJARAN}>+ Tambah Mata Pelajaran Baru...</option>
          </select>
          {tambahMataPelajaran && (
            <input
              aria-label="Nama mata pelajaran baru"
              autoFocus
              maxLength={100}
              value={mataPelajaranBaru}
              onChange={(event) => setMataPelajaranBaru(event.target.value)}
              placeholder="Ketik nama mata pelajaran"
              className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          )}
        </div>
        <div>
          <label htmlFor="kelas-nilai" className="block text-xs font-semibold text-slate-700">Kelompok Kelas</label>
          <select id="kelas-nilai" value={kelas} onChange={(event) => setKelas(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
            {daftarKelas.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={handleSimpan}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">NIS & Nama Siswa</th>
                  <th className="w-32 px-6 py-3 font-semibold">Nilai (0–100)</th>
                  <th className="w-64 px-6 py-3 font-semibold">Predikat</th>
                  <th className="px-6 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {memuat ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Memuat data siswa dan nilai...</td></tr>
                ) : daftarNilai.length ? daftarNilai.map((row) => (
                  <tr key={row.nis}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{row.nama}</p>
                      <p className="text-xs text-slate-500">NIS: {row.nis}</p>
                    </td>
                    <td className="px-6 py-4">
                      <input type="number" min="0" max="100" step="0.01" required value={row.nilaiAngka} onChange={(event) => updateRow(row.nis, { nilaiAngka: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm" />
                    </td>
                    <td className="px-6 py-4">
                      <select value={row.predikat} onChange={(event) => updateRow(row.nis, { predikat: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs">
                        <option value="BSB">BSB (Berkembang Sangat Baik)</option>
                        <option value="BSH">BSH (Berkembang Sesuai Harapan)</option>
                        <option value="MB">MB (Mulai Berkembang)</option>
                        <option value="BB">BB (Belum Berkembang)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input value={row.catatan} onChange={(event) => updateRow(row.nis, { catatan: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Tidak ada siswa aktif di kelas ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-500">Nilai dicatat untuk semua siswa aktif di kelas yang dipilih.</p>
            <button type="submit" disabled={memuat || menyimpan || !mataPelajaranTerpilih.trim() || !daftarNilai.length} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {menyimpan ? "Menyimpan..." : "Simpan Nilai Harian"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
