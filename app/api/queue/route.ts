import { addQueue, clearQueue, listHistory, listQueue } from "@/lib/queue-store";
import type { CreateQueueItemInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ items: listQueue(), history: listHistory() });
}

export async function POST(request: Request) {
  let body: CreateQueueItemInput;
  try {
    body = (await request.json()) as CreateQueueItemInput;
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Nama wajib diisi" }, { status: 400 });
  }

  const item = addQueue(body);
  return Response.json({ item }, { status: 201 });
}

export async function DELETE() {
  const cleared = clearQueue();
  return Response.json({ ok: true, cleared });
}