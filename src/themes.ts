export interface Theme {
  name: string;
  bg: string;
  alt: string; // panels, buttons
  sub: string; // untyped text, labels
  text: string; // typed text
  main: string; // caret, accents
  error: string;
  extra: string; // extra letters
}

export const THEMES: Theme[] = [
  { name: "dusk", bg: "#1b1d22", alt: "#24272e", sub: "#646a7a", text: "#d8dce4", main: "#e0b25c", error: "#ef6f6c", extra: "#9e4a49" },
  { name: "glacier", bg: "#1f2630", alt: "#28313d", sub: "#5d6a80", text: "#dbe3ee", main: "#7fc4dd", error: "#e8737d", extra: "#a04b54" },
  { name: "moss", bg: "#19201b", alt: "#222b24", sub: "#56705e", text: "#d4e2d6", main: "#93d48f", error: "#ec7a6f", extra: "#a8504a" },
  { name: "ember", bg: "#221c1a", alt: "#2d2522", sub: "#76645b", text: "#ecdccd", main: "#f08a4b", error: "#ff6262", extra: "#b03c3c" },
  { name: "plum", bg: "#241b28", alt: "#2f2334", sub: "#73607e", text: "#eadcf0", main: "#d98ce6", error: "#ff7088", extra: "#b04a5c" },
  { name: "lagoon", bg: "#10272b", alt: "#173338", sub: "#4f777d", text: "#d6eeee", main: "#4fd1c5", error: "#ff7a7a", extra: "#b04f4f" },
  { name: "mono", bg: "#121212", alt: "#1d1d1d", sub: "#5c5c5c", text: "#e6e6e6", main: "#ffffff", error: "#ff5c5c", extra: "#a33a3a" },
  { name: "paper", bg: "#f3efe6", alt: "#e7e1d4", sub: "#a39c8e", text: "#2f2c27", main: "#c2522d", error: "#d33a3a", extra: "#9c2a2a" },
  { name: "chalk", bg: "#fafafa", alt: "#ececec", sub: "#ababab", text: "#333333", main: "#2f6fde", error: "#e04848", extra: "#a33333" },
  { name: "sakura", bg: "#fbeff2", alt: "#f2dde3", sub: "#c095a2", text: "#4a2f38", main: "#e05a85", error: "#d6304a", extra: "#9e2236" },
];

export function themeByName(name: string): Theme {
  return THEMES.find((t) => t.name === name) ?? THEMES[0];
}

export function applyTheme(t: Theme): void {
  const s = document.documentElement.style;
  for (const k of ["bg", "alt", "sub", "text", "main", "error", "extra"] as const) s.setProperty(`--${k}`, t[k]);
  s.backgroundColor = t.bg;
}
