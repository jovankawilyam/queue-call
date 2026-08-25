const CHIME_URL = "/audio/chime.mp3";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined";
}

let currentAudio: HTMLAudioElement | null = null;

export function cancelSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

async function fetchTtsAudio(text: string): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed: ${res.status}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function speakCall(name: string, onEnd?: () => void): void {
  const text = `panggilan. Atas nama, ${name}. Silahkan menuju ke meja pelayanan.`;

  fetchTtsAudio(text)
    .then((audioUrl) => {
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        onEnd?.();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        console.error("Gagal memutar audio TTS");
        onEnd?.();
      };

      void audio.play();
    })
    .catch((err) => {
      console.error("Gagal mengambil audio TTS:", err);
      onEnd?.();
    });
}

export function playCallAnnouncement(name: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  cancelSpeech();

  const audio = new Audio(CHIME_URL);
  const startSpeech = () => speakCall(name, onEnd);

  audio.onended = startSpeech;
  audio.onerror = startSpeech;

  void audio.play().catch(startSpeech);
  return true;
}
