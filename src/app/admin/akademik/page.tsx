
"use client";

import { useEffect, useState } from "react";
import { Search, X, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

type Student = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jk: string;
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
    jk: text(value.jenisKelamin, text(value.jk)),
    status: text(value.status, "Aktif"),
  };
}

export default function AkademikPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [kelas, setKelas] = useState("Semua");
  const [cariNama, setCariNama] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Memuat data siswa dari API
  useEffect(() => {
    async function loadStudents() {
      try {
        const response = await apiFetch("/api/siswa", {
          cache: "no-store",
        });

        const result: unknown = await response.json();

        if (!response.ok || !Array.isArray(result)) {
          const message =
            isRecord(result) && typeof result.error === "string"
              ? result.error
              : "Gagal memuat data siswa.";

          throw new Error(message);
        }

        const normalizedStudents = result
          .filter(isStudent)
          .map(normalizeStudent)
          .filter((student): student is Student => student !== null);

        setStudents(normalizedStudents);
        setErrorMessage("");
      } catch (error) {
        console.error("Gagal memuat daftar siswa akademik:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat data siswa."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadStudents();
  }, []);

  // Daftar kelas otomatis dari data siswa
  const classes = [
    ...new Set(
      students
        .map((student) => student.kelas)
        .filter((item) => item.trim() !== "")
    ),
  ].sort();

  // Filter berdasarkan nama, NIS, dan kelas
  const filteredStudents = students.filter((student) => {
    const keyword = cariNama.trim().toLowerCase();

    const cocokPencarian =
      student.nama.toLowerCase().includes(keyword) ||
      student.nis.toLowerCase().includes(keyword);

    const cocokKelas =
      kelas === "Semua" || student.kelas === kelas;

    return cocokPencarian && cocokKelas;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Akademik Siswa
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Daftar siswa dan kelompok belajar tersinkron dengan data induk.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <Users className="h-5 w-5" />
          <span className="font-semibold">
            {loading ? "Memuat..." : `${students.length} Total Siswa`}
          </span>
        </div>
      </div>

      {/* Search Bar dan Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          {/* Search Bar */}
          <div className="relative w-full md:max-w-md">

            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={cariNama}
              onChange={(event) => setCariNama(event.target.value)}
              placeholder="Cari nama atau NIS siswa..."
              aria-label="Cari nama atau NIS siswa"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />

            {cariNama && (
              <button
                type="button"
                onClick={() => setCariNama("")}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-rose-500"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filter Kelas */}
          <div className="w-full md:w-56">
            <select
              aria-label="Filter kelas"
              value={kelas}
              onChange={(event) => setKelas(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="Semua">Semua Kelas</option>

              {classes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Informasi hasil pencarian */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Menampilkan{" "}
            <span className="font-semibold text-emerald-700">
              {loading ? 0 : filteredStudents.length}
            </span>{" "}
            dari {students.length} siswa
          </p>

          {(cariNama || kelas !== "Semua") && (
            <button
              type="button"
              onClick={() => {
                setCariNama("");
                setKelas("Semua");
              }}
              className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Pesan Error */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Tabel Data Siswa */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">

            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">NIS</th>
                <th className="px-6 py-4 font-semibold">Nama Siswa</th>
                <th className="px-6 py-4 font-semibold">Kelas</th>
                <th className="px-6 py-4 font-semibold">Jenis Kelamin</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-700">

              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    Memuat data siswa...
                  </td>
                </tr>

              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="transition-colors hover:bg-emerald-50/40"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-600">
                      {student.nis}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {student.nama}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {student.kelas || "-"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      {student.jk || "-"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          student.status.toLowerCase() === "aktif"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))

              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-slate-300" />

                      <p className="font-semibold text-slate-600">
                        Siswa tidak ditemukan
                      </p>

                      <p className="text-xs text-slate-400">
                        Coba periksa kembali nama, NIS, atau filter kelas.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setCariNama("");
                          setKelas("Semua");
                        }}
                        className="mt-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Tampilkan Semua Siswa
                      </button>
                    </div>
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
