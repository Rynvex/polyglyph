/**
 * Thin Web Speech API wrapper. Falls back silently when unavailable
 * (SSR, Firefox without voices, etc.) so callers don't need to guard.
 */

export interface SpeakOptions {
  lang: string;
  rate?: number;
}

export interface Speaker {
  speak: (text: string, opts: SpeakOptions) => Promise<void>;
  cancel: () => void;
}

interface MinimalSynthesis {
  speak: (u: MinimalUtterance) => void;
  cancel: () => void;
}

interface MinimalUtterance {
  text: string;
  lang: string;
  rate: number;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

interface BrowserGlobals {
  speechSynthesis?: MinimalSynthesis;
  SpeechSynthesisUtterance?: new (text: string) => MinimalUtterance;
}

function getBrowser(): BrowserGlobals | null {
  if (typeof window === "undefined") return null;
  return window as unknown as BrowserGlobals;
}

export function isSpeechAvailable(): boolean {
  const w = getBrowser();
  return Boolean(w?.speechSynthesis && w.SpeechSynthesisUtterance);
}

export function createSpeaker(): Speaker {
  return {
    speak(text, opts) {
      const w = getBrowser();
      if (!w?.speechSynthesis || !w.SpeechSynthesisUtterance) {
        return Promise.resolve();
      }
      w.speechSynthesis.cancel();
      const utterance = new w.SpeechSynthesisUtterance(text);
      utterance.lang = opts.lang;
      utterance.rate = opts.rate ?? 1;
      const promise = new Promise<void>((resolve, reject) => {
        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(new Error(e.error));
      });
      w.speechSynthesis.speak(utterance);
      return promise;
    },
    cancel() {
      const w = getBrowser();
      w?.speechSynthesis?.cancel();
    },
  };
}
