import { restoreHistory } from "@/lib/queue-store";

export const runtime = "nodejs";

export async function POST(_request: Request, ctx: RouteContext<"/api/queue/history/[id]">) {
  const { id } = await ctx.params;
  const item = restoreHistory(id);
  if (!item) {
    return Response.json({ error: "Riwayat tidak ditemukan" }, { status: 404 });
  }
  return Response.json({ item }, { status: 201 });
}