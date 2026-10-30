import { LANGUAGES } from "./words";
import { QUOTES, lengthOf, type Quote, type QuoteLength } from "./quotes";

const rnd = (n: number) => Math.floor(Math.random() * n);

export interface GenOptions {
  language: string;
  punctuation: boolean;
  numbers: boolean;
}

function randomNumber(): string {
  const digits = 1 + rnd(4);
  let s = String(1 + rnd(9));
  for (let i = 1; i < digits; i++) s += rnd(10);
  return s;
}

/** Random words, never repeating either of the previous two. `prev` continues an existing test. */
export function generateWords(count: number, o: GenOptions, prev: string[] = []): string[] {
  const list = LANGUAGES[o.language] ?? LANGUAGES.english;
  const out: string[] = [];
  const recent: string[] = [];
  let capNext = o.punctuation && (prev.length === 0 || /[.?!]["')]?$/.test(prev[prev.length - 1]));

  for (let i = 0; i < count; i++) {
    let w: string;
    if (o.numbers && Math.random() < 0.1) {
      w = randomNumber();
    } else {
      do w = list[rnd(list.length)];
      while (recent.includes(w));
      recent.push(w);
      if (recent.length > 2) recent.shift();
    }

    if (o.punctuation) {
      if (capNext) w = w[0].toUpperCase() + w.slice(1);
      capNext = false;
      const r = Math.random();
      if (r < 0.1) w += ",";
      else if (r < 0.16) (w += "."), (capNext = true);
      else if (r < 0.18) (w += "?"), (capNext = true);
      else if (r < 0.19) (w += "!"), (capNext = true);
      else if (r < 0.2) w += ";";
      else if (r < 0.21) w += ":";
      else if (r < 0.23) w = `"${w}"`;
      else if (r < 0.245) w = `(${w})`;
      else if (r < 0.255 && i > 0) out.push("-");
    }
    out.push(w);
  }
  return out;
}

/** Ends a punctuated test on a full stop. */
export function endSentence(words: string[]): void {
  const i = words.length - 1;
  if (i >= 0 && !/[.?!]["')]?$/.test(words[i])) words[i] = words[i].replace(/[,;:]$/, "") + ".";
}

let lastQuote = -1;
export function pickQuote(len: QuoteLength): Quote {
  const pool = QUOTES.map((q, i) => i).filter((i) => len === "all" || lengthOf(QUOTES[i]) === len);
  let i = pool[rnd(pool.length)];
  if (pool.length > 1) while (i === lastQuote) i = pool[rnd(pool.length)];
  lastQuote = i;
  return QUOTES[i];
}

/** Makes pasted text typable: straight quotes, plain dashes, single spaces. */
export function normalize(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\S\n]+|\n+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

export function customWords(text: string, shuffle: boolean): string[] {
  const words = normalize(text).split(" ").filter(Boolean);
  if (shuffle)
    for (let i = words.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [words[i], words[j]] = [words[j], words[i]];
    }
  return words;
}
