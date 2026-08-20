"use client";

import { useState } from "react";

function TicketIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

export default function UserForm() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Silakan isi nama terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Gagal masuk antrean. Coba lagi.");
      }

      setName("");
      setSubmittedName(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#1e3a5f] sm:text-4xl">
          Daftar Antrean
        </h1>
        <p className="mt-2 text-[15px] text-[#7a7363] sm:text-base">
          Silahkan masukkan nama Anda untuk bergabung ke antrean.
        </p>
      </header>

      {submittedName ? (
        <section
          className="animate-fade-in rounded-2xl border border-[#cfe3d8] bg-[#eef6f1] p-8 text-center shadow-sm sm:p-10"
          aria-live="polite"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#23684c] text-3xl font-bold text-white">
            ✓
          </div>
          <h2 className="text-xl font-semibold text-[#1f4d3a]">
            Berhasil Terdaftar
          </h2>
          <p className="mt-2 text-[15px] text-[#23684c]">
            Terima kasih, <span className="font-semibold">{submittedName}</span>.
            Silakan tunggu nama Anda dipanggil.
          </p>
          <button
            type="button"
            onClick={() => setSubmittedName(null)}
            className="mt-6 w-full rounded-xl border border-[#bcd8c9] bg-white py-4 text-[15px] font-semibold text-[#23684c] transition hover:bg-[#eef6f1] active:scale-[0.99]"
          >
            Daftar Antrean Lagi
          </button>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#e6e2d8] bg-white p-7 shadow-md shadow-[#1e3a5f]/5 sm:p-8"
        >
          <label
            htmlFor="name"
            className="mb-2 block text-[15px] font-medium text-[#3a342a]"
          >
            Nama Lengkap
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Masukkan Nama Lengkap Anda"
            autoComplete="name"
            maxLength={80}
            className="w-full rounded-xl border border-[#d9d4c7] bg-white px-4 py-4 text-lg text-[#29241c] placeholder-[#b5ae9f] outline-none transition focus:border-[#8fa3bd] focus:ring-4 focus:ring-[#1e3a5f]/10"
          />
          {error && (
            <p className="mt-2 text-[15px] text-[#a03733]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-[#1e3a5f] py-4 text-lg font-semibold text-white shadow-lg shadow-[#1e3a5f]/25 transition hover:bg-[#274a75] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Mengirim..." : "Masuk Antrean"}
          </button>
        </form>
      )}
    </div>
  );
}