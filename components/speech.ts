const CHIME_URL = "/audio/chime.mp3";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesListenerAttached = false;

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) {
    return [];
  }
  if (cachedVoices === null) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

function refreshVoices(): void {
  if (isSpeechSupported()) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

function attachVoicesListener(): void {
  if (!isSpeechSupported() || voicesListenerAttached) {
    return;
  }
  voicesListenerAttached = true;
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

function normalizeLang(lang: string): string {
  return lang.toLowerCase().replace("_", "-");
}

function isIndonesianVoice(voice: SpeechSynthesisVoice): boolean {
  return normalizeLang(voice.lang).startsWith("id");
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (/natural|neural|gadis|online/i.test(name)) score += 3;
  if (/ardi|damayanti|google|siri|premium|enhanced/i.test(name)) score += 2;
  if (/microsoft|indonesia|indonesian/i.test(name)) score += 1;

  return score;
}

function getIndonesianVoice(): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  const indonesianVoices = voices.filter(isIndonesianVoice);
  if (indonesianVoices.length === 0) {
    return null;
  }

  let best = indonesianVoices[0];
  let bestScore = -1;
  for (const voice of indonesianVoices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }

  return best;
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) {
    return;
  }
  window.speechSynthesis.cancel();
}

function speakCall(name: string, onEnd?: () => void): void {
  const utterance = new SpeechSynthesisUtterance(
    `Panggilan. Atas nama, ${name}, silakan menuju ke meja pelayanan.`,
  );
  utterance.lang = "id-ID";

  const voice = getIndonesianVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.rate = 0.80;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
}

export function playCallAnnouncement(name: string, onEnd?: () => void): boolean {
  if (!isSpeechSupported()) {
    return false;
  }

  attachVoicesListener();
  cancelSpeech();

  const audio = new Audio(CHIME_URL);
  const startSpeech = () => speakCall(name, onEnd);

  audio.onended = startSpeech;
  audio.onerror = startSpeech;

  void audio.play().catch(startSpeech);
  return true;
}