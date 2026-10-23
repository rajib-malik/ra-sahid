"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Teacher = {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
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

function normalizeTeacher(value: unknown): Teacher | null {
  if (!isRecord(value)) return null;
  const nama = toText(value.nama);
  if (!nama.trim()) return null;
  return {
    id: toText(value.id, nama),
    nip: toText(value.nip, "-"),
    nama,
    jabatan: toText(value.jabatan, "Belum ditentukan"),
    status: toText(value.status, "Aktif"),
  };
}

function getErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Data guru belum dapat dimuat. Silakan coba kembali.";
}

export default function KepsekGuruPage() {
  const [daftarGuru, setDaftarGuru] = useState<Teacher[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [selectedJabatan, setSelectedJabatan] = useState("ALL");
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const muatGuru = useCallback(async () => {
    setMemuat(true);
    try {
      const response = await apiFetch("/api/guru", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(result));
      if (!Array.isArray(result)) throw new Error("Format data guru tidak valid.");
      setDaftarGuru(result.map(normalizeTeacher).filter((teacher): teacher is Teacher => teacher !== null));
      setPesanError("");
    } catch (error) {
      setDaftarGuru([]);
      setPesanError(error instanceof Error ? error.message : "Data guru belum dapat dimuat.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(muatGuru);
    const interval = window.setInterval(() => void muatGuru(), 30_000);
    return () => window.clearInterval(interval);
  }, [muatGuru]);

  const jabatanTersedia = [...new Set(daftarGuru.map((teacher) => teacher.jabatan))].sort((a, b) => a.localeCompare(b, "id"));
  const filteredGuru = useMemo(() => daftarGuru.filter((teacher) => {
    const keyword = searchKeyword.toLowerCase();
    const cocokKeyword = teacher.nama.toLowerCase().includes(keyword) || teacher.nip.toLowerCase().includes(keyword);
    const cocokJabatan = selectedJabatan === "ALL" || teacher.jabatan === selectedJabatan;
    const cocokHuruf = selectedLetter === "ALL" || teacher.nama.toUpperCase().startsWith(selectedLetter);
    return cocokKeyword && cocokJabatan && cocokHuruf;
  }), [daftarGuru, searchKeyword, selectedJabatan, selectedLetter]);
  const alphabetList = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pemantauan Data Guru & Staf</h1>
        <p className="text-sm text-slate-500">Data tenaga pendidik yang terdaftar di database RA Sahid.</p>
      </div>
      {pesanError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{pesanError}</p>}

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <input type="search" placeholder="Cari nama atau NIP guru..." value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm md:w-72" />
        <div className="flex flex-wrap gap-3">
          <select aria-label="Filter jabatan" value={selectedJabatan} onChange={(event) => setSelectedJabatan(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="ALL">Semua Jabatan</option>
            {jabatanTersedia.map((jabatan) => <option key={jabatan} value={jabatan}>{jabatan}</option>)}
          </select>
          <select aria-label="Filter awalan nama" value={selectedLetter} onChange={(event) => setSelectedLetter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {alphabetList.map((char) => <option key={char} value={char}>{char === "ALL" ? "Semua Abjad" : `Awalan ${char}`}</option>)}
          </select>
          <button type="button" onClick={() => void muatGuru()} disabled={memuat} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">{memuat ? "Memuat..." : "Perbarui"}</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr><th className="px-6 py-3 font-semibold">NIP / ID</th><th className="px-6 py-3 font-semibold">Nama</th><th className="px-6 py-3 font-semibold">Jabatan</th><th className="px-6 py-3 font-semibold">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {memuat ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Memuat data guru dari database...</td></tr>
              ) : filteredGuru.length ? filteredGuru.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{teacher.nip}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{teacher.nama}</td>
                  <td className="px-6 py-4">{teacher.jabatan}</td>
                  <td className="px-6 py-4">{teacher.status}</td>
                </tr>
              )) : <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Tidak ada data guru untuk ditampilkan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
