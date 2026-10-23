"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Lock,
  BookOpen,
  FileText,
  Calendar,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Images,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const schoolGallery = [
  {
    title: "Pembelajaran Siswa Siswi",
    category: "Pembelajaran",
    image: "/images/sekolah-1.jpeg",
  },
  {
    title: "Area Sekolah",
    category: "Sekolah",
    image: "/images/sekolah-2.jpeg",
  },
  {
    title: "Aktivitas Siswa",
    category: "Kegiatan",
    image: "/images/sekolah-3.jpeg",
  },
  {
    title: "Kegiatan Kreatif",
    category: "Kreativitas",
    image: "/images/sekolah-4.jpeg",
  },
  {
    title: "Ruang Kelas",
    category: "Kelas",
    image: "/images/sekolah-5.jpeg",
  },
  {
    title: "Ruang Guru",
    category: "Kantor",
    image: "/images/sekolah-6.jpeg",
  },
];

function SchoolGallery() {
  const [activeImage, setActiveImage] = useState<number | null>(null);

  const previousImage = () => {
    if (activeImage !== null) {
      setActiveImage(
        (activeImage - 1 + schoolGallery.length) %
          schoolGallery.length
      );
    }
  };

  const nextImage = () => {
    if (activeImage !== null) {
      setActiveImage(
        (activeImage + 1) % schoolGallery.length
      );
    }
  };

  return (
    <section id="galeri" className="mt-24 scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
            Cerita dari Sekolah
          </span>

          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Galeri RA Sahid
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Dokumentasi lingkungan, pembelajaran, dan berbagai
            kegiatan yang menghadirkan pengalaman belajar
            menyenangkan bagi siswa.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <Images className="h-5 w-5" />
          <span>{schoolGallery.length} Dokumentasi</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {schoolGallery.map((item, index) => (
          <button
            key={item.image}
            type="button"
            onClick={() => setActiveImage(index)}
            aria-label={`Lihat foto ${item.title}`}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-90" />

              <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 backdrop-blur">
                {item.category}
              </span>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
                <div>
                  <h3 className="text-lg font-bold">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/80">
                    Dokumentasi RA Sahid
                  </p>
                </div>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-emerald-700">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeImage !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto galeri"
        >
          <button
            type="button"
            aria-label="Tutup galeri"
            className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            onClick={() => setActiveImage(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            aria-label="Foto sebelumnya"
            className="absolute left-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:left-8"
            onClick={(event) => {
              event.stopPropagation();
              previousImage();
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            className="w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={schoolGallery[activeImage].image}
              alt={schoolGallery[activeImage].title}
              className="mx-auto max-h-[75vh] w-full rounded-xl object-contain"
            />

            <div className="mt-4 text-center text-white">
              <h3 className="text-lg font-bold">
                {schoolGallery[activeImage].title}
              </h3>

              <p className="mt-1 text-sm text-white/70">
                {activeImage + 1} dari {schoolGallery.length} foto
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Foto berikutnya"
            className="absolute right-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-8"
            onClick={(event) => {
              event.stopPropagation();
              nextImage();
            }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </section>
  );
}

export default function TeacherPortalHome() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-white text-slate-800 selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-600/20">
              RA
            </div>

            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                RA Sahid
              </h1>
              <p className="text-xs text-slate-500">
                Portal Resmi Guru &amp; Staf Pengajar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 md:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Sistem Internal Aktif
            </span>

            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5"
            >
              <Lock className="h-3.5 w-3.5" />
              Login Staf
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex-grow px-6 py-12 md:py-20">
        {/* Hero Section */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
              <ShieldAlert className="h-4 w-4 text-emerald-600" />
              <span>
                Area Terbatas — Khusus Guru &amp; Administrator RA Sahid
              </span>
            </div>

            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Pusat Kendali Akademik &amp;{" "}
              <span className="text-emerald-600">
                E-Raport Terpadu
              </span>
            </h2>

            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              Selamat datang di sistem informasi manajemen internal.
              Kelola absensi harian, input penilaian perkembangan siswa,
              rekapitulasi keuangan, hingga laporan mutakhir secara
              real-time dan terstruktur.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Masuk ke Dasbor Guru
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#galeri"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <Images className="h-4 w-4" />
                Lihat Galeri
              </a>
            </div>
          </div>

          {/* Informasi Akademik */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Informasi Akademik
                </h3>

                <span className="text-xs font-medium text-slate-500">
                  Semester Genap
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-600">
                    Penting
                  </span>

                  <h4 className="mt-1 text-sm font-semibold text-slate-900">
                    Batas Pengisian Penilaian E-Raport
                  </h4>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Pastikan seluruh rekapitulasi nilai harian siswa
                    telah diunggah sebelum akhir pekan.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-600">
                    Rapat Koordinasi
                  </span>

                  <h4 className="mt-1 text-sm font-semibold text-slate-900">
                    Evaluasi Bulanan Dewan Guru
                  </h4>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Dilaksanakan secara hybrid melalui portal
                    pemantauan Kepala Sekolah.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fitur Modul */}
        <section
          id="fitur"
          className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-5 w-5" />
            </div>

            <h4 className="text-base font-bold text-slate-900">
              Data &amp; Absensi Siswa
            </h4>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Pencatatan status keaktifan, NIS, dan presensi harian
              siswa secara terpusat.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>

            <h4 className="text-base font-bold text-slate-900">
              E-Raport Otomatis
            </h4>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Modul penilaian perkembangan anak yang langsung
              terintegrasi dengan laporan akhir.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>

            <h4 className="text-base font-bold text-slate-900">
              Portal Kepala Sekolah
            </h4>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Akses monitoring khusus pimpinan untuk melihat
              rekapitulasi operasional sekolah.
            </p>
          </div>
        </section>

        {/* Galeri Sekolah */}
        <SchoolGallery />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-6 py-6 text-center text-xs text-slate-500">
        <p>
          &copy; 2026 RA Sahid. Sistem Informasi Manajemen
          Internal Guru &amp; Staf.
        </p>
      </footer>
    </div>
  );
}
