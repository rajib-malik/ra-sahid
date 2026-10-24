
import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";

const ROOT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const PRISMA_CLI = path.join(
  ROOT_DIRECTORY,
  "node_modules",
  "prisma",
  "build",
  "index.js",
);

const input = process.stdin;
const output = process.stdout;

const VALID_ROLES = new Set([
  "admin",
  "kepala_sekolah",
  "guru",
]);

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const BCRYPT_ROUNDS = 12;
const PRISMA_TIMEOUT_MS = 120_000;

function askQuestion(question) {
  const terminal = createInterface({ input, output });

  return terminal.question(question).finally(() => {
    terminal.close();
  });
}

function askSecret(question) {
  if (
    !input.isTTY ||
    !output.isTTY ||
    typeof input.setRawMode !== "function"
  ) {
    return Promise.reject(
      new Error(
        "Jalankan script melalui terminal interaktif VS Code atau PowerShell.",
      ),
    );
  }

  output.write(question);
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    let ignoreNextLineFeed = false;
    const decoder = new StringDecoder("utf8");

    function finish(error) {
      input.off("data", onData);
      input.setRawMode(false);
      output.write("\r\n");

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }

    function onData(chunk) {
      let characters = decoder.write(chunk);

      if (ignoreNextLineFeed) {
        ignoreNextLineFeed = false;

        if (characters.startsWith("\n")) {
          characters = characters.slice(1);
        }
      }

      for (const character of characters) {
        if (character === "\u0003") {
          finish(new Error("Proses dibatalkan."));
          return;
        }

        if (character === "\r" || character === "\n") {
          ignoreNextLineFeed = character === "\r";
          finish();
          return;
        }

        if (character === "\u007f" || character === "\b") {
          const charactersInValue = Array.from(value);

          if (charactersInValue.length > 0) {
            charactersInValue.pop();
            value = charactersInValue.join("");
            output.write("\b \b");
          }

          continue;
        }

        if (character >= " ") {
          value += character;
          output.write("*");
        }
      }
    }

    input.on("data", onData);
  });
}

function sqlString(value) {
  const hex = Buffer.from(value, "utf8").toString("hex");
  return `CONVERT(X'${hex}' USING utf8mb4)`;
}

function validateInput({ name, email, role, password, confirmation }) {
  if (
    name.length < MIN_NAME_LENGTH ||
    name.length > MAX_NAME_LENGTH
  ) {
    throw new Error(
      `Nama wajib diisi dan maksimal ${MAX_NAME_LENGTH} karakter.`,
    );
  }

  if (
    email.length > MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Format email tidak valid.");
  }

  if (!VALID_ROLES.has(role)) {
    throw new Error(
      "Role harus admin, kepala_sekolah, atau guru.",
    );
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
  ) {
    throw new Error(
      `Kata sandi harus minimal ${MIN_PASSWORD_LENGTH} karakter dan maksimal ${MAX_PASSWORD_BYTES} byte UTF-8.`,
    );
  }

  if (password !== confirmation) {
    throw new Error("Konfirmasi kata sandi tidak cocok.");
  }
}

function executePrisma(sql) {
  if (!path.isAbsolute(PRISMA_CLI)) {
    throw new Error("Lokasi Prisma CLI tidak valid.");
  }

  const result = spawnSync(
    process.execPath,
    [PRISMA_CLI, "db", "execute", "--stdin"],
    {
      cwd: ROOT_DIRECTORY,
      env: process.env,
      input: sql,
      encoding: "utf8",
      windowsHide: true,
      timeout: PRISMA_TIMEOUT_MS,
    },
  );

  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw new Error(
        "Prisma melewati batas waktu 120 detik. Periksa apakah MySQL berjalan dan DATABASE_URL sudah benar.",
      );
    }

    throw new Error(
      `Gagal menjalankan Prisma CLI: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || "")
      .trim()
      .slice(0, 1500);

    throw new Error(
      details
        ? `Akun tidak berhasil dibuat. Detail: ${details}`
        : "Akun tidak berhasil dibuat. Periksa koneksi database dan konfigurasi Prisma.",
    );
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Script ini hanya boleh dijalankan di lingkungan lokal, bukan production.",
    );
  }

  const name = (await askQuestion("Nama pengguna: ")).trim();
  const email = (
    await askQuestion("Email: ")
  ).trim().toLowerCase();
  const role = (
    await askQuestion(
      "Role (admin/kepala_sekolah/guru): ",
    )
  ).trim();

  const password = await askSecret(
    `Kata sandi baru (minimal ${MIN_PASSWORD_LENGTH} karakter): `,
  );

  const confirmation = await askSecret(
    "Ulangi kata sandi: ",
  );

  validateInput({
    name,
    email,
    role,
    password,
    confirmation,
  });

  const passwordHash = await bcrypt.hash(
    password,
    BCRYPT_ROUNDS,
  );

  const id = randomUUID();
  const timestamp = new Date()
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");

  const databaseRole = {
    admin: "ADMIN",
    kepala_sekolah: "KEPALA_SEKOLAH",
    guru: "GURU",
  }[role];

  const sql = [
    "INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `isActive`, `createdAt`, `updatedAt`)",
    `VALUES (${sqlString(id)}, ${sqlString(name)}, ${sqlString(email)}, ${sqlString(passwordHash)}, ${sqlString(databaseRole)}, 1, ${sqlString(timestamp)}, ${sqlString(timestamp)});`,
    "",
  ].join("\n");

  output.write("Menghubungkan ke database...\r\n");
  executePrisma(sql);

  output.write(
    `Berhasil membuat akun ${email} dengan role ${role}.\r\n`,
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Pembuatan akun gagal.",
  );

  process.exitCode = 1;
});
