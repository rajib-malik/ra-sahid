"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Keuangan = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jenis: string;
  keterangan: string | null;
  jumlah: number;
  status: string;
  tanggal: string;
};

type Student = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  status: string;
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

function isKeuangan(value: unknown): value is Record<string, unknown> {
  return isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama);
}

function numericValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: unknown) {
  if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeKeuangan(value: unknown): Keuangan | null {
  if (!isKeuangan(value)) return null;
  return {
    id: text(value.id),
    nis: text(value.nis),
    nama: text(value.nama),
    kelas: text(value.tingkatRombel, text(value.kelas)),
    jenis: text(value.jenis, "Pembayaran"),
    keterangan: text(value.keterangan) || null,
    jumlah: numericValue(value.jumlah),
    status: text(value.status, "Belum Lunas"),
    tanggal: dateOnly(value.tanggal),
  };
}

export default function KeuanganPage() {
  const [daftarKeuangan, setDaftarKeuangan] = useState<Keuangan[]>([]);
  const [daftarSiswa, setDaftarSiswa] = useState<Student[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [memuatSiswa, setMemuatSiswa] = useState(true);
  const [pesanError, setPesanError] = useState("");

  const [tabAktif, setTabAktif] = useState("semua");
  const [cariNama, setCariNama] = useState("");
  const [filterAbjad, setFilterAbjad] = useState("");

  // State Modal Tambah / Edit
  const [bukaModal, setBukaModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [idEdit, setIdEdit] = useState<string | null>(null);

  const [nisBaru, setNisBaru] = useState("");
  const [jenisBaru, setJenisBaru] = useState("SPP Bulanan");
  const [ketBaru, setKetBaru] = useState("");
  const [jumlahBaru, setJumlahBaru] = useState("150000");
  const [statusBaru, setStatusBaru] = useState("Lunas");
  const [tanggalBaru, setTanggalBaru] = useState(new Date().toISOString().slice(0, 10));

  async function muatKeuangan() {
    try {
      const response = await apiFetch("/api/keuangan", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = isRecord(result) && typeof result.error === "string"
          ? result.error
          : "Data keuangan belum dapat dimuat. Silakan coba lagi.";
        setDaftarKeuangan([]);
        setPesanError(message);
        return;
      }

      if (!Array.isArray(result)) {
        setDaftarKeuangan([]);
        setPesanError("Format data keuangan belum dapat dibaca. Silakan muat ulang halaman.");
        return;
      }

      const normalizedRecords = result
        .filter(isKeuangan)
        .map(normalizeKeuangan)
        .filter((item): item is Keuangan => item !== null);
      if (normalizedRecords.length !== result.length) {
        console.warn("Sebagian entri keuangan diabaikan karena formatnya tidak valid.");
      }
      setDaftarKeuangan(normalizedRecords);
      setPesanError("");
    } catch {
      setDaftarKeuangan([]);
      setPesanError("Data keuangan belum dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  async function muatSiswa() {
    try {
      const response = await apiFetch("/api/siswa", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = isRecord(result) && typeof result.error === "string"
          ? result.error
          : "Daftar siswa belum dapat dimuat. Silakan coba lagi.";
        setDaftarSiswa([]);
        setPesanError(message);
        return;
      }

      if (!Array.isArray(result)) {
        setDaftarSiswa([]);
        setPesanError("Format daftar siswa belum dapat dibaca. Silakan muat ulang halaman.");
        return;
      }

      setDaftarSiswa(result
        .filter(isStudent)
        .map(normalizeStudent)
        .filter((student): student is Student => student !== null));
      setPesanError("");
    } catch {
      setDaftarSiswa([]);
      setPesanError("Daftar siswa belum dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setMemuatSiswa(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => Promise.all([muatKeuangan(), muatSiswa()]));
  }, []);

  const totalKas = daftarKeuangan
    .filter((item) => item.status === "Lunas")
    .reduce((sum, item) => sum + item.jumlah, 0);

  const daftarLunas = daftarKeuangan.filter((item) => item.status === "Lunas");
  const daftarBelumLunas = daftarKeuangan.filter((item) => item.status === "Belum Lunas");

  const handleBukaTambah = () => {
    setIsEdit(false);
    setIdEdit(null);
    setNisBaru(daftarSiswa[0]?.nis ?? "");
    setKetBaru("");
    setJumlahBaru("150000");
    setStatusBaru("Lunas");
    setTanggalBaru(new Date().toISOString().slice(0, 10));
    setBukaModal(true);
  };

  const handleBukaEdit = (item: Keuangan) => {
    setIsEdit(true);
    setIdEdit(item.id);
    setNisBaru(item.nis);
    setJenisBaru(item.jenis);
    setKetBaru(item.keterangan ?? "");
    setJumlahBaru(item.jumlah.toString());
    setStatusBaru(item.status);
    setTanggalBaru(item.tanggal);
    setBukaModal(true);
  };

  const handleSimpan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const siswaDipilih = daftarSiswa.find((siswa) => siswa.nis === nisBaru);
    if (!siswaDipilih) return alert("Pilih siswa yang terdaftar terlebih dahulu.");

    try {
      const response = await apiFetch("/api/keuangan", {
        method: isEdit && idEdit !== null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit && idEdit !== null ? { id: idEdit } : {}),
          nis: nisBaru,
          jenis: jenisBaru,
          keterangan: ketBaru,
          jumlah: Number(jumlahBaru),
          status: statusBaru,
          tanggal: tanggalBaru,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Gagal menyimpan data keuangan.";
        throw new Error(message);
      }
      await muatKeuangan();
      setBukaModal(false);
    } catch (error) {
      console.error("Gagal menyimpan data keuangan:", error);
      alert(error instanceof Error ? error.message : "Gagal menyimpan data keuangan.");
    }
  };

  const handleHapus = async (id: string, namaSiswa: string) => {
    if (confirm(`Hapus data keuangan untuk ${namaSiswa}?`)) {
      try {
        const response = await apiFetch(`/api/keuangan?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) {
          const result: unknown = await response.json();
          const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Gagal menghapus data keuangan.";
          throw new Error(message);
        }
        await muatKeuangan();
      } catch (error) {
        console.error("Gagal menghapus data keuangan:", error);
        alert(error instanceof Error ? error.message : "Gagal menghapus data keuangan.");
      }
    }
  };

  const dataDisaring = daftarKeuangan.filter((item) => {
    if (tabAktif === "lunas" && item.status !== "Lunas") return false;
    if (tabAktif === "belum-lunas" && item.status !== "Belum Lunas") return false;

    const cocokNama = item.nama.toLowerCase().includes(cariNama.toLowerCase());
    const cocokAbjad = filterAbjad === "" || item.nama.toUpperCase().startsWith(filterAbjad);

    return cocokNama && cocokAbjad;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Keuangan & Pembayaran SPP</h1>
          <p className="text-sm text-slate-500">Kelola status pelunasan, edit tagihan, atau hapus data keuangan.</p>
        </div>
        <button
          onClick={handleBukaTambah}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          + Tambah Data / Tagihan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Kas Terkumpul (Lunas)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">Rp {totalKas.toLocaleString("id-ID")}</p>
        </div>
        <div onClick={() => setTabAktif("lunas")} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-300">
          <p className="text-xs font-semibold text-slate-500">Jumlah Lunas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{daftarLunas.length} Data</p>
        </div>
        <div onClick={() => setTabAktif("belum-lunas")} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm cursor-pointer hover:border-amber-300">
          <p className="text-xs font-semibold text-slate-500">Belum Lunas</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{daftarBelumLunas.length} Data</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          <button onClick={() => setTabAktif("semua")} className={`rounded-md px-4 py-2 ${tabAktif === "semua" ? "bg-white text-slate-900 shadow-sm" : ""}`}>Semua</button>
          <button onClick={() => setTabAktif("lunas")} className={`rounded-md px-4 py-2 ${tabAktif === "lunas" ? "bg-white text-emerald-700 shadow-sm" : ""}`}>Lunas</button>
          <button onClick={() => setTabAktif("belum-lunas")} className={`rounded-md px-4 py-2 ${tabAktif === "belum-lunas" ? "bg-white text-amber-700 shadow-sm" : ""}`}>Belum Lunas</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAbjad}
            onChange={(e) => setFilterAbjad(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none"
          >
            <option value="">Semua Abjad (A-Z)</option>
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((h) => (
              <option key={h} value={h}>Huruf {h}</option>
            ))}
          </select>
          <input 
            type="text"
            value={cariNama}
            onChange={(e) => setCariNama(e.target.value)}
            placeholder="Cari nama siswa..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs w-48 focus:outline-none"
          />
        </div>
      </div>

      {pesanError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{pesanError}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Nama Siswa & Kelas</th>
                <th className="px-6 py-3 font-semibold">Jenis & Rincian</th>
                <th className="px-6 py-3 font-semibold">Jumlah</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {memuat ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat data keuangan...</td></tr>
              ) : dataDisaring.length > 0 ? (
                dataDisaring.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{item.nama}</p>
                      <p className="text-xs text-slate-500">{item.kelas}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{item.jenis}</p>
                      <p className="text-xs text-slate-500">{item.keterangan}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">Rp {item.jumlah.toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleBukaEdit(item)}
                        className="text-xs font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleHapus(item.id, item.nama)}
                        className="text-xs font-medium bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Tidak ada data keuangan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Data Keuangan" : "Tambah Data Keuangan"}</h2>
            <form onSubmit={handleSimpan} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Pilih Siswa</label>
                <select
                  value={nisBaru}
                  onChange={(e) => setNisBaru(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:outline-none"
                  disabled={memuatSiswa || daftarSiswa.length === 0}
                  required
                >
                  <option value="">{memuatSiswa ? "Memuat siswa..." : "Pilih siswa"}</option>
                  {daftarSiswa.map((siswa) => (
                    <option key={siswa.nis} value={siswa.nis}>
                      {siswa.nis} — {siswa.nama} ({siswa.kelas})
                    </option>
                  ))}
                </select>
                {daftarSiswa.find((siswa) => siswa.nis === nisBaru) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {daftarSiswa.find((siswa) => siswa.nis === nisBaru)?.nama} · {daftarSiswa.find((siswa) => siswa.nis === nisBaru)?.kelas}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Jenis Pembayaran</label>
                <select 
                  value={jenisBaru}
                  onChange={(e) => setJenisBaru(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:outline-none"
                >
                  <option value="SPP Bulanan">SPP Bulanan</option>
                  <option value="Uang Kegiatan">Uang Kegiatan</option>
                  <option value="Seragam / Buku">Seragam / Buku</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Keterangan</label>
                <input 
                  type="text" 
                  value={ketBaru}
                  onChange={(e) => setKetBaru(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  value={jumlahBaru}
                  onChange={(e) => setJumlahBaru(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Status</label>
                <select 
                  value={statusBaru}
                  onChange={(e) => setStatusBaru(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:outline-none"
                >
                  <option value="Lunas">Lunas</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Tanggal</label>
                <input
                  type="date"
                  value={tanggalBaru}
                  onChange={(e) => setTanggalBaru(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setBukaModal(false)} className="rounded-lg border px-4 py-2 text-sm text-slate-600">Batal</button>
                <button type="submit" disabled={memuatSiswa || daftarSiswa.length === 0} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}