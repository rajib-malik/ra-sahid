import { runSiswaImport } from "./import-siswa";

runSiswaImport("import", ["A"]).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Impor siswa Kelompok A gagal.");
  process.exitCode = 1;
});
