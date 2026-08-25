export const runtime = "nodejs";

const ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "hpp4J3VqNfWAUOO0d1Us";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY belum dikonfigurasi di server" },
      { status: 500 },
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return Response.json({ error: "Text wajib diisi" }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const url = `${ELEVENLABS_API}/${voiceId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: body.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.65,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown error");
    console.error("ElevenLabs API error:", res.status, errText);
    return Response.json(
      { error: `ElevenLabs API error: ${res.status}` },
      { status: 502 },
    );
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
