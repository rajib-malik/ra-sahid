"use client";

import { useEffect, useState } from "react";
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
  if (!isStudent(value) || !isRecord(value)) return null;
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStudents() {
      try {
        const response = await apiFetch("/api/siswa", { cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok || !Array.isArray(result) || !result.every(isStudent)) {
          const message = typeof result === "object" && result !== null &&
            "error" in result && typeof result.error === "string"
            ? result.error
            : "Gagal memuat data siswa.";
          throw new Error(message);
        }
        setStudents(result.map(normalizeStudent).filter((student): student is Student => student !== null));
        setErrorMessage("");
      } catch (error) {
        console.error("Gagal memuat daftar siswa akademik:", error);
        setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data siswa.");
      } finally {
        setLoading(false);
      }
    }
    void Promise.resolve().then(loadStudents);
  }, []);

  const classes = [...new Set(students.map((student) => student.kelas))].sort();
  const filteredStudents = students.filter((student) => kelas === "Semua" || student.kelas === kelas);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Akademik Siswa</h1>
          <p className="text-sm text-slate-500">Daftar siswa dan kelompok belajar tersinkron dengan data induk.</p>
        </div>
        <select aria-label="Filter kelas" value={kelas} onChange={(event) => setKelas(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="Semua">Semua Kelas</option>
          {classes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      {errorMessage && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">NIS</th>
                <th className="px-6 py-3 font-semibold">Nama Siswa</th>
                <th className="px-6 py-3 font-semibold">Kelas</th>
                <th className="px-6 py-3 font-semibold">Jenis Kelamin</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat data siswa...</td></tr>
              ) : filteredStudents.length ? filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 font-medium">{student.nis}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{student.nama}</td>
                  <td className="px-6 py-4">{student.kelas}</td>
                  <td className="px-6 py-4">{student.jk}</td>
                  <td className="px-6 py-4">{student.status}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Tidak ada siswa untuk ditampilkan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
