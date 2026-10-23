"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Guru = {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
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

function isGuru(value: unknown): value is Record<string, unknown> {
  return isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nama);
}

function normalizeGuru(value: unknown): Guru | null {
  if (!isGuru(value)) return null;
  return {
    id: text(value.id),
    nip: text(value.nip, "-"),
    nama: text(value.nama, "Nama tidak tersedia"),
    jabatan: text(value.jabatan, "Belum ditentukan"),
    status: text(value.status, "Aktif"),
  };
}

export default function GuruPage() {
  const [daftarGuru, setDaftarGuru] = useState<Guru[]>([]);
  const [pesanError, setPesanError] = useState("");
  const [memuat, setMemuat] = useState(true);

  const [cari, setCari] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");

  // State Modal Tambah / Edit
  const [bukaModal, setBukaModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [idEdit, setIdEdit] = useState<string | null>(null);

  const [nip, setNip] = useState("");
  const [nama, setNama] = useState("");
  const [jabatan, setJabatan] = useState("Guru Kelas");

  async function muatGuru() {
    try {
      const response = await apiFetch("/api/guru", { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok || !Array.isArray(result) || !result.every(isGuru)) {
        throw new Error("Gagal memuat data guru.");
      }
      setDaftarGuru(result.map(normalizeGuru).filter((guru): guru is Guru => guru !== null));
      setPesanError("");
    } catch (error) {
      console.error("Gagal memuat data guru:", error);
      setPesanError(error instanceof Error ? error.message : "Gagal memuat data guru.");
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(muatGuru);
  }, []);

  const handleBukaTambah = () => {
    setIsEdit(false);
    setIdEdit(null);
    setNip("");
    setNama("");
    setJabatan("Guru Kelas");
    setBukaModal(true);
  };

  const handleBukaEdit = (guru: Guru) => {
    setIsEdit(true);
    setIdEdit(guru.id);
    setNip(guru.nip);
    setNama(guru.nama);
    setJabatan(guru.jabatan);
    setBukaModal(true);
  };

  const handleSimpan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nip || !nama) return alert("NIP dan Nama harus diisi!");

    try {
      const response = await apiFetch("/api/guru", {
        method: isEdit && idEdit !== null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit && idEdit !== null ? { id: idEdit } : {}),
          nip,
          nama,
          jabatan,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Gagal menyimpan data guru.";
        throw new Error(message);
      }
      await muatGuru();
      setBukaModal(false);
    } catch (error) {
      console.error("Gagal menyimpan data guru:", error);
      alert(error instanceof Error ? error.message : "Gagal menyimpan data guru.");
    }
  };

  const handleHapus = async (id: string, namaGuru: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data guru ${namaGuru}?`)) {
      try {
        const response = await apiFetch(`/api/guru?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) {
          const result: unknown = await response.json();
          const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Gagal menghapus data guru.";
          throw new Error(message);
        }
        await muatGuru();
      } catch (error) {
        console.error("Gagal menghapus data guru:", error);
        alert(error instanceof Error ? error.message : "Gagal menghapus data guru.");
      }
    }
  };

  const guruDisaring = daftarGuru.filter((g) => {
    const cocokNama = g.nama.toLowerCase().includes(cari.toLowerCase()) || g.nip.includes(cari);
    const cocokJabatan = filterJabatan === "" || g.jabatan.toLowerCase().includes(filterJabatan.toLowerCase());
    return cocokNama && cocokJabatan;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Guru & Staf RA Sahid</h1>
          <p className="text-sm text-slate-500">Kelola tenaga pendidik, ubah rincian, atau hapus data.</p>
        </div>
        <button 
          onClick={handleBukaTambah}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          + Tambah Guru/Staf
        </button>
      </div>

      {pesanError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{pesanError}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama atau NIP guru..." 
              className="w-full rounded-lg border border-slate-300 py-2 pl-4 pr-4 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <select 
              value={filterJabatan}
              onChange={(e) => setFilterJabatan(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none"
            >
              <option value="">Semua Jabatan</option>
              <option value="Kepala Sekolah">Kepala Sekolah</option>
              <option value="Guru">Guru</option>
              <option value="Agama">Agama</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">NIP / ID</th>
                <th className="px-6 py-3 font-semibold">Nama Lengkap & Gelar</th>
                <th className="px-6 py-3 font-semibold">Jabatan</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {memuat ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat data guru...</td></tr>
              ) : guruDisaring.length > 0 ? (
                guruDisaring.map((g) => (
                  <tr key={g.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{g.nip}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{g.nama}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {g.jabatan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleBukaEdit(g)}
                        className="font-medium text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-2.5 py-1 rounded-md"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleHapus(g.id, g.nama)}
                        className="font-medium text-rose-600 hover:text-rose-900 text-xs bg-rose-50 px-2.5 py-1 rounded-md"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data guru ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Guru */}
      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? "Edit Data Guru & Staf" : "Tambah Guru & Staf Baru"}
            </h2>
            <form onSubmit={handleSimpan} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">NIP / ID Pegawai</label>
                <input 
                  type="text" 
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 1995..." 
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Lengkap & Gelar</label>
                <input 
                  type="text" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Rina Marlina, S.Pd" 
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Jabatan / Tugas</label>
                <input 
                  type="text" 
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Guru Kelas TK B" 
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setBukaModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {isEdit ? "Simpan Perubahan" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}