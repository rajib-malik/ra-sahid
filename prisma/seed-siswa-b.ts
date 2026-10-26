import { runSiswaImport } from "./import-siswa";

runSiswaImport("import", ["B"]).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Impor siswa Kelompok B gagal.");
  process.exitCode = 1;
});
