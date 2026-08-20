import { clearHistory } from "@/lib/queue-store";

export const runtime = "nodejs";

export async function DELETE() {
  const cleared = clearHistory();
  return Response.json({ ok: true, cleared });
}