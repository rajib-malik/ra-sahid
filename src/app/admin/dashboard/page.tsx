import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

const warnaStatistik = [
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-blue-50 text-blue-700 border-blue-100",
  "bg-purple-50 text-purple-700 border-purple-100",
  "bg-amber-50 text-amber-700 border-amber-100",
];

function tanggalISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function namaHari(tanggal: string) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" })
    .format(new Date(`${tanggal}T00:00:00.000Z`));
}

export default async function DashboardPage() {
  await connection();
  const hariIni = tanggalISO(new Date());
  const tanggalMulaiMinggu = new Date(`${hariIni}T00:00:00.000Z`);
  const selisihSenin = (tanggalMulaiMinggu.getUTCDay() + 6) % 7;
  tanggalMulaiMinggu.setUTCDate(tanggalMulaiMinggu.getUTCDate() - selisihSenin);
  const tanggalMulai = tanggalISO(tanggalMulaiMinggu);
  const tanggalAkhirMinggu = new Date(tanggalMulaiMinggu);
  tanggalAkhirMinggu.setUTCDate(tanggalAkhirMinggu.getUTCDate() + 6);
  const tanggalAkhir = tanggalISO(tanggalAkhirMinggu);

  const [jumlahSiswa, jumlahGuru, totalKas, absensiMingguan, absensiHariIni] = await Promise.all([
    prisma.siswa.count({ where: { status: "Aktif" } }),
    prisma.guru.count(),
    prisma.keuangan.aggregate({
      where: { status: "Lunas" },
      _sum: { jumlah: true },
    }),
    prisma.absensi.groupBy({
      by: ["tanggal", "status"],
      where: { tanggal: { gte: tanggalMulai, lte: tanggalAkhir } },
      _count: { _all: true },
    }),
    prisma.absensi.groupBy({
      by: ["status"],
      where: { tanggal: hariIni },
      _count: { _all: true },
    }),
  ]);

  const ringkasanHariIni = new Map(absensiHariIni.map((record) => [record.status.toLowerCase(), record._count._all]));
  const jumlahHadir = ringkasanHariIni.get("hadir") ?? 0;
  const persentaseHadir = jumlahSiswa ? Math.round((jumlahHadir / jumlahSiswa) * 100) : 0;
  const grafikAbsen = Array.from({ length: 5 }, (_, index) => {
    const tanggal = new Date(tanggalMulaiMinggu);
    tanggal.setUTCDate(tanggal.getUTCDate() + index);
    const tanggalHari = tanggalISO(tanggal);
    const rekapHari = new Map(
      absensiMingguan
        .filter((record) => record.tanggal === tanggalHari)
        .map((record) => [record.status.toLowerCase(), record._count._all]),
    );
    return {
      hari: namaHari(tanggalHari),
      hadir: rekapHari.get("hadir") ?? 0,
      sakit: rekapHari.get("sakit") ?? 0,
      izin: rekapHari.get("izin") ?? 0,
    };
  });

  const statistik = [
    { judul: "Total Siswa Aktif", jumlah: `${jumlahSiswa} Anak`, ket: "Siswa berstatus aktif" },
    { judul: "Guru Terdaftar", jumlah: `${jumlahGuru} Orang`, ket: "Seluruh guru terdaftar" },
    { judul: "Total Kas Terkumpul", jumlah: `Rp ${(totalKas._sum.jumlah ?? 0).toLocaleString("id-ID")}`, ket: "Transaksi berstatus lunas" },
    { judul: "Kehadiran Hari Ini", jumlah: `${persentaseHadir}%`, ket: `${jumlahHadir} hadir, ${ringkasanHariIni.get("sakit") ?? 0} sakit, ${ringkasanHariIni.get("izin") ?? 0} izin` },
  ];

  return (
    <div className="space-y-6">
      {/* Banner Sambutan */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-600 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Selamat Datang, Admin & Guru RA Sahid</h1>
        <p className="mt-1 text-sm text-emerald-100">
          Kelola absensi harian, input nilai, dan E-Raport otomatis dengan lebih cepat dan efisien tanpa rekap manual.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link 
            href="/admin/absensi" 
            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-sm"
          >
            + Catat Absen Hari Ini
          </Link>
          <Link 
            href="/admin/raport" 
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-750 transition-colors border border-emerald-500"
          >
            Lihat E-Raport Otomatis
          </Link>
        </div>
      </div>

      {/* Kartu Statistik Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statistik.map((item, index) => (
          <div key={index} className={`rounded-xl border p-5 shadow-sm bg-white`}>
            <p className="text-xs font-semibold text-slate-500">{item.judul}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{item.jumlah}</p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${warnaStatistik[index]}`}>
              {item.ket}
            </span>
          </div>
        ))}
      </div>

      {/* Bagian Grafik & Aktivitas Cepat */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Grafik Kehadiran Siswa Minggu Ini</h2>
              <p className="text-xs text-slate-500">Akumulasi data dari modul Absensi Harian</p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Real-time</span>
          </div>

          <div className="mt-6 space-y-4">
            {grafikAbsen.map((data, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{data.hari}</span>
                  <span className="text-emerald-700">{data.hadir} Hadir (Sakit: {data.sakit}, Izin: {data.izin})</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full bg-emerald-600 transition-all duration-500" 
                    style={{ width: `${jumlahSiswa ? Math.min(100, (data.hadir / jumlahSiswa) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Pintasan Cepat */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Menu Pintasan</h2>
            <div className="mt-4 space-y-3">
              <Link href="/admin/absensi" className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-emerald-50 transition-colors group">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-800">📝 Absensi Harian</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </Link>
              <Link href="/admin/nilai-harian" className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-emerald-50 transition-colors group">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-800">📊 Input Nilai Harian</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </Link>
              <Link href="/admin/raport" className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-emerald-50 transition-colors group">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-800">🎓 E-Raport Otomatis</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </Link>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-emerald-50 p-3 border border-emerald-100 text-center">
            <p className="text-xs font-semibold text-emerald-800">Sistem Berjalan Normal 🚀</p>
            <p className="mt-0.5 text-[11px] text-emerald-600">Semua modul database dan UI terhubung otomatis.</p>
          </div>
        </div>

      </div>
    </div>
  );
}