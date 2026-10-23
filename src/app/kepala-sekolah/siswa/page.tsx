"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Student = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jenisKelamin: string;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function normalizeStudent(value: unknown): Student | null {
  if (!isRecord(value)) return null;
  const nis = toText(value.nis);
  const nama = toText(value.nama);
  if (!nis.trim() || !nama.trim()) return null;
  return {
    id: toText(value.id, nis),
    nis,
    nama,
    kelas: toText(value.tingkatRombel, toText(value.kelas, "Belum ditentukan")),
    jenisKelamin: toText(value.jenisKelamin, toText(value.jk, "-")),
    status: toText(value.status, "Aktif"),
  };
}

function getErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Daftar siswa belum dapat dimuat. Silakan coba kembali.";
}

export default function KepsekSiswaPage() {
  const [daftarSiswa, setDaftarSiswa] = useState<Student[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [selectedKelas, setSelectedKelas] = useState("ALL");
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const muatSiswa = useCallback(async () => {
    setMemuat(true);
    try {
      const response = await apiFetch("/api/siswa", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(result));
      if (!Array.isArray(result)) throw new Error("Format daftar siswa tidak valid.");
      setDaftarSiswa(result.map(normalizeStudent).filter((student): student is Student => student !== null));
      setPesanError("");
    } catch (error) {
      setDaftarSiswa([]);
      setPesanError(error instanceof Error ? error.message : "Daftar siswa belum dapat dimuat.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(muatSiswa);
    const interval = window.setInterval(() => void muatSiswa(), 30_000);
    return () => window.clearInterval(interval);
  }, [muatSiswa]);

  const kelasTersedia = [...new Set(daftarSiswa.map((student) => student.kelas))].sort((a, b) => a.localeCompare(b, "id"));
  const filteredSiswa = useMemo(() => daftarSiswa.filter((student) => {
    const keyword = searchKeyword.toLowerCase();
    const cocokKeyword = student.nama.toLowerCase().includes(keyword) || student.nis.toLowerCase().includes(keyword);
    const cocokKelas = selectedKelas === "ALL" || student.kelas === selectedKelas;
    const cocokHuruf = selectedLetter === "ALL" || student.nama.toUpperCase().startsWith(selectedLetter);
    return cocokKeyword && cocokKelas && cocokHuruf;
  }), [daftarSiswa, searchKeyword, selectedLetter, selectedKelas]);

  const alphabetList = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pemantauan Data Siswa</h1>
        <p className="text-sm text-slate-500">Daftar tersinkron langsung dari data induk Admin.</p>
      </div>
      {pesanError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{pesanError}</p>}

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <input
          type="search"
          placeholder="Cari nama atau NIS siswa..."
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm md:w-72"
        />
        <div className="flex flex-wrap gap-3">
          <select aria-label="Filter kelas" value={selectedKelas} onChange={(event) => setSelectedKelas(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="ALL">Semua Kelas</option>
            {kelasTersedia.map((kelas) => <option key={kelas} value={kelas}>{kelas}</option>)}
          </select>
          <select aria-label="Filter awalan nama" value={selectedLetter} onChange={(event) => setSelectedLetter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {alphabetList.map((char) => <option key={char} value={char}>{char === "ALL" ? "Semua Abjad" : `Awalan ${char}`}</option>)}
          </select>
          <button type="button" onClick={() => void muatSiswa()} disabled={memuat} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">
            {memuat ? "Memuat..." : "Perbarui"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">NIS</th>
                <th className="px-6 py-3 font-semibold">Nama Lengkap</th>
                <th className="px-6 py-3 font-semibold">Kelas</th>
                <th className="px-6 py-3 font-semibold">Gender</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {memuat ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat data siswa dari database...</td></tr>
              ) : filteredSiswa.length ? filteredSiswa.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 font-medium">{student.nis}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{student.nama}</td>
                  <td className="px-6 py-4">{student.kelas}</td>
                  <td className="px-6 py-4">{student.jenisKelamin}</td>
                  <td className="px-6 py-4">{student.status}</td>
                </tr>
              )) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Tidak ada data siswa untuk ditampilkan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
