This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database lokal (pengembangan)

Proyek ini menggunakan Prisma ORM 7 dengan MySQL lokal dari XAMPP. Buat
database `ra_sahid_db` di phpMyAdmin, lalu atur `DATABASE_URL` di `.env`
(contoh bawaan memakai `root` tanpa kata sandi). Berkas `.env` diabaikan oleh
Git. Salin `.env.example` ke `.env` jika menyiapkan workspace baru:

```powershell
Copy-Item .env.example .env
```

Perintah database:

```powershell
npm run db:generate
npx prisma db push
```

`db push` menyelaraskan skema Prisma dengan database MySQL. Riwayat migrasi
SQLite lama di `prisma/migrations` bukan untuk dijalankan terhadap database
MySQL ini. Prisma Client hasil generate berada di `src/generated/prisma/` dan
tidak disimpan di Git. Jangan menaruh kata sandi atau rahasia di model maupun
`.env` yang dibagikan.

Model `Siswa` menyimpan identitas, tempat/tanggal lahir, tingkat-rombel, umur,
jenis kelamin, status, alamat, kebutuhan khusus/disabilitas, dan data orang
tua/wali. Field tambahan bersifat nullable agar data siswa lama tetap berlaku.
`tingkatRombel` dan `jenisKelamin` dipetakan ke kolom lama `kelas` dan `jk`;
jalankan `npm run db:generate` lalu `npx prisma db push` setelah mengambil
cadangan database sebelum menerapkan perubahan skema.

Untuk membuat akun awal lokal, jalankan `npm run db:seed` dengan variabel
`RA_SAHID_SEED_PASSWORD` diatur ke kata sandi yang diinginkan. Kata sandi
disimpan sebagai hash bcrypt; akun yang emailnya sudah ada tidak ditimpa.
Seed ini hanya berjalan pada database `ra_sahid_db` dan ditolak di production.
Jangan gunakan kata sandi bawaan yang lemah di deployment.

## API operasional

Route `/api/siswa`, `/api/guru`, dan `/api/keuangan` mendukung `GET`, `POST`,
`PUT`, dan `DELETE`. `/api/absensi` mendukung `GET` serta `POST`;
pengiriman absensi berulang untuk NIS dan tanggal yang sama memperbarui rekap
yang sudah ada. `/api/nilai` menyimpan nilai harian per siswa, tanggal, dan mata pelajaran
(kolom `aspek` pada skema), serta menyediakan daftar mata pelajaran yang sudah
memiliki nilai. Mata pelajaran baru tersimpan saat nilai pertamanya disimpan.
`/api/raport` hanya membaca nilai harian dan menghitung rata-rata, predikat,
jumlah penilaian, serta catatan per mata pelajaran untuk semester dan tahun
ajaran yang dipilih. Semester ganjil memakai Juli–Desember dan semester genap
memakai Januari–Juni. Predikat rata-rata: BSB mulai 86, BSH mulai 71, MB mulai
56, dan BB di bawah 56. Dashboard menghitung siswa aktif, guru terdaftar,
akumulasi transaksi lunas, dan rekap absensi langsung dari database.
Keuangan, absensi, nilai harian, dan raport memiliki relasi ke siswa melalui
NIS; data nama/kelas ditampilkan dari relasi siswa. Route operasional
memerlukan sesi pengguna dan izin sesuai peran.

## Login dan peran

Atur `SESSION_SECRET` pada `.env` dengan nilai acak minimal 32 byte. Contoh
pembuatan nilai untuk PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Buat akun secara eksplisit dari terminal interaktif setelah migrasi selesai:

```powershell
npm run user:create
```

Skrip meminta nama, email, peran (`admin`, `kepala_sekolah`, atau `guru`), dan kata
sandi dua kali tanpa menampilkan kata sandi. Kata sandi disimpan sebagai hash
bcrypt. Akun lama yang belum memiliki hash tidak dapat digunakan untuk login.

- `admin`: boleh membaca dan mengelola data operasional.
- `kepala_sekolah`: boleh membaca dashboard, data operasional, dan laporan
  serta mengekspor laporan; tidak boleh mengubah atau menghapus data.
- `guru`: hanya dapat membuka halaman absensi dan Nilai Harian, membaca daftar
  siswa, serta membaca/menyimpan absensi dan Nilai Harian. Akses ke keuangan,
  data staf, laporan, dan pengelolaan siswa ditolak.

Login tersedia di `/login`; area admin awal berada di `/admin/dashboard`.
Pemeriksaan role untuk endpoint API harus memakai
`authorizeApiRequest(...)` di setiap route handler. Proxy hanya membantu
pengalihan awal, bukan pengganti pemeriksaan izin di server/API.

Uji matriks izin kedua peran dengan:

```powershell
npm run test:auth
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
