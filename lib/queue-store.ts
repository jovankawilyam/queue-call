import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  CreateQueueItemInput,
  QueueHistoryItem,
  QueueItem,
  UpdateQueueItemInput,
} from "./types";

const DATA_DIR =
  process.env.VERCEL === "1" ? "/tmp/queue-call" : join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "queue.json");

interface PersistedStore {
  items: QueueItem[];
  history: QueueHistoryItem[];
}

function defaultStore(): PersistedStore {
  return { items: [], history: [] };
}

function readStore(): PersistedStore {
  try {
    if (!existsSync(DATA_FILE)) {
      return defaultStore();
    }
    const raw = readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw) as Partial<PersistedStore>;
    return {
      items: Array.isArray(data.items) ? data.items : [],
      history: Array.isArray(data.history) ? data.history : [],
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: PersistedStore): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function listQueue(): QueueItem[] {
  return readStore().items;
}

export function addQueue(input: CreateQueueItemInput): QueueItem {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Nama tidak boleh kosong");
  }

  const item: QueueItem = {
    id: randomUUID(),
    name,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };

  const store = readStore();
  store.items.push(item);
  writeStore(store);
  return item;
}

export function updateQueue(id: string, input: UpdateQueueItemInput): QueueItem | null {
  const store = readStore();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  const current = store.items[index];
  const updated: QueueItem = {
    ...current,
    status: input.status,
    calledAt: input.status === "called" ? new Date().toISOString() : current.calledAt,
  };

  store.items[index] = updated;
  writeStore(store);
  return updated;
}

export function removeQueue(id: string): boolean {
  const store = readStore();
  const item = store.items.find((entry) => entry.id === id);
  if (!item) {
    return false;
  }

  store.items = store.items.filter((entry) => entry.id !== id);
  store.history.push({ ...item, removedAt: new Date().toISOString() });
  writeStore(store);
  return true;
}

export function clearQueue(): number {
  const store = readStore();
  const now = new Date().toISOString();
  for (const item of store.items) {
    store.history.push({ ...item, removedAt: now });
  }
  const count = store.items.length;
  store.items = [];
  writeStore(store);
  return count;
}

export function listHistory(): QueueHistoryItem[] {
  return readStore().history.sort(
    (a, b) => new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime(),
  );
}

export function clearHistory(): number {
  const store = readStore();
  const count = store.history.length;
  store.history = [];
  writeStore(store);
  return count;
}

export function restoreHistory(id: string): QueueItem | null {
  const store = readStore();
  const index = store.history.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  const entry = store.history[index];
  const item: QueueItem = {
    id: entry.id,
    name: entry.name,
    status: "waiting",
    createdAt: entry.createdAt,
  };

  store.items.unshift(item);
  store.history.splice(index, 1);
  writeStore(store);
  return item;
}