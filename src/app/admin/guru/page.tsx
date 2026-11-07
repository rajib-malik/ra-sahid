
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Guru = {
  id: string;
  nip: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jabatan: string;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function isValidIdentifier(value: unknown) {
  return (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isGuru(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isValidIdentifier(value.id) && isValidIdentifier(value.nama);
}

function normalizeGuru(value: unknown): Guru | null {
  if (!isGuru(value)) return null;

  return {
    id: text(value.id),
    nip: text(value.nip, "-"),
    nama: text(value.nama, "Nama tidak tersedia"),
    tempat_lahir: text(value.tempat_lahir),
    tanggal_lahir: text(value.tanggal_lahir),
    jabatan: text(value.jabatan, "Belum ditentukan"),
    status: text(value.status, "Aktif"),
  };
}

function formatTanggal(tanggal: string) {
  if (!tanggal) return "-";

  const date = new Date(`${tanggal.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return tanggal;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export default function GuruPage() {
  const [daftarGuru, setDaftarGuru] = useState<Guru[]>([]);
  const [pesanError, setPesanError] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const [cari, setCari] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");

  const [bukaModal, setBukaModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [idEdit, setIdEdit] = useState<string | null>(null);

  const [nip, setNip] = useState("");
  const [nama, setNama] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [jabatan, setJabatan] = useState("Guru Kelas");

  async function muatGuru() {
    try {
      const response = await apiFetch("/api/guru", { cache: "no-store" });
      const result: unknown = await response.json();

      if (!response.ok || !Array.isArray(result) || !result.every(isGuru)) {
        throw new Error("Gagal memuat data guru.");
      }

      setDaftarGuru(
        result
          .map(normalizeGuru)
          .filter((guru): guru is Guru => guru !== null)
      );
      setPesanError("");
    } catch (error) {
      console.error("Gagal memuat data guru:", error);
      setPesanError(
        error instanceof Error ? error.message : "Gagal memuat data guru."
      );
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    void muatGuru();
  }, []);

  function resetForm() {
    setNip("");
    setNama("");
    setTempatLahir("");
    setTanggalLahir("");
    setJabatan("Guru Kelas");
  }

  function handleBukaTambah() {
    resetForm();
    setIsEdit(false);
    setIdEdit(null);
    setBukaModal(true);
  }

  function handleBukaEdit(guru: Guru) {
    setIsEdit(true);
    setIdEdit(guru.id);
    setNip(guru.nip === "-" ? "" : guru.nip);
    setNama(guru.nama);
    setTempatLahir(guru.tempat_lahir);
    setTanggalLahir(guru.tanggal_lahir?.slice(0, 10) || "");
    setJabatan(guru.jabatan);
    setBukaModal(true);
  }

  async function handleSimpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!nip.trim() || !nama.trim() || !jabatan.trim()) {
      alert("NIP, nama, dan jabatan wajib diisi.");
      return;
    }

    setMenyimpan(true);

    try {
      const response = await apiFetch("/api/guru", {
        method: isEdit && idEdit !== null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit && idEdit !== null ? { id: idEdit } : {}),
          nip: nip.trim(),
          nama: nama.trim(),
          tempat_lahir: tempatLahir.trim(),
          tanggal_lahir: tanggalLahir || null,
          jabatan: jabatan.trim(),
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan data guru.";
        throw new Error(message);
      }

      await muatGuru();
      setBukaModal(false);
      resetForm();
    } catch (error) {
      console.error("Gagal menyimpan data guru:", error);
      alert(error instanceof Error ? error.message : "Gagal menyimpan data guru.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function handleHapus(id: string, namaGuru: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data guru ${namaGuru}?`)) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/guru?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          isRecord(result) && typeof result.error === "string"
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

  const guruDisaring = useMemo(() => {
    return daftarGuru.filter((guru) => {
      const cocokNama =
        guru.nama.toLowerCase().includes(cari.toLowerCase()) ||
        guru.nip.toLowerCase().includes(cari.toLowerCase());

      const cocokJabatan =
        filterJabatan === "" ||
        guru.jabatan.toLowerCase().includes(filterJabatan.toLowerCase());

      return cocokNama && cocokJabatan;
    });
  }, [daftarGuru, cari, filterJabatan]);

  const jumlahAktif = daftarGuru.filter(
    (guru) => guru.status.toLowerCase() === "aktif"
  ).length;

  const jumlahJabatan = new Set(daftarGuru.map((guru) => guru.jabatan)).size;

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/50 p-1 sm:p-3">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Manajemen Sekolah
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            Data Guru & Staf
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola informasi dan data tenaga pendidik RA Modern Sahid.
          </p>
        </div>

        <button
          onClick={handleBukaTambah}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          <span className="text-lg">+</span>
          Tambah Guru
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Guru & Staf</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-800">
                {daftarGuru.length}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
              👩‍🏫
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Seluruh data tenaga pendidik</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Guru Aktif</p>
              <h2 className="mt-2 text-3xl font-bold text-emerald-600">
                {jumlahAktif}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-2xl">
              ✓
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Tenaga pendidik berstatus aktif</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Jenis Jabatan</p>
              <h2 className="mt-2 text-3xl font-bold text-blue-600">
                {jumlahJabatan}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              💼
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Jabatan yang tercatat dalam sistem</p>
        </div>
      </div>

      {pesanError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {pesanError}
        </div>
      )}

      {/* Tabel Data */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Daftar Guru & Staf</h2>
            <p className="mt-1 text-xs text-slate-500">
              Informasi tenaga pendidik yang terdaftar pada sistem.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <input
                type="text"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama atau NIP..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-64"
              />
            </div>

            <select
              value={filterJabatan}
              onChange={(e) => setFilterJabatan(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-500"
            >
              <option value="">Semua Jabatan</option>
              <option value="Kepala Sekolah">Kepala Sekolah</option>
              <option value="Guru">Guru</option>
              <option value="Staf">Staf</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">No.</th>
                <th className="px-5 py-4 font-semibold">NIP / ID</th>
                <th className="px-5 py-4 font-semibold">Nama Guru</th>
                <th className="px-5 py-4 font-semibold">Tempat, Tanggal Lahir</th>
                <th className="px-5 py-4 font-semibold">Jabatan</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600">
              {memuat ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      Memuat data guru...
                    </div>
                  </td>
                </tr>
              ) : guruDisaring.length > 0 ? (
                guruDisaring.map((guru, index) => (
                  <tr
                    key={guru.id}
                    className="transition-colors hover:bg-emerald-50/40"
                  >
                    <td className="px-5 py-4 text-slate-400">{index + 1}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {guru.nip}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                          {guru.nama.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {guru.nama}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-700">
                        {guru.tempat_lahir || "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {formatTanggal(guru.tanggal_lahir)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {guru.jabatan}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          guru.status.toLowerCase() === "aktif"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {guru.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleBukaEdit(guru)}
                          className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleHapus(guru.id, guru.nama)}
                          className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="text-3xl">📋</div>
                    <p className="mt-2 font-semibold text-slate-600">
                      Data guru tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Coba ubah kata kunci pencarian atau filter jabatan.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Menampilkan {guruDisaring.length} dari {daftarGuru.length} data guru.
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {bukaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setBukaModal(false)}
        >
          <div
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isEdit ? "Edit Data Guru" : "Tambah Guru Baru"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lengkapi informasi identitas tenaga pendidik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBukaModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpan} className="space-y-5 p-6">
              <div>
                <h3 className="mb-3 text-sm font-bold text-emerald-700">
                  Informasi Identitas
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      NIP / ID Pegawai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="Masukkan NIP atau ID pegawai"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Contoh: Rina Marlina, S.Pd."
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                      placeholder="Contoh: Bogor"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-emerald-700">
                  Informasi Pekerjaan
                </h3>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Jabatan / Tugas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Guru Kelas A"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBukaModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={menyimpan}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {menyimpan
                    ? "Menyimpan..."
                    : isEdit
                      ? "Simpan Perubahan"
                      : "Simpan Data Guru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
