"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueHistoryItem, QueueItem, QueueStatus } from "@/lib/types";
import { cancelSpeech, isSpeechSupported, playCallAnnouncement } from "./speech";

const POLL_INTERVAL_MS = 1500;
const VISIBLE_LIMIT = 10;

const STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: "Menunggu",
  called: "Dipanggil",
  done: "Selesai",
};

const STATUS_DOT: Record<QueueStatus, string> = {
  waiting: "bg-[#e3a81f]",
  called: "bg-[#3a9d73]",
  done: "bg-[#b3ad9e]",
};

const STATUS_BADGE: Record<QueueStatus, string> = {
  waiting: "border-[#efd9a7] bg-[#fdf4e0] text-[#8a6410]",
  called: "border-[#c2e0d2] bg-[#e9f5ee] text-[#23684c]",
  done: "border-[#e0ddd3] bg-[#f0efe9] text-[#777166]",
};

const STATUS_BORDER: Record<QueueStatus, string> = {
  waiting: "border-l-[#e3a81f]",
  called: "border-l-[#3a9d73]",
  done: "border-l-[#d8d3c6]",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Terjadi kesalahan.";
  } catch {
    return "Terjadi kesalahan.";
  }
}

function TicketIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

function MegaphoneIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function StatusBadge({ status }: { status: QueueStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${STATUS_BADGE[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function AdminPanel() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAllQueue, setShowAllQueue] = useState(false);
  const [queueSearch, setQueueSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const mountedRef = useRef(true);

  const speechSupported = isSpeechSupported();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTodayLabel(
        new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/queue", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = (await response.json()) as {
        items: QueueItem[];
        history: QueueHistoryItem[];
      };
      if (mountedRef.current) {
        setItems(data.items);
        setHistory(data.history);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Gagal memuat antrean.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initialTimer = window.setTimeout(() => void refresh(), 0);
    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      cancelSpeech();
    };
  }, [refresh]);

  async function runAction(
    id: string,
    action: () => Promise<Response>,
    onSuccess: (updated: QueueItem) => void,
  ) {
    setBusyId(id);
    setError(null);
    try {
      const response = await action();
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = (await response.json()) as { item?: QueueItem };
      if (data.item) {
        onSuccess(data.item);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui antrean.");
    } finally {
      setBusyId(null);
    }
  }

  function handleCall(item: QueueItem) {
    void runAction(
      item.id,
      () =>
        fetch(`/api/queue/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "called" }),
        }),
      (updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i))),
    );

    if (speechSupported) {
      setSpeakingId(item.id);
      const announced = playCallAnnouncement(item.name, () => {
        setSpeakingId((current) => (current === item.id ? null : current));
      });
      if (!announced) {
        setSpeakingId(null);
      }
    }
  }

  function handleDone(item: QueueItem) {
    void runAction(
      item.id,
      () =>
        fetch(`/api/queue/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        }),
      (updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i))),
    );
  }

  function handleDelete(item: QueueItem) {
    if (item.status === "called") {
      cancelSpeech();
    }
    setBusyId(item.id);
    setError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/queue/${item.id}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus antrean.");
      } finally {
        setBusyId(null);
      }
    })();
  }

  function handleClearAll() {
    if (items.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      "Hapus semua antrean hari ini? Tindakan ini tidak dapat dibatalkan.",
    );
    if (!confirmed) {
      return;
    }

    cancelSpeech();
    setBusyId("__all__");
    setError(null);
    void (async () => {
      try {
        const response = await fetch("/api/queue", { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        setItems([]);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus semua antrean.");
      } finally {
        setBusyId(null);
      }
    })();
  }

  function handleRestoreHistory(entry: QueueHistoryItem) {
    setBusyId(`h:${entry.id}`);
    setError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/queue/history/${entry.id}`, {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        await refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memanggil ulang antrean.",
        );
      } finally {
        setBusyId(null);
      }
    })();
  }

  function handleClearHistory() {
    if (history.length === 0) {
      return;
    }
    const confirmed = window.confirm("Bersihkan seluruh riwayat terhapus?");
    if (!confirmed) {
      return;
    }

    setBusyId("__history__");
    setError(null);
    void (async () => {
      try {
        const response = await fetch("/api/queue/history", { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        setHistory([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membersihkan riwayat.");
      } finally {
        setBusyId(null);
      }
    })();
  }

  const waitingCount = items.filter((item) => item.status === "waiting").length;
  const calledCount = items.filter((item) => item.status === "called").length;
  const doneCount = items.filter((item) => item.status === "done").length;

  const normalizedQueueSearch = queueSearch.trim().toLowerCase();
  const filteredItems = normalizedQueueSearch
    ? items.filter((item) =>
        item.name.toLowerCase().includes(normalizedQueueSearch),
      )
    : items;

  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredHistory = normalizedHistorySearch
    ? history.filter((entry) =>
        entry.name.toLowerCase().includes(normalizedHistorySearch),
      )
    : history;

  const hiddenCount = Math.max(filteredItems.length - VISIBLE_LIMIT, 0);
  const visibleItems = showAllQueue
    ? filteredItems
    : filteredItems.slice(0, VISIBLE_LIMIT);

  const lastCalled = items
    .filter((item) => item.status === "called" && item.calledAt)
    .sort(
      (a, b) =>
        new Date(b.calledAt as string).getTime() -
        new Date(a.calledAt as string).getTime(),
    )[0];
  const lastCalledNumber = lastCalled ? items.indexOf(lastCalled) + 1 : null;

  return (
    <div className="w-full">
      <header className="rounded-xl bg-[#1e3a5f] text-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <TicketIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight sm:text-xl">
                Sistem Antrean Pelayanan
              </h1>
              <p className="text-[13px] text-white/60">{todayLabel}</p>
            </div>
          </div>
          <span className="text-[13px] text-white/70">Admin</span>
        </div>
      </header>

      <section className="mt-4 rounded-xl border border-[#e6e2d8] bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a39c8c]">
              Nomor Dipanggil
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-[#1e3a5f] sm:text-6xl">
              {lastCalledNumber ?? "—"}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a39c8c]">
              Nama
            </p>
            <p className="mt-1 truncate text-lg font-medium text-[#3a342a] sm:text-xl">
              {lastCalled ? lastCalled.name : "Belum ada panggilan"}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e6e2d8] bg-[#e6e2d8] shadow-sm sm:grid-cols-4">
        <div className="bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a39c8c]">
            Menunggu
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#8a6410]">
            {waitingCount}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a39c8c]">
            Dipanggil
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#23684c]">
            {calledCount}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a39c8c]">
            Selesai
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#777166]">
            {doneCount}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a39c8c]">
            Total
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#1e3a5f]">
            {items.length}
          </p>
        </div>
      </div>

      {!speechSupported && (
        <p
          className="mt-4 rounded-xl border border-[#efd9a7] bg-[#fdf4e0] px-5 py-3 text-[14px] text-[#8a6410]"
          role="status"
        >
          Browser ini tidak mendukung fitur suara (Web Speech API). Pemanggilan
          lewat audio dilewati.
        </p>
      )}

      {error && (
        <p
          className="mt-4 rounded-xl border border-[#ecc9c7] bg-[#fbeceb] px-5 py-3 text-[14px] text-[#a03733]"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#403a2f]">Daftar Antrean</h2>
        {!loading && items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={busyId !== null}
            className="text-[14px] font-medium text-[#b0413e] transition hover:text-[#8f2f2c] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyId === "__all__" ? "Menghapus..." : "Hapus semua"}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a39c8c]" />
          <input
            type="search"
            value={queueSearch}
            onChange={(event) => setQueueSearch(event.target.value)}
            placeholder="Cari nama di antrean..."
            className="w-full rounded-xl border border-[#e6e2d8] bg-white py-3 pl-12 pr-4 text-[15px] text-[#29241c] outline-none transition placeholder:text-[#b5ae9f] focus:border-[#8fa3bd] focus:ring-4 focus:ring-[#1e3a5f]/10"
          />
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-[15px] text-[#a39c8c]">
          Sedang memuat antrean...
        </p>
      ) : items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[#d9d4c7] bg-white px-6 py-12 text-center">
          <p className="text-[16px] font-medium text-[#57503f]">
            Belum ada antrean
          </p>
          <p className="mt-1 text-[14px] text-[#a39c8c]">
            Nama yang masuk dari halaman user akan muncul di sini.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[#d9d4c7] bg-white px-6 py-12 text-center">
          <p className="text-[16px] font-medium text-[#57503f]">
            Antrean tidak ditemukan
          </p>
          <p className="mt-1 text-[14px] text-[#a39c8c]">
            Tidak ada nama yang cocok dengan &quot;{queueSearch.trim()}&quot;.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-3 overflow-hidden rounded-xl border border-[#e6e2d8] bg-white shadow-sm">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className={`animate-fade-in border-l-4 border-b border-[#efece4] last:border-b-0 ${STATUS_BORDER[item.status]}`}
              >
                <div className="flex items-center gap-4 px-4 pt-4 sm:px-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f2eee4] text-[15px] font-bold tabular-nums text-[#5c5546]">
                    {items.indexOf(item) + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[16px] font-medium text-[#29241c]">
                        {item.name}
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-0.5 text-[12px] tabular-nums text-[#9a9383]">
                      masuk {formatTime(item.createdAt)}
                      {item.calledAt
                        ? ` · dipanggil ${formatTime(item.calledAt)}`
                        : ""}
                    </p>
                  </div>
                  {speakingId === item.id && (
                    <span className="shrink-0 text-[12px] font-medium text-[#b45309]">
                      memanggil...
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2 border-t border-[#f2efe8] bg-[#fbfaf6] px-4 py-2.5 sm:px-5">
                  {item.status !== "done" && (
                    <button
                      type="button"
                      onClick={() => handleCall(item)}
                      disabled={busyId === item.id}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] py-2.5 text-[14px] font-medium text-white transition hover:bg-[#162c49] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MegaphoneIcon className="h-4 w-4" />
                      {item.status === "called" ? "Panggil lagi" : "Panggil"}
                    </button>
                  )}
                  {item.status !== "done" && (
                    <button
                      type="button"
                      onClick={() => handleDone(item)}
                      disabled={busyId === item.id}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#a9cfb9] bg-white py-2.5 text-[14px] font-medium text-[#23684c] transition hover:bg-[#eef6f1] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Selesai
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    aria-label={`Hapus antrean ${item.name}`}
                    className="inline-flex items-center justify-center rounded-lg border border-[#ecc9c7] bg-white px-4 py-2.5 text-[14px] font-medium text-[#a03733] transition hover:bg-[#fbeceb] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllQueue((prev) => !prev)}
              className="mt-4 w-full py-2.5 text-[14px] font-medium text-[#1e3a5f] transition hover:underline"
              aria-expanded={showAllQueue}
            >
              {showAllQueue
                ? "Tampilkan lebih sedikit"
                : `...dan ${hiddenCount} antrean lainnya`}
            </button>
          )}
        </>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#403a2f]">Riwayat Terhapus</h2>
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="text-[14px] font-medium text-[#1e3a5f] transition hover:underline"
            aria-expanded={showHistory}
          >
            {showHistory
              ? `Sembunyikan riwayat${history.length > 0 ? ` (${history.length})` : ""}`
              : `Lihat riwayat${history.length > 0 ? ` (${history.length})` : ""}`}
          </button>
        </div>

        {showHistory && (
          <div className="mt-3">
            {history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d9d4c7] bg-white px-6 py-8 text-center text-[14px] text-[#a39c8c]">
                Belum ada riwayat. Antrean yang dihapus akan tercatat di sini.
              </p>
            ) : (
              <>
                <div className="relative mb-3">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a39c8c]" />
                  <input
                    type="search"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="Cari nama di riwayat..."
                    className="w-full rounded-xl border border-[#e6e2d8] bg-white py-3 pl-12 pr-4 text-[15px] text-[#29241c] outline-none transition placeholder:text-[#b5ae9f] focus:border-[#8fa3bd] focus:ring-4 focus:ring-[#1e3a5f]/10"
                  />
                </div>
                {filteredHistory.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d9d4c7] bg-white px-6 py-8 text-center text-[14px] text-[#a39c8c]">
                    Tidak ada nama yang cocok dengan &quot;{historySearch.trim()}&quot;.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        disabled={busyId !== null}
                        className="text-[13px] font-medium text-[#b0413e] transition hover:text-[#8f2f2c] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === "__history__" ? "Menghapus..." : "Bersihkan riwayat"}
                      </button>
                    </div>
                    <ul className="overflow-hidden rounded-xl border border-[#e6e2d8] bg-white shadow-sm">
                      {filteredHistory.map((entry) => (
                        <li
                          key={entry.id}
                          className="animate-fade-in flex items-center justify-between gap-3 border-b border-[#efece4] px-4 py-3.5 last:border-b-0 hover:bg-[#faf8f3] sm:px-5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium text-[#29241c]">
                              {entry.name}
                            </p>
                            <p className="mt-0.5 text-[12px] tabular-nums text-[#9a9383]">
                              dihapus {formatTime(entry.removedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2.5">
                            <StatusBadge status={entry.status} />
                            <button
                              type="button"
                              onClick={() => handleRestoreHistory(entry)}
                              disabled={busyId !== null}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#c9d6e4] bg-[#eef3f9] px-3 py-2 text-[13px] font-medium text-[#1e3a5f] transition hover:bg-[#e2eaf4] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <MegaphoneIcon className="h-4 w-4" />
                              Panggil lagi
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}