import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

function tanggalISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.DASHBOARD_READ, request);
  if (authorization.response) return authorization.response;

  const hariIni = tanggalISO(new Date());
  const awalBulan = `${hariIni.slice(0, 7)}-01`;

  try {
    const [
      jumlahSiswaAktif,
      jumlahGuru,
      totalKas,
      jumlahPembayaranLunas,
      jumlahPembayaranBelumLunas,
      ringkasanAbsensi,
      nilaiHariIni,
      jumlahNilaiBulanIni,
    ] = await Promise.all([
      prisma.siswa.count({ where: { status: "Aktif" } }),
      prisma.guru.count(),
      prisma.keuangan.aggregate({
        where: { status: "Lunas" },
        _sum: { jumlah: true },
      }),
      prisma.keuangan.count({ where: { status: "Lunas" } }),
      prisma.keuangan.count({ where: { status: "Belum Lunas" } }),
      prisma.absensi.groupBy({
        by: ["status"],
        where: { tanggal: hariIni },
        _count: { _all: true },
      }),
      prisma.nilaiHarian.aggregate({
        where: { tanggal: hariIni },
        _count: { _all: true },
        _avg: { nilaiAngka: true },
      }),
      prisma.nilaiHarian.count({
        where: { tanggal: { gte: awalBulan, lte: hariIni } },
      }),
    ]);

    const absensi = new Map(
      ringkasanAbsensi.map((record) => [record.status.trim().toLowerCase(), record._count._all]),
    );
    const hadir = absensi.get("hadir") ?? 0;
    const sakit = absensi.get("sakit") ?? 0;
    const izin = absensi.get("izin") ?? 0;
    const alpa = absensi.get("alpa") ?? 0;
    const totalAbsensi = hadir + sakit + izin + alpa;

    return NextResponse.json({
      tanggal: hariIni,
      diperbaruiPada: new Date().toISOString(),
      siswaAktif: jumlahSiswaAktif,
      guruTerdaftar: jumlahGuru,
      keuangan: {
        totalKasLunas: totalKas._sum.jumlah ?? 0,
        transaksiLunas: jumlahPembayaranLunas,
        transaksiBelumLunas: jumlahPembayaranBelumLunas,
      },
      absensi: {
        hadir,
        sakit,
        izin,
        alpa,
        total: totalAbsensi,
        persentaseHadir: jumlahSiswaAktif
          ? Math.min(100, Math.round((hadir / jumlahSiswaAktif) * 100))
          : 0,
      },
      akademik: {
        penilaianHariIni: nilaiHariIni._count._all,
        rataRataNilaiHariIni: nilaiHariIni._avg.nilaiAngka,
        penilaianBulanIni: jumlahNilaiBulanIni,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal memuat ringkasan Kepala Sekolah:", error);
    return NextResponse.json(
      { error: "Ringkasan belum dapat dimuat. Silakan coba kembali." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
