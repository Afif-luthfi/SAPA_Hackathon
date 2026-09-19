export function speechSupported(): boolean {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;
}

let active: SpeechSynthesisUtterance | null = null;

function pickIndonesianVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => voice.lang?.toLowerCase().startsWith('id'))
    ?? voices.find(voice => voice.lang?.toLowerCase().startsWith('en'))
    ?? null;
}

export function speak(text: string): void {
  if (!speechSupported() || !text.trim()) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    const voice = pickIndonesianVoice();
    if (voice) utterance.voice = voice;
    active = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    active = null;
  }
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  active = null;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // TTS is optional and must never interrupt messaging.
  }
}

export function listeningVoices(): void {
  if (!speechSupported()) return;
  void window.speechSynthesis.getVoices();
}

export function isSpeaking(): boolean {
  return active !== null;
}