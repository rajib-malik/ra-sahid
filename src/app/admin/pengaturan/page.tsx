
"use client";

import { useState } from "react";

export default function PengaturanPage() {
  const [profil, setProfil] = useState({
    namaSekolah: "RA Sahid",
    npsn: "69988771",
    alamat: "Jl. Letjen Ibrahim Adjie No. 45, Ciampea, Bogor, Jawa Barat",
    telepon: "(0251) 8621122",
    email: "admin@rasahid.sch.id",
    kepalaSekolah: "Hj. Siti Aminah, S.Pd",
    nipKepala: "198501012010012001",
    tahunAjaran: "2026/2027",
    semesterAktif: "Semester 1 (Ganjil)",
  });

  const [pesanSimpan, setPesanSimpan] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfil({ ...profil, [name]: value });
  };

  const handleSimpan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPesanSimpan(true);
    setTimeout(() => setPesanSimpan(false), 4000);
  };

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const labelClass = "block text-xs font-semibold text-slate-800";

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-slate-900">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pengaturan & Profil Lembaga
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola identitas resmi RA Sahid, kepala madrasah, dan tahun akademik sistem.
        </p>
      </div>

      {/* Notifikasi Berhasil */}
      {pesanSimpan && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          ✨ Pengaturan profil sekolah dan tahun ajaran berhasil diperbarui!
        </div>
      )}

      {/* Form Pengaturan */}
      <form onSubmit={handleSimpan} className="space-y-6">
        {/* Bagian 1: Identitas Lembaga */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
            1. Identitas RA Sahid
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="namaSekolah" className={labelClass}>
                Nama Lembaga / Madrasah
              </label>
              <input
                id="namaSekolah"
                type="text"
                name="namaSekolah"
                value={profil.namaSekolah}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="npsn" className={labelClass}>
                NPSN / Nomor Statistik
              </label>
              <input
                id="npsn"
                type="text"
                name="npsn"
                value={profil.npsn}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="alamat" className={labelClass}>
              Alamat Lengkap
            </label>
            <input
              id="alamat"
              type="text"
              name="alamat"
              value={profil.alamat}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="telepon" className={labelClass}>
                Nomor Telepon
              </label>
              <input
                id="telepon"
                type="text"
                name="telepon"
                value={profil.telepon}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email Resmi
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={profil.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Bagian 2: Kepala Madrasah */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
            2. Pimpinan & Penandatangan Raport
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kepalaSekolah" className={labelClass}>
                Nama Kepala Madrasah & Gelar
              </label>
              <input
                id="kepalaSekolah"
                type="text"
                name="kepalaSekolah"
                value={profil.kepalaSekolah}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="nipKepala" className={labelClass}>
                NIP / ID Kepala Madrasah
              </label>
              <input
                id="nipKepala"
                type="text"
                name="nipKepala"
                value={profil.nipKepala}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>
        </section>

        {/* Bagian 3: Tahun Ajaran & Semester */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
            3. Tahun Akademik Aktif
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tahunAjaran" className={labelClass}>
                Tahun Ajaran
              </label>
              <input
                id="tahunAjaran"
                type="text"
                name="tahunAjaran"
                value={profil.tahunAjaran}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="semesterAktif" className={labelClass}>
                Semester Aktif
              </label>
              <select
                id="semesterAktif"
                name="semesterAktif"
                value={profil.semesterAktif}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Semester 1 (Ganjil)">
                  Semester 1 (Ganjil)
                </option>
                <option value="Semester 2 (Genap)">
                  Semester 2 (Genap)
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* Tombol Simpan */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Simpan Pengaturan Lembaga
          </button>
        </div>
      </form>
    </div>
  );
}
