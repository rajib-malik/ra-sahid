
"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
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
  return (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isStudent(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama)
  );
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
  return (
    isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama)
  );
}

function numericValue(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: unknown) {
  if (
    typeof value !== "string" &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
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

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

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
  const [tanggalBaru, setTanggalBaru] = useState(
    new Date().toISOString().slice(0, 10)
  );

  async function muatKeuangan() {
    try {
      const response = await apiFetch("/api/keuangan", {
        cache: "no-store",
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Data keuangan belum dapat dimuat. Silakan coba lagi.";

        setDaftarKeuangan([]);
        setPesanError(message);
        return;
      }

      if (!Array.isArray(result)) {
        setDaftarKeuangan([]);
        setPesanError(
          "Format data keuangan belum dapat dibaca. Silakan muat ulang halaman."
        );
        return;
      }

      const normalizedRecords = result
        .filter(isKeuangan)
        .map(normalizeKeuangan)
        .filter((item): item is Keuangan => item !== null);

      if (normalizedRecords.length !== result.length) {
        console.warn(
          "Sebagian entri keuangan diabaikan karena formatnya tidak valid."
        );
      }

      setDaftarKeuangan(normalizedRecords);
      setPesanError("");
    } catch {
      setDaftarKeuangan([]);
      setPesanError(
        "Data keuangan belum dapat dimuat. Periksa koneksi lalu coba lagi."
      );
    } finally {
      setMemuat(false);
    }
  }

  async function muatSiswa() {
    try {
      const response = await apiFetch("/api/siswa", {
        cache: "no-store",
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Daftar siswa belum dapat dimuat. Silakan coba lagi.";

        setDaftarSiswa([]);
        setPesanError(message);
        return;
      }

      if (!Array.isArray(result)) {
        setDaftarSiswa([]);
        setPesanError(
          "Format daftar siswa belum dapat dibaca. Silakan muat ulang halaman."
        );
        return;
      }

      setDaftarSiswa(
        result
          .filter(isStudent)
          .map(normalizeStudent)
          .filter((student): student is Student => student !== null)
      );

      setPesanError("");
    } catch {
      setDaftarSiswa([]);
      setPesanError(
        "Daftar siswa belum dapat dimuat. Periksa koneksi lalu coba lagi."
      );
    } finally {
      setMemuatSiswa(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() =>
      Promise.all([muatKeuangan(), muatSiswa()])
    );
  }, []);

  const totalKas = daftarKeuangan
    .filter((item) => item.status === "Lunas")
    .reduce((sum, item) => sum + item.jumlah, 0);

  const daftarLunas = daftarKeuangan.filter(
    (item) => item.status === "Lunas"
  );

  const daftarBelumLunas = daftarKeuangan.filter(
    (item) => item.status === "Belum Lunas"
  );

  const handleBukaTambah = () => {
    setIsEdit(false);
    setIdEdit(null);
    setNisBaru(daftarSiswa[0]?.nis ?? "");
    setJenisBaru("SPP Bulanan");
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

    const siswaDipilih = daftarSiswa.find(
      (siswa) => siswa.nis === nisBaru
    );

    if (!siswaDipilih) {
      return alert("Pilih siswa yang terdaftar terlebih dahulu.");
    }

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
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan data keuangan.";

        throw new Error(message);
      }

      await muatKeuangan();
      setBukaModal(false);
    } catch (error) {
      console.error("Gagal menyimpan data keuangan:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan data keuangan."
      );
    }
  };

  const handleHapus = async (id: string, namaSiswa: string) => {
    if (confirm(`Hapus data keuangan untuk ${namaSiswa}?`)) {
      try {
        const response = await apiFetch(
          `/api/keuangan?id=${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const result: unknown = await response.json();

          const message =
            result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Gagal menghapus data keuangan.";

          throw new Error(message);
        }

        await muatKeuangan();
      } catch (error) {
        console.error("Gagal menghapus data keuangan:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Gagal menghapus data keuangan."
        );
      }
    }
  };

  const dataDisaring = daftarKeuangan.filter((item) => {
    if (tabAktif === "lunas" && item.status !== "Lunas") return false;
    if (tabAktif === "belum-lunas" && item.status !== "Belum Lunas") {
      return false;
    }

    const kataKunci = cariNama.trim().toLocaleLowerCase("id-ID");

    const cocokNama = item.nama
      .toLocaleLowerCase("id-ID")
      .includes(kataKunci);

    const cocokAbjad =
      filterAbjad === "" ||
      item.nama
        .trim()
        .toLocaleUpperCase("id-ID")
        .startsWith(filterAbjad);

    return cocokNama && cocokAbjad;
  });

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-1 text-slate-900 sm:p-3">

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Keuangan & Pembayaran SPP
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-700">
            Kelola status pelunasan, edit tagihan, atau hapus data keuangan.
          </p>
        </div>

        <button
          onClick={handleBukaTambah}
          className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          + Tambah Data / Tagihan
        </button>
      </div>

      {/* Ringkasan Keuangan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-700">
            Total Kas Terkumpul (Lunas)
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">
            Rp {totalKas.toLocaleString("id-ID")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTabAktif("lunas")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          <p className="text-xs font-bold text-slate-700">
            Jumlah Lunas
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {daftarLunas.length} Data
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTabAktif("belum-lunas")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-400 hover:bg-amber-50"
        >
          <p className="text-xs font-bold text-slate-700">
            Belum Lunas
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            {daftarBelumLunas.length} Data
          </p>
        </button>
      </div>

      {/* Filter Status dan Pencarian */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">

              <button
                type="button"
                onClick={() => setTabAktif("semua")}
                aria-pressed={tabAktif === "semua"}
                className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition sm:flex-none ${
                  tabAktif === "semua"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                }`}
              >
                Semua
              </button>

              <button
                type="button"
                onClick={() => setTabAktif("lunas")}
                aria-pressed={tabAktif === "lunas"}
                className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition sm:flex-none ${
                  tabAktif === "lunas"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                }`}
              >
                Lunas
              </button>

              <button
                type="button"
                onClick={() => setTabAktif("belum-lunas")}
                aria-pressed={tabAktif === "belum-lunas"}
                className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition sm:flex-none ${
                  tabAktif === "belum-lunas"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                }`}
              >
                Belum Lunas
              </button>
            </div>

            <p className="text-xs font-medium text-slate-700">
              Menampilkan{" "}
              <span className="font-bold text-slate-950">
                {dataDisaring.length}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-950">
                {daftarKeuangan.length}
              </span>{" "}
              data
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(240px,360px)]">

            <div>
              <label
                htmlFor="filter-abjad"
                className="mb-1.5 block text-xs font-bold text-slate-800"
              >
                Filter berdasarkan huruf awal nama
              </label>

              <select
                id="filter-abjad"
                value={filterAbjad}
                onChange={(e) => setFilterAbjad(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Semua Abjad (A-Z)</option>
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((h) => (
                  <option key={h} value={h}>
                    Huruf {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="cari-nama-siswa"
                className="mb-1.5 block text-xs font-bold text-slate-800"
              >
                Cari nama siswa
              </label>

              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
                />

                <input
                  id="cari-nama-siswa"
                  type="search"
                  value={cariNama}
                  onChange={(e) => setCariNama(e.target.value)}
                  placeholder="Ketik nama siswa yang dicari..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />

                {cariNama && (
                  <button
                    type="button"
                    onClick={() => setCariNama("")}
                    aria-label="Hapus pencarian nama"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-700 transition hover:bg-slate-100 hover:text-rose-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pesan Error */}
      {pesanError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900"
        >
          {pesanError}
        </p>
      )}

      {/* Tabel Data Keuangan */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">

            <thead className="border-b border-slate-300 bg-slate-100 text-slate-900">
              <tr>
                <th className="px-6 py-4 font-bold">
                  Nama Siswa & Kelas
                </th>
                <th className="px-6 py-4 font-bold">
                  Jenis & Rincian
                </th>
                <th className="px-6 py-4 font-bold">
                  Jumlah
                </th>
                <th className="px-6 py-4 font-bold">
                  Status
                </th>
                <th className="px-6 py-4 text-right font-bold">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-900">
              {memuat ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center font-semibold text-slate-700"
                  >
                    Memuat data keuangan...
                  </td>
                </tr>
              ) : dataDisaring.length > 0 ? (
                dataDisaring.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-950">
                        {item.nama}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {item.kelas}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.jenis}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {item.keterangan || "-"}
                      </p>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-950">
                      Rp {item.jumlah.toLocaleString("id-ID")}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          item.status === "Lunas"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="space-x-2 px-6 py-4 text-right">
                      <button
                        onClick={() => handleBukaEdit(item)}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-900 transition hover:bg-blue-200"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleHapus(item.id, item.nama)}
                        className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-900 transition hover:bg-rose-200"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center font-medium text-slate-700"
                  >
                    {cariNama.trim() || filterAbjad || tabAktif !== "semua"
                      ? "Tidak ada data yang sesuai dengan pencarian atau filter."
                      : "Belum ada data keuangan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

            <div className="mb-5 border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-950">
                {isEdit
                  ? "Edit Data Keuangan"
                  : "Tambah Data Keuangan"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Lengkapi informasi pembayaran siswa.
              </p>
            </div>

            <form onSubmit={handleSimpan} className="space-y-4">

              <div>
                <label className="block text-sm font-bold text-slate-900">
                  Pilih Siswa
                </label>

                <select
                  value={nisBaru}
                  onChange={(e) => setNisBaru(e.target.value)}
                  className={inputClass}
                  disabled={memuatSiswa || daftarSiswa.length === 0}
                  required
                >
                  <option value="">
                    {memuatSiswa ? "Memuat siswa..." : "Pilih siswa"}
                  </option>

                  {daftarSiswa.map((siswa) => (
                    <option key={siswa.nis} value={siswa.nis}>
                      {siswa.nis} — {siswa.nama} ({siswa.kelas})
                    </option>
                  ))}
                </select>

                {daftarSiswa.find((siswa) => siswa.nis === nisBaru) && (
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {
                      daftarSiswa.find(
                        (siswa) => siswa.nis === nisBaru
                      )?.nama
                    }{" "}
                    ·{" "}
                    {
                      daftarSiswa.find(
                        (siswa) => siswa.nis === nisBaru
                      )?.kelas
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900">
                  Jenis Pembayaran
                </label>

                <select
                  value={jenisBaru}
                  onChange={(e) => setJenisBaru(e.target.value)}
                  className={inputClass}
                >
                  <option value="SPP Bulanan">SPP Bulanan</option>
                  <option value="Uang Kegiatan">Uang Kegiatan</option>
                  <option value="Seragam / Buku">Seragam / Buku</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900">
                  Keterangan
                </label>

                <input
                  type="text"
                  value={ketBaru}
                  onChange={(e) => setKetBaru(e.target.value)}
                  placeholder="Masukkan keterangan pembayaran"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900">
                  Jumlah (Rp)
                </label>

                <input
                  type="number"
                  value={jumlahBaru}
                  onChange={(e) => setJumlahBaru(e.target.value)}
                  className={inputClass}
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900">
                  Status
                </label>

                <select
                  value={statusBaru}
                  onChange={(e) => setStatusBaru(e.target.value)}
                  className={inputClass}
                >
                  <option value="Lunas">Lunas</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900">
                  Tanggal
                </label>

                <input
                  type="date"
                  value={tanggalBaru}
                  onChange={(e) => setTanggalBaru(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setBukaModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={memuatSiswa || daftarSiswa.length === 0}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
