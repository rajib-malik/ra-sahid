// Pastikan koneksi pool menambahkan opsi SSL jika diperlukan, atau biarkan URL .env menangani
// Jika di .env Anda url-nya menggunakan ?sslmode=require, pastikan aman.

// Ubah cara insert data di dalam loop (hindari prisma.$transaction massal jika memicu timeout)
console.log('Mengimpor data Kelompok A...');
for (const row of dataA) {
  try {
    await prisma.siswa.create({ // Sesuaikan dengan nama model Anda (Siswa/Student)
      data: {
        nama: row['Nama Lengkap'] || '',
        nis: String(row['NISN'] || row['NIK'] || ''), // Sesuai aturan NIS / NIK Anda
        nik: String(row['NIK'] || ''),
        tempatLahir: row['Tempat Lahir'] || '',
        tanggalLahir: row['Tanggal Lahir'] ? new Date(row['Tanggal Lahir']) : null,
        jenisKelamin: row['Jenis Kelamin'] || '',
        alamat: row['Alamat'] || '',
        noTelepon: String(row['No Telepon'] || ''),
        namaAyah: row['Nama Ayah Kandung'] || '',
        namaIbu: row['Nama Ibu Kandung'] || '',
        kelompok: 'A',
        tahunAjaran: '2026-2027',
      },
    });
  } catch (err) {
    console.warn(`Gagal insert baris ${row['Nama Lengkap']}:`, err.message);
  }
}
console.log(`✅ Selesai memproses Kelompok A.`);

console.log('Mengimpor data Kelompok B...');
for (const row of dataB) {
  try {
    await prisma.siswa.create({
      data: {
        nama: row['Nama Lengkap'] || '',
        nis: String(row['NISN'] || row['NIK'] || ''),
        nik: String(row['NIK'] || ''),
        tempatLahir: row['Tempat Lahir'] || '',
        tanggalLahir: row['Tanggal Lahir'] ? new Date(row['Tanggal Lahir']) : null,
        jenisKelamin: row['Jenis Kelamin'] || '',
        alamat: row['Alamat'] || '',
        noTelepon: String(row['No Telepon'] || ''),
        namaAyah: row['Nama Ayah Kandung'] || '',
        namaIbu: row['Nama Ibu Kandung'] || '',
        kelompok: 'B',
        tahunAjaran: '2026-2027',
      },
    });
  } catch (err) {
    console.warn(`Gagal insert baris ${row['Nama Lengkap']}:`, err.message);
  }
}
console.log(`✅ Selesai memproses Kelompok B.`);