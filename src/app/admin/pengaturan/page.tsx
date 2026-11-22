"use client";

import { useState } from "react";

export default function PengaturanPage() {
  // State untuk data profil sekolah & tahun ajaran (dummy awal)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfil({ ...profil, [name]: value });
  };

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    setPesanSimpan(true);
    setTimeout(() => setPesanSimpan(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengaturan & Profil Lembaga</h1>
        <p className="text-sm text-slate-500">Kelola identitas resmi RA Sahid, kepala madrasah, dan tahun akademik sistem.</p>
      </div>

      {/* Notifikasi Berhasil */}
      {pesanSimpan && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 shadow-sm">
          ✨ Pengaturan profil sekolah dan tahun ajaran berhasil diperbarui!
        </div>
      )}

      {/* Form Pengaturan */}
      <form onSubmit={handleSimpan} className="space-y-6">
        
        {/* Bagian 1: Identitas Lembaga */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">1. Identitas RA Sahid</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Nama Lembaga / Madrasah</label>
              <input 
                type="text"
                name="namaSekolah"
                value={profil.namaSekolah}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">NPSN / Nomor Statistik</label>
              <input 
                type="text"
                name="npsn"
                value={profil.npsn}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Alamat Lengkap</label>
            <input 
              type="text"
              name="alamat"
              value={profil.alamat}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Nomor Telepon</label>
              <input 
                type="text"
                name="telepon"
                value={profil.telepon}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Resmi</label>
              <input 
                type="email"
                name="email"
                value={profil.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bagian 2: Kepala Madrasah */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">2. Pimpinan & Penandatangan Raport</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Nama Kepala Madrasah & Gelar</label>
              <input 
                type="text"
                name="kepalaSekolah"
                value={profil.kepalaSekolah}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">NIP / ID Kepala Madrasah</label>
              <input 
                type="text"
                name="nipKepala"
                value={profil.nipKepala}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Bagian 3: Tahun Ajaran & Semester */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">3. Tahun Akademik Aktif</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tahun Ajaran</label>
              <input 
                type="text"
                name="tahunAjaran"
                value={profil.tahunAjaran}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Semester Aktif</label>
              <select
                name="semesterAktif"
                value={profil.semesterAktif}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Semester 1 (Ganjil)">Semester 1 (Ganjil)</option>
                <option value="Semester 2 (Genap)">Semester 2 (Genap)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors"
          >
            Simpan Pengaturan Lembaga
          </button>
        </div>
      </form>
    </div>
  );
}