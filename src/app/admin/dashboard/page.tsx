
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

const warnaStatistik = [
  "bg-emerald-50 text-emerald-900 border-emerald-200",
  "bg-blue-50 text-blue-900 border-blue-200",
  "bg-purple-50 text-purple-900 border-purple-200",
  "bg-amber-50 text-amber-900 border-amber-200",
];

function tanggalISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function namaHari(tanggal: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${tanggal}T00:00:00.000Z`));
}

export default async function DashboardPage() {
  await connection();

  const hariIni = tanggalISO(new Date());

  const tanggalMulaiMinggu = new Date(
    `${hariIni}T00:00:00.000Z`
  );

  const selisihSenin =
    (tanggalMulaiMinggu.getUTCDay() + 6) % 7;

  tanggalMulaiMinggu.setUTCDate(
    tanggalMulaiMinggu.getUTCDate() - selisihSenin
  );

  const tanggalMulai = tanggalISO(tanggalMulaiMinggu);

  const tanggalAkhirMinggu = new Date(tanggalMulaiMinggu);

  tanggalAkhirMinggu.setUTCDate(
    tanggalAkhirMinggu.getUTCDate() + 6
  );

  const tanggalAkhir = tanggalISO(tanggalAkhirMinggu);

  const [
    jumlahSiswa,
    jumlahGuru,
    totalKas,
    absensiMingguan,
    absensiHariIni,
  ] = await Promise.all([
    prisma.siswa.count({
      where: { status: "Aktif" },
    }),

    prisma.guru.count(),

    prisma.keuangan.aggregate({
      where: { status: "Lunas" },
      _sum: { jumlah: true },
    }),

    prisma.absensi.groupBy({
      by: ["tanggal", "status"],
      where: {
        tanggal: {
          gte: tanggalMulai,
          lte: tanggalAkhir,
        },
      },
      _count: { _all: true },
    }),

    prisma.absensi.groupBy({
      by: ["status"],
      where: { tanggal: hariIni },
      _count: { _all: true },
    }),
  ]);

  const ringkasanHariIni = new Map(
    absensiHariIni.map((record) => [
      record.status.toLowerCase(),
      record._count._all,
    ])
  );

  const jumlahHadir = ringkasanHariIni.get("hadir") ?? 0;

  const persentaseHadir = jumlahSiswa
    ? Math.round((jumlahHadir / jumlahSiswa) * 100)
    : 0;

  const grafikAbsen = Array.from(
    { length: 5 },
    (_, index) => {
      const tanggal = new Date(tanggalMulaiMinggu);

      tanggal.setUTCDate(
        tanggal.getUTCDate() + index
      );

      const tanggalHari = tanggalISO(tanggal);

      const rekapHari = new Map(
        absensiMingguan
          .filter(
            (record) => record.tanggal === tanggalHari
          )
          .map((record) => [
            record.status.toLowerCase(),
            record._count._all,
          ])
      );

      return {
        hari: namaHari(tanggalHari),
        hadir: rekapHari.get("hadir") ?? 0,
        sakit: rekapHari.get("sakit") ?? 0,
        izin: rekapHari.get("izin") ?? 0,
      };
    }
  );

  const statistik = [
    {
      judul: "Total Siswa Aktif",
      jumlah: `${jumlahSiswa} Anak`,
      ket: "Siswa berstatus aktif",
    },
    {
      judul: "Guru Terdaftar",
      jumlah: `${jumlahGuru} Orang`,
      ket: "Seluruh guru terdaftar",
    },
    {
      judul: "Total Kas Terkumpul",
      jumlah: `Rp ${(totalKas._sum.jumlah ?? 0).toLocaleString("id-ID")}`,
      ket: "Transaksi berstatus lunas",
    },
    {
      judul: "Kehadiran Hari Ini",
      jumlah: `${persentaseHadir}%`,
      ket: `${jumlahHadir} hadir, ${
        ringkasanHariIni.get("sakit") ?? 0
      } sakit, ${
        ringkasanHariIni.get("izin") ?? 0
      } izin`,
    },
  ];

  return (
    <div className="space-y-6 bg-white text-slate-900">

      {/* BANNER SAMBUTAN */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 p-6 text-white shadow-sm">

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Selamat Datang, Admin & Guru RA Sahid
        </h1>

        <p className="mt-1 text-sm text-emerald-50">
          Kelola absensi harian, input nilai, dan E-Raport
          otomatis dengan lebih cepat dan efisien tanpa rekap manual.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">

          <Link
            href="/admin/absensi"
            className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-emerald-950 shadow-sm transition-colors hover:bg-emerald-100"
          >
            + Catat Absen Hari Ini
          </Link>

          <Link
            href="/admin/raport"
            className="rounded-lg border border-emerald-400 bg-emerald-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-950"
          >
            Lihat E-Raport Otomatis
          </Link>

        </div>
      </div>

      {/* KARTU STATISTIK */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {statistik.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >

            <p className="text-xs font-bold text-slate-700">
              {item.judul}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {item.jumlah}
            </p>

            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                warnaStatistik[index]
              }`}
            >
              {item.ket}
            </span>

          </div>
        ))}

      </div>

      {/* GRAFIK DAN MENU PINTASAN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* GRAFIK KEHADIRAN */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">

          <div className="flex items-center justify-between border-b border-slate-200 pb-3">

            <div>
              <h2 className="text-base font-bold text-slate-950">
                Grafik Kehadiran Siswa Minggu Ini
              </h2>

              <p className="text-xs text-slate-700">
                Akumulasi data dari modul Absensi Harian
              </p>
            </div>

            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">
              Real-time
            </span>

          </div>

          <div className="mt-6 space-y-4">

            {grafikAbsen.map((data, idx) => (
              <div key={idx} className="space-y-1">

                <div className="flex justify-between gap-2 text-xs font-bold text-slate-800">

                  <span>{data.hari}</span>

                  <span className="text-emerald-900 text-right">
                    {data.hadir} Hadir (Sakit: {data.sakit}, Izin: {data.izin})
                  </span>

                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">

                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{
                      width: `${
                        jumlahSiswa
                          ? Math.min(
                              100,
                              (data.hadir / jumlahSiswa) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>
            ))}

          </div>
        </div>

        {/* MENU PINTASAN */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <div>

            <h2 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-950">
              Menu Pintasan
            </h2>

            <div className="mt-4 space-y-3">

              <Link
                href="/admin/absensi"
                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-950">
                  📝 Absensi Harian
                </span>

                <span className="text-xs font-bold text-slate-700">
                  &rarr;
                </span>
              </Link>

              <Link
                href="/admin/nilai-harian"
                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-950">
                  📊 Input Nilai Harian
                </span>

                <span className="text-xs font-bold text-slate-700">
                  &rarr;
                </span>
              </Link>

              <Link
                href="/admin/raport"
                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-950">
                  🎓 E-Raport Otomatis
                </span>

                <span className="text-xs font-bold text-slate-700">
                  &rarr;
                </span>
              </Link>

            </div>
          </div>

          {/* STATUS SISTEM */}
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">

            <p className="text-xs font-bold text-emerald-950">
              Sistem Berjalan Normal 🚀
            </p>

            <p className="mt-0.5 text-[11px] font-medium text-emerald-900">
              Semua modul database dan UI terhubung otomatis.
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}
