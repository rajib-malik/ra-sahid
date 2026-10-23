"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Login gagal. Periksa email dan kata sandi Anda, lalu coba kembali.";
        setError(message);
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("user" in result) ||
        typeof result.user !== "object" ||
        result.user === null ||
        !("role" in result.user) ||
        (result.user.role !== "admin" &&
          result.user.role !== "kepala_sekolah" &&
          result.user.role !== "guru")
      ) {
        setError("Respons login tidak valid. Silakan coba kembali.");
        return;
      }

      setPassword("");
      const tujuan = result.user.role === "kepala_sekolah"
        ? "/kepala-sekolah"
        : result.user.role === "guru"
          ? "/admin/nilai-harian"
          : "/admin/dashboard";
      router.replace(tujuan);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="email"
        >
          Email
        </label>
        <input
          autoComplete="username"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@ra-sahid.sch.id"
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Kata sandi
        </label>
        <input
          autoComplete="current-password"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan kata sandi"
          required
          type="password"
          value={password}
        />
      </div>
      {error && (
        <p
          aria-live="polite"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
