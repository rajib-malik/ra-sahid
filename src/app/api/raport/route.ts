import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { PERMISSIONS } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

const SEMESTER_GANJIL = "Semester 1 (Ganjil)";
const SEMESTER_GENAP = "Semester 2 (Genap)";

function semesterRange(semester: string, tahunAjaran: string) {
  const match = /^(\d{4})\/(\d{4})$/.exec(tahunAjaran);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return null;

  const tahunMulai = Number(match[1]);
  if (semester === SEMESTER_GANJIL) {
    return { gte: `${tahunMulai}-07-01`, lte: `${tahunMulai}-12-31` };
  }
  if (semester === SEMESTER_GENAP) {
    const tahunBerikutnya = tahunMulai + 1;
    return { gte: `${tahunBerikutnya}-01-01`, lte: `${tahunBerikutnya}-06-30` };
  }
  return null;
}

function predikatDariRataRata(nilai: number): "BSB" | "BSH" | "MB" | "BB" {
  if (nilai >= 86) return "BSB";
  if (nilai >= 71) return "BSH";
  if (nilai >= 56) return "MB";
  return "BB";
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(PERMISSIONS.REPORTS_READ, request);
  if (authorization.response) return authorization.response;

  const search = new URL(request.url).searchParams;
  const nis = search.get("nis")?.trim();
  const semester = search.get("semester");
  const tahunAjaran = search.get("tahunAjaran");
  if (!nis || nis.length > 100 || !semester || !tahunAjaran) {
    return NextResponse.json(
      { error: "NIS, semester, dan tahun ajaran wajib diisi dengan benar." },
      { status: 400 },
    );
  }

  const rentangSemester = semesterRange(semester, tahunAjaran);
  if (!rentangSemester) {
    return NextResponse.json({ error: "Periode semester atau tahun ajaran tidak valid." }, { status: 400 });
  }

  try {
    const nilaiHarian = await prisma.nilaiHarian.findMany({
      where: { nis, tanggal: rentangSemester },
      orderBy: [{ aspek: "asc" }, { tanggal: "asc" }],
      select: { aspek: true, nilaiAngka: true, catatan: true },
    });
    const rekapPerMataPelajaran = new Map<string, { total: number; jumlah: number; catatan: Set<string> }>();

    for (const nilai of nilaiHarian) {
      const rekap = rekapPerMataPelajaran.get(nilai.aspek) ?? {
        total: 0,
        jumlah: 0,
        catatan: new Set<string>(),
      };
      rekap.total += nilai.nilaiAngka;
      rekap.jumlah += 1;
      if (nilai.catatan.trim()) rekap.catatan.add(nilai.catatan.trim());
      rekapPerMataPelajaran.set(nilai.aspek, rekap);
    }

    const records = Array.from(rekapPerMataPelajaran, ([aspek, rekap]) => {
      const nilaiAngka = Math.round((rekap.total / rekap.jumlah) * 100) / 100;
      return {
        aspek,
        nilaiAngka,
        predikat: predikatDariRataRata(nilaiAngka),
        catatan: Array.from(rekap.catatan).join("; "),
        jumlahPenilaian: rekap.jumlah,
      };
    });

    return NextResponse.json(records, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal membuat rekap nilai raport:", error);
    return NextResponse.json({ error: "Gagal memuat rekap nilai raport." }, { status: 500 });
  }
}
