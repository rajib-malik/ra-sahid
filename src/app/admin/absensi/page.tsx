
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

type Student = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  status: string;
};

type Attendance = {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  tanggal: string;
  status: string;
  keterangan: string | null;
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
    isValidIdentifier(value.nis) &&
    isValidIdentifier(value.nama)
  );
}

function normalizeStudent(value: unknown): Student | null {
  if (!isStudent(value) || !isRecord(value)) return null;

  const nis = text(value.nis);

  return {
    id: text(value.id, nis),
    nis,
    nama: text(value.nama),
    kelas: text(value.tingkatRombel, text(value.kelas)),
    status: text(value.status, "Aktif"),
  };
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";

  const date = value.trim();
  const dateOnlyMatch = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(date);

  if (dateOnlyMatch) {
    const parsedDate = new Date(`${dateOnlyMatch[1]}T00:00:00.000Z`);

    return !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === dateOnlyMatch[1]
      ? dateOnlyMatch[1]
      : "";
  }

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

function isAttendance(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    (
      isValidIdentifier(value.id) ||
      isValidIdentifier(value.nis) ||
      isValidIdentifier(value.tanggal)
    )
  );
}

function normalizeAttendance(
  value: unknown,
  fallback?: { student: Student; tanggal: string; status: string }
): Attendance | null {
  if (!isAttendance(value) || !isRecord(value)) return null;

  const nis = text(value.nis, fallback?.student.nis);
  const tanggal = normalizeDate(value.tanggal) || fallback?.tanggal || "";
  const nama = text(value.nama, fallback?.student.nama);

  if (!nis || !nama) return null;

  return {
    id: text(value.id, `${nis}-${tanggal || "tanpa-tanggal"}`),
    nis,
    nama,
    kelas: text(
      value.tingkatRombel,
      text(value.kelas, fallback?.student.kelas)
    ),
    tanggal,
    status: text(value.status, fallback?.status ?? "Tidak diketahui"),
    keterangan: text(value.keterangan) || null,
  };
}

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

export default function AbsensiPage() {
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [daftarSiswa, setDaftarSiswa] = useState<Student[]>([]);
  const [daftarAbsensi, setDaftarAbsensi] = useState<Attendance[]>([]);
  const [nisDipilih, setNisDipilih] = useState("");
  const [status, setStatus] = useState("Hadir");
  const [keterangan, setKeterangan] = useState("");
  const [pilihKelas, setPilihKelas] = useState("Semua");
  const [pesanSimpan, setPesanSimpan] = useState("");
  const [pesanError, setPesanError] = useState("");
  const [cariSiswa, setCariSiswa] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const requestId = useRef(0);

  const muatData = useCallback(async () => {
    const currentRequestId = ++requestId.current;

    setMemuat(true);

    try {
      async function loadJson(url: string, fallback: string) {
        try {
          const response = await apiFetch(url, {
            cache: "no-store",
          });

          const result: unknown = await response.json().catch(() => null);

          if (!response.ok) {
            return {
              data: [],
              error: getErrorMessage(result, fallback),
            };
          }

          if (!Array.isArray(result)) {
            return {
              data: [],
              error: fallback,
            };
          }

          return {
            data: result,
            error: "",
          };
        } catch (error) {
          return {
            data: [],
            error:
              error instanceof Error
                ? `${fallback} ${error.message}`
                : fallback,
          };
        }
      }

      const [studentsResult, attendanceResult] = await Promise.all([
        loadJson("/api/siswa", "Gagal memuat daftar siswa."),
        loadJson(
          `/api/absensi?tanggal=${encodeURIComponent(tanggal)}`,
          "Gagal memuat data absensi."
        ),
      ]);

      const normalizedStudents = studentsResult.data
        .map(normalizeStudent)
        .filter((student): student is Student => student !== null)
        .filter(
          (student) => student.status.trim().toLowerCase() === "aktif"
        );

      const normalizedAttendance = attendanceResult.data
        .map((record: unknown) => normalizeAttendance(record))
        .filter(
          (record): record is Attendance => record !== null
        );

      if (requestId.current !== currentRequestId) return;

      setDaftarSiswa(normalizedStudents);
      setDaftarAbsensi(normalizedAttendance);

      const recordedNis = new Set(
        normalizedAttendance.map((record) => record.nis)
      );

      const eligibleStudents = normalizedStudents.filter(
        (student) => !recordedNis.has(student.nis)
      );

      setNisDipilih((current) =>
        eligibleStudents.some((student) => student.nis === current)
          ? current
          : eligibleStudents[0]?.nis ?? ""
      );

      const errors = [
        studentsResult.error,
        attendanceResult.error,
      ].filter(Boolean);

      if (errors.length) {
        setPesanError(
          `Sebagian data absensi belum dapat dimuat. ${errors.join(" ")}`
        );
      } else {
        setPesanError("");
      }
    } catch {
      if (requestId.current !== currentRequestId) return;

      setDaftarSiswa([]);
      setDaftarAbsensi([]);
      setNisDipilih("");
      setPesanError(
        "Data absensi belum dapat dimuat. Silakan coba lagi."
      );
    } finally {
      if (requestId.current === currentRequestId) {
        setMemuat(false);
      }
    }
  }, [tanggal]);

  useEffect(() => {
    void Promise.resolve().then(muatData);
  }, [muatData]);

  const recordedNis = new Set(
    daftarAbsensi.map((record) => record.nis)
  );

  const siswaBelumDiabsen = daftarSiswa.filter(
    (student) => !recordedNis.has(student.nis)
  );

  const siswaDipilih = siswaBelumDiabsen.find(
    (student) => student.nis === nisDipilih
  );

  const daftarKelas = [
    ...new Set(daftarSiswa.map((student) => student.kelas)),
  ].sort();

  const absensiDisaring = daftarAbsensi.filter((record) => {
    const keyword = cariSiswa.trim().toLowerCase();

    const cocokPencarian =
      record.nama.toLowerCase().includes(keyword) ||
      record.nis.toLowerCase().includes(keyword);

    const cocokKelas =
      pilihKelas === "Semua" || record.kelas === pilihKelas;

    return cocokPencarian && cocokKelas;
  });

  async function handleSimpan(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!siswaDipilih) {
      setPesanError("Pilih siswa yang terdaftar terlebih dahulu.");
      return;
    }

    setMenyimpan(true);
    setPesanError("");
    setPesanSimpan("");

    try {
      const response = await apiFetch("/api/absensi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nis: siswaDipilih.nis,
          tanggal,
          status,
          keterangan,
        }),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menyimpan data absensi.")
        );
      }

      const attendance = normalizeAttendance(result, {
        student: siswaDipilih,
        tanggal,
        status,
      });

      if (!attendance) {
        throw new Error("Format data absensi tidak valid.");
      }

      setPesanSimpan(
        `Absensi ${attendance.nama} berhasil disimpan.`
      );

      setKeterangan("");
      await muatData();
    } catch (error) {
      console.error("Gagal menyimpan data absensi:", error);

      setPesanError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan data absensi."
      );
    } finally {
      setMenyimpan(false);
    }
  }

  const tanggalLabel = new Date(
    `${tanggal}T00:00:00`
  ).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-1 text-slate-900 sm:p-3">

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Absensi Siswa Harian
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Pencatatan kehadiran murid RA Sahid tanggal {tanggalLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
            Tanggal

            <input
              aria-label="Tanggal absensi"
              type="date"
              value={tanggal}
              onChange={(event) => setTanggal(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <select
            aria-label="Filter kelas"
            value={pilihKelas}
            onChange={(event) => setPilihKelas(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="Semua">Semua Kelas</option>

            {daftarKelas.map((kelas) => (
              <option key={kelas} value={kelas}>
                {kelas}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifikasi */}
      {pesanSimpan && (
        <p
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
        >
          {pesanSimpan}
        </p>
      )}

      {pesanError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900"
        >
          {pesanError}
        </p>
      )}

      {!memuat && siswaBelumDiabsen.length === 0 && (
        <p
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          Semua siswa aktif sudah memiliki absensi untuk tanggal ini.
        </p>
      )}

      {/* Form Input Absensi */}
      <form
        onSubmit={handleSimpan}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="lg:col-span-2">
          <label
            htmlFor="siswa-absensi"
            className="block text-sm font-bold text-slate-900"
          >
            Pilih Siswa
          </label>

          <select
            id="siswa-absensi"
            value={nisDipilih}
            onChange={(event) => setNisDipilih(event.target.value)}
            disabled={memuat || siswaBelumDiabsen.length === 0}
            required
            className={inputClass}
          >
            <option value="">
              {memuat
                ? "Memuat daftar siswa..."
                : siswaBelumDiabsen.length === 0
                  ? "Semua siswa sudah diabsen"
                  : "Pilih siswa"}
            </option>

            {siswaBelumDiabsen.map((student) => (
              <option key={student.nis} value={student.nis}>
                {student.nis} — {student.nama} ({student.kelas})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status-absensi"
            className="block text-sm font-bold text-slate-900"
          >
            Status Kehadiran
          </label>

          <select
            id="status-absensi"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
            <option>Hadir</option>
            <option>Sakit</option>
            <option>Izin</option>
            <option>Alpa</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="keterangan-absensi"
            className="block text-sm font-bold text-slate-900"
          >
            Keterangan (opsional)
          </label>

          <input
            id="keterangan-absensi"
            value={keterangan}
            onChange={(event) => setKeterangan(event.target.value)}
            placeholder="Masukkan keterangan..."
            className={inputClass}
          />
        </div>

        <div className="flex justify-end sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={
              memuat ||
              menyimpan ||
              siswaBelumDiabsen.length === 0
            }
            className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {menyimpan ? "Menyimpan..." : "Simpan Absensi"}
          </button>
        </div>
      </form>

      {/* Pencarian Riwayat Absensi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Riwayat Absensi
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-700">
              Cari berdasarkan nama atau NIS siswa.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />

            <input
              type="text"
              value={cariSiswa}
              onChange={(event) => setCariSiswa(event.target.value)}
              placeholder="Cari nama atau NIS siswa..."
              aria-label="Cari nama atau NIS pada riwayat absensi"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            {cariSiswa && (
              <button
                type="button"
                onClick={() => setCariSiswa("")}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-700 transition hover:bg-slate-100 hover:text-rose-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <p className="text-sm font-medium text-slate-700">
            Menampilkan{" "}
            <span className="font-bold text-emerald-900">
              {memuat ? 0 : absensiDisaring.length}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-slate-900">
              {daftarAbsensi.length}
            </span>{" "}
            data absensi
          </p>

          {(cariSiswa || pilihKelas !== "Semua") && (
            <button
              type="button"
              onClick={() => {
                setCariSiswa("");
                setPilihKelas("Semua");
              }}
              className="text-sm font-bold text-rose-800 transition hover:text-rose-950"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel Riwayat Absensi */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">

            <thead className="border-b border-slate-300 bg-slate-100 text-slate-900">
              <tr>
                <th className="px-6 py-4 font-bold">NIS</th>
                <th className="px-6 py-4 font-bold">Nama Siswa</th>
                <th className="px-6 py-4 font-bold">Kelas</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Keterangan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-900">
              {memuat ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center font-semibold text-slate-700"
                  >
                    Memuat data absensi...
                  </td>
                </tr>
              ) : absensiDisaring.length ? (
                absensiDisaring.map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-emerald-50/50"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {record.nis}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-950">
                      {record.nama}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-800">
                      {record.kelas}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          record.status.toLowerCase() === "hadir"
                            ? "bg-emerald-100 text-emerald-900"
                            : record.status.toLowerCase() === "sakit"
                              ? "bg-amber-100 text-amber-900"
                              : record.status.toLowerCase() === "izin"
                                ? "bg-blue-100 text-blue-900"
                                : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-800">
                      {record.keterangan || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-7 w-7 text-slate-500" />

                      <p className="font-bold text-slate-800">
                        {daftarAbsensi.length === 0
                          ? "Belum ada absensi untuk tanggal ini."
                          : "Data absensi tidak ditemukan."}
                      </p>

                      <p className="text-xs font-medium text-slate-600">
                        Coba ubah kata kunci pencarian atau filter kelas.
                      </p>

                      {(cariSiswa || pilihKelas !== "Semua") && (
                        <button
                          type="button"
                          onClick={() => {
                            setCariSiswa("");
                            setPilihKelas("Semua");
                          }}
                          className="mt-1 text-sm font-bold text-emerald-900 hover:text-emerald-950"
                        >
                          Tampilkan Semua Data
                        </button>
                      )}
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
