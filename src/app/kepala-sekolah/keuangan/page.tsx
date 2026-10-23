"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type FinanceRecord = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jenis: string;
  jumlah: number;
  status: string;
  tanggal: string;
};

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

function normalizeFinance(value: unknown): FinanceRecord | null {
  if (!isRecord(value)) return null;
  const nis = toText(value.nis);
  const nama = toText(value.nama);
  if (!nis.trim() || !nama.trim()) return null;
  return {
    id: toText(value.id, `${nis}-${toText(value.tanggal)}`),
    nis,
    nama,
    kelas: toText(value.tingkatRombel, toText(value.kelas, "Belum ditentukan")),
    jenis: toText(value.jenis, "Pembayaran"),
    jumlah: toNumber(value.jumlah),
    status: toText(value.status, "Belum diketahui"),
    tanggal: toText(value.tanggal),
  };
}

function getErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Data keuangan belum dapat dimuat. Silakan coba kembali.";
}

export default function KepsekKeuanganPage() {
  const [daftarKeuangan, setDaftarKeuangan] = useState<FinanceRecord[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const muatKeuangan = useCallback(async () => {
    setMemuat(true);
    try {
      const response = await apiFetch("/api/keuangan", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(result));
      if (!Array.isArray(result)) throw new Error("Format data keuangan tidak valid.");
      setDaftarKeuangan(result.map(normalizeFinance).filter((record): record is FinanceRecord => record !== null));
      setPesanError("");
    } catch (error) {
      setDaftarKeuangan([]);
      setPesanError(error instanceof Error ? error.message : "Data keuangan belum dapat dimuat.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(muatKeuangan);
    const interval = window.setInterval(() => void muatKeuangan(), 30_000);
    return () => window.clearInterval(interval);
  }, [muatKeuangan]);

  const totalKas = daftarKeuangan
    .filter((record) => record.status.toLowerCase() === "lunas")
    .reduce((total, record) => total + record.jumlah, 0);
  const lunas = daftarKeuangan.filter((record) => record.status.toLowerCase() === "lunas").length;
  const belumLunas = daftarKeuangan.filter((record) => record.status.toLowerCase() === "belum lunas").length;

  const filteredKeuangan = useMemo(() => daftarKeuangan.filter((record) => {
    const keyword = searchKeyword.toLowerCase();
    const cocokKeyword = record.nama.toLowerCase().includes(keyword) ||
      record.jenis.toLowerCase().includes(keyword) ||
      record.kelas.toLowerCase().includes(keyword) ||
      record.nis.toLowerCase().includes(keyword);
    const cocokStatus = selectedStatus === "ALL" || record.status === selectedStatus;
    const cocokHuruf = selectedLetter === "ALL" || record.nama.toUpperCase().startsWith(selectedLetter);
    return cocokKeyword && cocokStatus && cocokHuruf;
  }), [daftarKeuangan, searchKeyword, selectedStatus, selectedLetter]);
  const alphabetList = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pemantauan Keuangan Madrasah</h1>
        <p className="text-sm text-slate-500">Transaksi pembayaran tersinkron langsung dari database Admin.</p>
      </div>
      {pesanError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{pesanError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Kas Terkumpul</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{memuat ? "Memuat..." : `Rp ${totalKas.toLocaleString("id-ID")}`}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Transaksi Lunas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{memuat ? "…" : lunas}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Belum Lunas</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{memuat ? "…" : belumLunas}</p>
        </article>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <input type="search" placeholder="Cari siswa, jenis, atau kelas..." value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm md:w-72" />
        <div className="flex flex-wrap gap-3">
          <select aria-label="Filter status pembayaran" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="ALL">Semua Status</option><option value="Lunas">Lunas</option><option value="Belum Lunas">Belum Lunas</option>
          </select>
          <select aria-label="Filter awalan nama" value={selectedLetter} onChange={(event) => setSelectedLetter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {alphabetList.map((char) => <option key={char} value={char}>{char === "ALL" ? "Semua Abjad" : `Awalan ${char}`}</option>)}
          </select>
          <button type="button" onClick={() => void muatKeuangan()} disabled={memuat} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">{memuat ? "Memuat..." : "Perbarui"}</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr><th className="px-6 py-3 font-semibold">Nama Siswa</th><th className="px-6 py-3 font-semibold">Jenis Pembayaran</th><th className="px-6 py-3 font-semibold">Jumlah</th><th className="px-6 py-3 font-semibold">Status</th><th className="px-6 py-3 font-semibold">Tanggal</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {memuat ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat transaksi keuangan dari database...</td></tr>
              ) : filteredKeuangan.length ? filteredKeuangan.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{record.nama} ({record.kelas})</td>
                  <td className="px-6 py-4">{record.jenis}</td>
                  <td className="px-6 py-4 font-semibold">Rp {record.jumlah.toLocaleString("id-ID")}</td>
                  <td className="px-6 py-4">{record.status}</td>
                  <td className="px-6 py-4">{record.tanggal || "-"}</td>
                </tr>
              )) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Tidak ada transaksi untuk ditampilkan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
