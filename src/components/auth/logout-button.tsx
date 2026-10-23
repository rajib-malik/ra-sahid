"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setError("Keluar gagal. Silakan coba kembali.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-60"
        disabled={isSubmitting}
        onClick={handleLogout}
        type="button"
      >
        {isSubmitting ? "Keluar..." : "Keluar"}
      </button>
      {error && (
        <span aria-live="polite" className="text-[11px] text-rose-700">
          {error}
        </span>
      )}
    </div>
  );
}
