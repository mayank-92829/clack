import type { QuoteLength } from "./quotes";

export type Mode = "time" | "words" | "quote" | "custom";

export interface Settings {
  mode: Mode;
  time: number;
  words: number;
  quoteLength: QuoteLength;
  punctuation: boolean;
  numbers: boolean;
  language: string;
  theme: string;
  font: string;
  fontSize: number;
  caret: "line" | "block" | "underline";
  smoothCaret: boolean;
  liveWpm: boolean;
  liveAcc: boolean;
  sound: "off" | "click" | "soft";
  customText: string;
  customShuffle: boolean;
}

const DEFAULTS: Settings = {
  mode: "time",
  time: 30,
  words: 25,
  quoteLength: "all",
  punctuation: false,
  numbers: false,
  language: "english",
  theme: "dusk",
  font: "JetBrains Mono Variable",
  fontSize: 1.6,
  caret: "line",
  smoothCaret: true,
  liveWpm: true,
  liveAcc: false,
  sound: "off",
  customText: "The quick brown fox jumps over the lazy dog. Paste or type any text you like here.",
  customShuffle: false,
};

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

export const settings: Settings = { ...DEFAULTS, ...read<Partial<Settings>>("clack.settings", {}) };

export const saveSettings = () => write("clack.settings", settings);
