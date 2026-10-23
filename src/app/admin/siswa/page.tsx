"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-fetch";

type Siswa = {
  id: string;
  nis: string;
  nisn?: string | null;
  nik?: string | null;
  nama: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  tingkatRombel: string;
  umur?: number | null;
  jenisKelamin: string;
  status: string;
  alamat?: string | null;
  kebutuhanKhusus?: string | null;
  disabilitas?: string | null;
  ayahKandung?: string | null;
  ibuKandung?: string | null;
  wali?: string | null;
};

type FormSiswa = {
  nis: string;
  nisn: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  tingkatRombel: string;
  umur: string;
  jenisKelamin: string;
  status: string;
  alamat: string;
  kebutuhanKhusus: string;
  disabilitas: string;
  ayahKandung: string;
  ibuKandung: string;
  wali: string;
};

const FORM_KOSONG: FormSiswa = {
  nis: "",
  nisn: "",
  nik: "",
  nama: "",
  tempatLahir: "",
  tanggalLahir: "",
  tingkatRombel: "TK A",
  umur: "",
  jenisKelamin: "Laki-laki",
  status: "Aktif",
  alamat: "",
  kebutuhanKhusus: "",
  disabilitas: "",
  ayahKandung: "",
  ibuKandung: "",
  wali: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIdentifier(value: unknown) {
  return (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value));
}

type SiswaApiRecord = Record<string, unknown> & {
  id: string | number;
  nis: string | number;
  nama: string | number;
};

function isSiswa(
  value: unknown,
): value is SiswaApiRecord {
  return isRecord(value) &&
    isValidIdentifier(value.id) &&
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama);
}

function toText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeSiswa(value: SiswaApiRecord): Siswa {
  const umurValue = value.umur;
  const umur = typeof umurValue === "number" && Number.isFinite(umurValue)
    ? umurValue
    : typeof umurValue === "string" && umurValue.trim() && Number.isFinite(Number(umurValue))
      ? Number(umurValue)
      : null;

  return {
    id: String(value.id),
    nis: String(value.nis),
    nisn: toText(value.nisn),
    nik: toText(value.nik),
    nama: String(value.nama),
    tempatLahir: toText(value.tempatLahir),
    tanggalLahir: toText(value.tanggalLahir),
    tingkatRombel: toText(value.tingkatRombel) ?? toText(value.kelas) ?? "",
    umur,
    jenisKelamin: toText(value.jenisKelamin) ?? toText(value.jk) ?? "",
    status: toText(value.status) ?? "Aktif",
    alamat: toText(value.alamat),
    kebutuhanKhusus: toText(value.kebutuhanKhusus),
    disabilitas: toText(value.disabilitas),
    ayahKandung: toText(value.ayahKandung),
    ibuKandung: toText(value.ibuKandung),
    wali: toText(value.wali),
  };
}

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

function formDariSiswa(siswa: Siswa): FormSiswa {
  return {
    nis: siswa.nis,
    nisn: siswa.nisn ?? "",
    nik: siswa.nik ?? "",
    nama: siswa.nama,
    tempatLahir: siswa.tempatLahir ?? "",
    tanggalLahir: siswa.tanggalLahir ?? "",
    tingkatRombel: siswa.tingkatRombel,
    umur: siswa.umur == null ? "" : String(siswa.umur),
    jenisKelamin: siswa.jenisKelamin,
    status: siswa.status,
    alamat: siswa.alamat ?? "",
    kebutuhanKhusus: siswa.kebutuhanKhusus ?? "",
    disabilitas: siswa.disabilitas ?? "",
    ayahKandung: siswa.ayahKandung ?? "",
    ibuKandung: siswa.ibuKandung ?? "",
    wali: siswa.wali ?? "",
  };
}

const DETAIL_FIELDS: ReadonlyArray<readonly [keyof Siswa, string]> = [
  ["nis", "NIS"],
  ["nisn", "NISN"],
  ["nik", "NIK"],
  ["nama", "Nama Lengkap"],
  ["tempatLahir", "Tempat Lahir"],
  ["tanggalLahir", "Tanggal Lahir"],
  ["umur", "Umur"],
  ["jenisKelamin", "Jenis Kelamin"],
  ["tingkatRombel", "Tingkat-Rombel"],
  ["status", "Status"],
  ["alamat", "Alamat"],
  ["kebutuhanKhusus", "Kebutuhan Khusus"],
  ["disabilitas", "Disabilitas"],
  ["ayahKandung", "Ayah Kandung"],
  ["ibuKandung", "Ibu Kandung"],
  ["wali", "Wali"],
];

export default function SiswaPage() {
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cari, setCari] = useState("");
  const [filterKelas, setFilterKelas] = useState("");

  const [bukaModal, setBukaModal] = useState(false);
  const [siswaDetail, setSiswaDetail] = useState<Siswa | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [idEdit, setIdEdit] = useState<string | null>(null);
  const [form, setForm] = useState<FormSiswa>(FORM_KOSONG);

  async function fetchSiswa() {
    setLoading(true);
    try {
      const response = await apiFetch("/api/siswa", { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok || !Array.isArray(data) || !data.every(isSiswa)) {
        throw new Error(getErrorMessage(data, "Gagal memuat data siswa."));
      }
      setDaftarSiswa(data.map(normalizeSiswa));
      setErrorMessage("");
    } catch (error) {
      console.error("Gagal memuat data siswa:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data siswa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(fetchSiswa);
  }, []);

  function handleBukaTambah() {
    setIsEdit(false);
    setIdEdit(null);
    setForm({ ...FORM_KOSONG });
    setBukaModal(true);
  }

  function handleBukaEdit(siswa: Siswa) {
    setIsEdit(true);
    setIdEdit(siswa.id);
    setForm(formDariSiswa(siswa));
    setBukaModal(true);
  }

  function updateField<K extends keyof FormSiswa>(field: K, value: FormSiswa[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSimpan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    try {
      const response = await apiFetch("/api/siswa", {
        method: isEdit && idEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit && idEdit ? { id: idEdit } : {}),
          nis: form.nis.trim(),
          nisn: form.nisn.trim() || null,
          nik: form.nik.trim() || null,
          nama: form.nama.trim(),
          tempatLahir: form.tempatLahir.trim() || null,
          tanggalLahir: form.tanggalLahir || null,
          tingkatRombel: form.tingkatRombel.trim(),
          umur: form.umur.trim() ? Number(form.umur) : null,
          jenisKelamin: form.jenisKelamin,
          status: form.status,
          alamat: form.alamat.trim() || null,
          kebutuhanKhusus: form.kebutuhanKhusus.trim() || null,
          disabilitas: form.disabilitas.trim() || null,
          ayahKandung: form.ayahKandung.trim() || null,
          ibuKandung: form.ibuKandung.trim() || null,
          wali: form.wali.trim() || null,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Gagal menyimpan data siswa."));
      }

      setBukaModal(false);
      await fetchSiswa();
    } catch (error) {
      console.error("Gagal menyimpan data siswa:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan data siswa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleHapus(id: string, namaSiswa: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data siswa ${namaSiswa}?`)) return;
    try {
      const response = await apiFetch(`/api/siswa?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Gagal menghapus data siswa."));
      }
      await fetchSiswa();
    } catch (error) {
      console.error("Gagal menghapus data siswa:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus data siswa.");
    }
  }

  const daftarKelas = [...new Set(daftarSiswa.map((siswa) => siswa.tingkatRombel))].sort();
  const siswaDisaring = daftarSiswa.filter((siswa) => {
    const kataKunci = cari.toLocaleLowerCase("id-ID");
    const cocokKataKunci = siswa.nama.toLocaleLowerCase("id-ID").includes(kataKunci) ||
      siswa.nis.toLocaleLowerCase("id-ID").includes(kataKunci) ||
      (siswa.nisn ?? "").includes(cari);
    return cocokKataKunci && (!filterKelas || siswa.tingkatRombel === filterKelas);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Siswa RA Sahid</h1>
          <p className="text-sm text-slate-500">Kelola identitas dan informasi lengkap siswa.</p>
        </div>
        <button
          type="button"
          onClick={handleBukaTambah}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          + Tambah Siswa Baru
        </button>
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {errorMessage}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Cari nama, NIS, atau NISN..."
            aria-label="Cari siswa"
            className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <select
            aria-label="Filter tingkat rombel"
            value={filterKelas}
            onChange={(event) => setFilterKelas(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Semua Tingkat-Rombel</option>
            {daftarKelas.map((kelas) => <option key={kelas} value={kelas}>{kelas}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Nama Lengkap</th>
                <th className="px-6 py-3 font-semibold">NISN</th>
                <th className="px-6 py-3 font-semibold">Tingkat-Rombel</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat data siswa...</td></tr>
              ) : siswaDisaring.length ? siswaDisaring.map((siswa) => (
                <tr key={siswa.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{siswa.nama}</td>
                  <td className="px-6 py-4">{siswa.nisn || "-"}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {siswa.tingkatRombel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      siswa.status === "Aktif" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {siswa.status}
                    </span>
                  </td>
                  <td className="space-x-2 px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSiswaDetail(siswa)}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBukaEdit(siswa)}
                      className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleHapus(siswa.id, siswa.nama)}
                      className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Tidak ada data siswa ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {siswaDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-siswa-heading"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="detail-siswa-heading" className="text-lg font-bold text-slate-900">Detail Siswa</h2>
                <p className="mt-1 text-sm text-slate-500">{siswaDetail.nama}</p>
              </div>
              <button type="button" onClick={() => setSiswaDetail(null)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Tutup
              </button>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {DETAIL_FIELDS.map(([field, label]) => {
                const value = siswaDetail[field];
                return (
                  <div key={field} className={field === "alamat" ? "sm:col-span-2" : ""}>
                    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">
                      {value === null || value === "" ? "-" : String(value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      )}

      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-siswa-heading"
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="form-siswa-heading" className="text-lg font-bold text-slate-900">
              {isEdit ? "Edit Data Siswa" : "Tambah Siswa Baru"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Lengkapi identitas, informasi keluarga, dan data pendukung siswa.</p>

            <form onSubmit={handleSimpan} className="mt-5 space-y-6">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-800">Identitas Siswa</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-700">
                    NIS *
                    <input required maxLength={50} value={form.nis} onChange={(event) => updateField("nis", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    NISN
                    <input inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.nisn} onChange={(event) => updateField("nisn", event.target.value)} placeholder="10 digit" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    NIK
                    <input inputMode="numeric" pattern="[0-9]{16}" maxLength={16} value={form.nik} onChange={(event) => updateField("nik", event.target.value)} placeholder="16 digit" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">
                    Nama Lengkap *
                    <input required maxLength={150} value={form.nama} onChange={(event) => updateField("nama", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Tempat Lahir
                    <input maxLength={100} value={form.tempatLahir} onChange={(event) => updateField("tempatLahir", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Tanggal Lahir
                    <input type="date" value={form.tanggalLahir} onChange={(event) => updateField("tanggalLahir", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Umur (tahun)
                    <input type="number" min="0" max="100" step="1" value={form.umur} onChange={(event) => updateField("umur", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Tingkat-Rombel *
                    <input required maxLength={50} value={form.tingkatRombel} onChange={(event) => updateField("tingkatRombel", event.target.value)} placeholder="Misalnya TK A" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Jenis Kelamin *
                    <select required value={form.jenisKelamin} onChange={(event) => updateField("jenisKelamin", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal">
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Status *
                    <select required value={form.status} onChange={(event) => updateField("status", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal">
                      {!["Aktif", "Lulus", "Keluar"].includes(form.status) && <option value={form.status}>{form.status}</option>}
                      <option value="Aktif">Aktif</option>
                      <option value="Lulus">Lulus</option>
                      <option value="Keluar">Keluar</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">
                    Alamat Domisili
                    <textarea rows={2} maxLength={2000} value={form.alamat} onChange={(event) => updateField("alamat", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-800">Informasi Pendukung dan Keluarga</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Kebutuhan Khusus
                    <textarea rows={2} maxLength={1000} value={form.kebutuhanKhusus} onChange={(event) => updateField("kebutuhanKhusus", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Disabilitas
                    <textarea rows={2} maxLength={1000} value={form.disabilitas} onChange={(event) => updateField("disabilitas", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Ayah Kandung
                    <input maxLength={150} value={form.ayahKandung} onChange={(event) => updateField("ayahKandung", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Ibu Kandung
                    <input maxLength={150} value={form.ibuKandung} onChange={(event) => updateField("ibuKandung", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                    Wali
                    <input maxLength={150} value={form.wali} onChange={(event) => updateField("wali", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />
                  </label>
                </div>
              </fieldset>

              {errorMessage && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setBukaModal(false)} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Siswa"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
