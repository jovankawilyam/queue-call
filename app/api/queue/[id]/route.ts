import { removeQueue, updateQueue } from "@/lib/queue-store";
import type { UpdateQueueItemInput } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STATUSES = ["waiting", "called", "done"];

export async function PATCH(request: Request, ctx: RouteContext<"/api/queue/[id]">) {
  const { id } = await ctx.params;

  let body: UpdateQueueItemInput;
  try {
    body = (await request.json()) as UpdateQueueItemInput;
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const item = updateQueue(id, body);
  if (!item) {
    return Response.json({ error: "Antrean tidak ditemukan" }, { status: 404 });
  }

  return Response.json({ item });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/queue/[id]">) {
  const { id } = await ctx.params;

  const removed = removeQueue(id);
  if (!removed) {
    return Response.json({ error: "Antrean tidak ditemukan" }, { status: 404 });
  }

  return Response.json({ ok: true });
}