import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const prismaCli = path.join(
  rootDirectory,
  "node_modules",
  "prisma",
  "build",
  "index.js",
);
const input = process.stdin;
const output = process.stdout;
let ignoreNextLineFeed = false;

function askSecret(question) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Jalankan perintah ini dari terminal interaktif.");
  }

  output.write(question);
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let value = "";
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
          finish(new Error("Pembuatan akun dibatalkan."));
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
  return `CONVERT(X'${Buffer.from(value, "utf8").toString("hex")}' USING utf8mb4)`;
}

async function main() {
  const terminal = createInterface({ input, output });
  let name;
  let email;
  let role;

  try {
    name = (await terminal.question("Nama pengguna: ")).trim();
    email = (await terminal.question("Email: ")).trim().toLowerCase();
    role = (
      await terminal.question("Role (admin/kepala_sekolah/guru): ")
    ).trim();
  } finally {
    terminal.close();
  }

  if (!name || name.length > 120) {
    throw new Error("Nama wajib diisi dan maksimal 120 karakter.");
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Format email tidak valid.");
  }
  if (role !== "admin" && role !== "kepala_sekolah" && role !== "guru") {
    throw new Error("Role harus admin, kepala_sekolah, atau guru.");
  }

  const password = await askSecret("Kata sandi baru (minimal 12 karakter): ");
  const confirmation = await askSecret("Ulangi kata sandi: ");

  if (
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    password !== confirmation
  ) {
    throw new Error(
      "Kata sandi harus sama, minimal 12 karakter, dan maksimal 72 byte UTF-8.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = randomUUID();
  const timestamp = new Date().toISOString().slice(0, 23).replace("T", " ");
  const databaseRole = role === "admin"
    ? "ADMIN"
    : role === "kepala_sekolah"
      ? "KEPALA_SEKOLAH"
      : "GURU";
  const sql = [
    'INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `isActive`, `createdAt`, `updatedAt`)',
    `VALUES (${sqlString(id)}, ${sqlString(name)}, ${sqlString(email)}, ${sqlString(passwordHash)}, ${sqlString(databaseRole)}, 1, ${sqlString(timestamp)}, ${sqlString(timestamp)});`,
    "",
  ].join("\n");

  const result = spawnSync(
    process.execPath,
    [prismaCli, "db", "execute", "--stdin"],
    {
      cwd: rootDirectory,
      env: process.env,
      input: sql,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      "Akun tidak disimpan. Email mungkin sudah digunakan atau koneksi MySQL bermasalah; data akun yang ada tidak diubah.",
    );
  }

  output.write(`Akun ${email} berhasil dibuat dengan role ${role}.\r\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Pembuatan akun gagal.");
  process.exitCode = 1;
});
