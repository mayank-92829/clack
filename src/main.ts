import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/roboto-mono";
import "./style.css";
import { settings, saveSettings, read, write, type Mode, type Settings } from "./settings";
import { THEMES, themeByName, applyTheme } from "./themes";
import { generateWords, endSentence, pickQuote, customWords, type GenOptions } from "./generator";
import { LANGUAGES } from "./words";
import { version } from "../package.json";
import { lengthOf, type Quote } from "./quotes";
import { drawChart, hoverIndex, type Sample } from "./chart";
import { playKey } from "./sound";
import { getCurrentWindow } from "@tauri-apps/api/window";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const body = document.body;
const root = document.documentElement;
const wordsEl = $("words");
const caret = document.createElement("div");
caret.id = "caret";
const testEl = $("test");
const resultEl = $("result");
const configEl = $("config");
const modal = $("modal");
const panel = $("panel");
const chart = $<HTMLCanvasElement>("chart");
const tip = $("tip");
const themeToggleBtn = $("themeToggleBtn");

// ---------------------------------------------------------------- test state

let targets: string[] = [];
let typed: string[] = [""];
let els: (HTMLElement | null)[] = [];
let idx = 0; // active word
let firstIdx = 0; // first word still in the DOM (earlier lines are removed as you type)
let lineH = 0;
let scrolling: Animation | null = null;
let started = false;
let finished = false;
let startAt = 0;
let timer = 0;
let idleTimer = 0;
let correctKeys = 0;
let wrongKeys = 0;
let secKeys = 0;
let secErrors = 0;
let samples: Sample[] = [];
let quote: Quote | null = null;

interface Result {
  wpm: number;
  raw: number;
  acc: number;
  consistency: number;
  time: number;
  chars: [number, number, number, number];
  type: string;
  key: string | null;
  date: number;
}
interface Best {
  wpm: number;
  acc: number;
  raw: number;
  date: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = (d: string) => `<svg viewBox="0 0 24 24">${d}</svg>`;
const ICON_EDIT = svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>');
const ICON_GLOBE = svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>');
const ICON_CROWN = svg('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>');
const ICON_X = svg('<path d="M6 6l12 12M18 6L6 18"/>');
const MODE_ICONS: Record<Mode, string> = {
  time: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>'),
  words: svg('<path d="M4 7V5h16v2M12 5v14M9 19h6"/>'),
  quote: svg('<path d="M10 7H5v6h4c0 2-1 3.5-3 4M19 7h-5v6h4c0 2-1 3.5-3 4"/>'),
  custom: svg('<path d="M4 6h10M4 12h16M4 18h7"/><path d="M18 3v6M15 6h6"/>'),
};
const CLOSE_BTN = `<button class="icon x" data-close title="Close (Esc)">${ICON_X}</button>`;
const ICON_SUN = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>');
const ICON_MOON = svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>');
const LIGHT_THEMES = new Set(["chalk", "paper", "sakura"]);
const isLightTheme = (name: string) => LIGHT_THEMES.has(name);
let isInitialLoad = true;

/** Letters of one word: correct, wrong (shows the expected letter), untyped, then extra letters. */
function wordHTML(t: string, s: string): string {
  let h = "";
  const n = Math.max(t.length, s.length);
  for (let i = 0; i < n; i++) {
    if (i >= t.length) h += `<letter class="x">${esc(s[i])}</letter>`;
    else if (i >= s.length) h += `<letter>${esc(t[i])}</letter>`;
    else h += `<letter class="${s[i] === t[i] ? "c" : "w"}">${esc(t[i])}</letter>`;
  }
  return h;
}

const genOptions = (): GenOptions => ({
  language: settings.language,
  punctuation: settings.punctuation,
  numbers: settings.numbers,
});

function buildTargets(): string[] {
  quote = null;
  switch (settings.mode) {
    case "time":
      return generateWords(100, genOptions());
    case "words": {
      const w = generateWords(settings.words, genOptions());
      if (settings.punctuation) endSentence(w);
      return w;
    }
    case "quote":
      quote = pickQuote(settings.quoteLength);
      return quote.text.split(" ");
    case "custom": {
      const w = customWords(settings.customText, settings.customShuffle);
      return w.length ? w : ["type", "some", "custom", "text", "first"];
    }
  }
}

function newTest(repeat = false): void {
  clearTimeout(timer);

  if (!repeat || !targets.length) targets = buildTargets();
  typed = [""];
  idx = firstIdx = 0;
  started = finished = false;
  correctKeys = wrongKeys = secKeys = secErrors = 0;
  samples = [];
  body.classList.remove("typing");
  resultEl.hidden = true;
  testEl.hidden = false;

  scrolling?.cancel();
  scrolling = null;
  wordsEl.innerHTML = targets.map((t) => `<div class="word">${wordHTML(t, "")}</div>`).join("");
  els = Array.from(wordsEl.children) as HTMLElement[];
  wordsEl.prepend(caret);
  lineH = parseFloat(getComputedStyle(wordsEl).fontSize) * 2;
  if (!isInitialLoad) {
    wordsEl.classList.add("fade");
    void wordsEl.offsetWidth;
    wordsEl.classList.remove("fade");
    placeCaret(true);
    caret.classList.add("blink");
  } else {
    caret.style.opacity = "0";
  }

  $("liveWpm").textContent = "";
  $("liveAcc").textContent = "";
  updateCounter();
  updateLangLabel();
}

function appendWords(): void {
  const more = generateWords(50, genOptions(), targets);
  wordsEl.insertAdjacentHTML("beforeend", more.map((t) => `<div class="word">${wordHTML(t, "")}</div>`).join(""));
  const kids = wordsEl.children;
  for (let k = kids.length - more.length; k < kids.length; k++) els.push(kids[k] as HTMLElement);
  targets.push(...more);
}

function placeCaret(instant = false): void {
  const el = els[idx];
  if (!el) return;
  const letters = el.children;
  const n = typed[idx].length;
  let x: number, y: number;
  if (n < letters.length) {
    const l = letters[n] as HTMLElement;
    x = l.offsetLeft;
    y = l.offsetTop;
  } else {
    const l = letters[letters.length - 1] as HTMLElement;
    x = l.offsetLeft + l.offsetWidth;
    y = l.offsetTop;
  }
  if (instant) {
    caret.classList.add("noanim");
    caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(() => {
      caret.classList.remove("noanim");
    });
  } else {
    caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}

/**
 * Keeps the active word on the first or second line: once you reach the third, the first line
 * slides up out of view and is then removed.
 */
function scrollLines(): void {
  if (scrolling) return;
  const el = els[idx];
  const first = els[firstIdx];
  if (!el || !first || el.offsetTop - first.offsetTop < lineH * 1.5) return;
  const top = first.offsetTop;
  const from = firstIdx;
  const gone: HTMLElement[] = [];
  for (let i = firstIdx; i < idx; i++) {
    const e = els[i]!;
    if (e.offsetTop !== top) break;
    gone.push(e);
  }
  firstIdx += gone.length; // those words can no longer be reopened with backspace
  const anim = wordsEl.animate([{ transform: "none" }, { transform: `translateY(${-lineH}px)` }], {
    duration: 140,
    easing: "cubic-bezier(0.25, 0.8, 0.3, 1)",
  });
  scrolling = anim;
  anim.onfinish = () => {
    if (scrolling !== anim) return;
    scrolling = null;
    for (const e of gone) e.remove();
    for (let i = 0; i < gone.length; i++) els[from + i] = null;
    placeCaret(true);
    scrollLines();
  };
}

function typingNow(): void {
  body.classList.add("typing");
  caret.classList.remove("blink");
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => caret.classList.add("blink"), 1000);
}

function redraw(): void {
  els[idx]!.innerHTML = wordHTML(targets[idx], typed[idx]);
  placeCaret();
  scrollLines();
  typingNow();
}

function sound(): void {
  if (settings.sound !== "off") playKey(settings.sound);
}

function start(): void {
  started = true;
  startAt = performance.now();
  scheduleTick();
}

function typeChar(c: string): void {
  if (!started) start();
  const t = targets[idx];
  const s = typed[idx];
  if (s.length >= t.length + 15) return;
  if (c === t[s.length]) correctKeys++;
  else wrongKeys++, secErrors++;
  secKeys++;
  typed[idx] = s + c;
  sound();
  redraw();
  if (settings.mode !== "time" && idx === targets.length - 1 && typed[idx] === t) finish();
}

function space(): void {
  const s = typed[idx];
  if (!started || !s) return;
  const ok = s === targets[idx];
  if (ok) correctKeys++;
  else wrongKeys++, secErrors++;
  secKeys++;
  sound();
  els[idx]!.classList.toggle("err", !ok);
  if (idx === targets.length - 1) return finish();
  idx++;
  typed[idx] = "";
  if (settings.mode === "time" && targets.length - idx < 40) appendWords();
  updateCounter();
  placeCaret();
  scrollLines();
  typingNow();
}

function backspace(wholeWord: boolean): void {
  if (!started) return;
  if (!typed[idx]) {
    // Only an incorrect previous word can be reopened, and only while it is still on screen.
    const p = idx - 1;
    if (p < firstIdx || typed[p] === targets[p]) return;
    typed.pop();
    idx = p;
    els[p]!.classList.remove("err");
    if (wholeWord) typed[idx] = "";
    updateCounter();
  } else {
    typed[idx] = wholeWord ? "" : typed[idx].slice(0, -1);
  }
  sound();
  redraw();
}

// ---------------------------------------------------------------- timing and stats

function scheduleTick(): void {
  const due = startAt + (samples.length + 1) * 1000;
  timer = window.setTimeout(tick, due - performance.now());
}

function tick(): void {
  pushSample(1);
  const sec = samples.length;
  if (settings.mode === "time" && sec >= settings.time) return finish();
  updateLive(sec);
  updateCounter();
  scheduleTick();
}

function pushSample(dur: number): void {
  const elapsed = samples.length + dur;
  samples.push({ wpm: Math.round(wpmAt(elapsed)), raw: Math.round((secKeys / 5) * (60 / dur)), errors: secErrors });
  secKeys = secErrors = 0;
}

/** Characters of correctly typed words plus their spaces, and the correct start of the current word. */
function correctChars(): number {
  let n = 0;
  for (let i = 0; i < idx; i++) if (typed[i] === targets[i]) n += targets[i].length + 1;
  const s = typed[idx];
  if (s && targets[idx].startsWith(s)) n += s.length;
  return n;
}

const wpmAt = (sec: number) => (sec > 0 ? (correctChars() / 5) * (60 / sec) : 0);
const accuracy = () => (correctKeys + wrongKeys ? (correctKeys / (correctKeys + wrongKeys)) * 100 : 100);

function updateLive(sec: number): void {
  $("liveWpm").textContent = settings.liveWpm ? String(Math.round(wpmAt(sec))) : "";
  $("liveAcc").textContent = settings.liveAcc ? `${Math.floor(accuracy())}%` : "";
}

function updateCounter(): void {
  $("counter").textContent =
    settings.mode === "time" ? String(settings.time - samples.length) : `${idx}/${targets.length}`;
}

function testType(): { label: string; key: string | null } {
  const s = settings;
  const extras = [s.punctuation && "punctuation", s.numbers && "numbers"].filter(Boolean) as string[];
  const flags = `${s.punctuation ? "p" : ""}${s.numbers ? "n" : ""}`;
  switch (s.mode) {
    case "time":
      return { label: [`time ${s.time}`, s.language, ...extras].join("\n"), key: `time ${s.time}|${s.language}|${flags}` };
    case "words":
      return { label: [`words ${s.words}`, s.language, ...extras].join("\n"), key: `words ${s.words}|${s.language}|${flags}` };
    case "quote": {
      const len = quote ? lengthOf(quote) : "all";
      return { label: `quote\n${len}`, key: `quote ${len}` };
    }
    case "custom":
      return { label: "custom", key: null };
  }
}

function finish(): void {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  clearTimeout(idleTimer);

  let elapsed: number = settings.time;
  if (settings.mode !== "time") {
    elapsed = (performance.now() - startAt) / 1000;
    const frac = elapsed - samples.length;
    if (frac > 0.5 || !samples.length) pushSample(Math.max(frac, 0.05));
    else samples[samples.length - 1].errors += secErrors;
  }

  let c = 0, w = 0, x = 0, m = 0, chars = 0;
  for (let i = 0; i <= idx; i++) {
    const t = targets[i], s = typed[i] ?? "";
    const complete = i < idx || settings.mode !== "time";
    for (let j = 0; j < Math.min(t.length, s.length); j++) s[j] === t[j] ? c++ : w++;
    if (s.length > t.length) x += s.length - t.length;
    else if (complete) m += t.length - s.length;
    chars += s.length;
  }
  const minutes = elapsed / 60;
  const safeMinutes = minutes > 0 ? minutes : 1 / 60;
  const raws = samples.map((s) => s.raw);
  const mean = raws.length ? raws.reduce((a, b) => a + b, 0) / raws.length : 0;
  const sd = raws.length ? Math.sqrt(raws.reduce((a, b) => a + (b - mean) ** 2, 0) / raws.length) : 0;
  const cv = mean ? sd / mean : 1;
  const type = testType();

  const r: Result = {
    wpm: (correctChars() / 5) / safeMinutes,
    raw: ((chars + idx) / 5) / safeMinutes,
    acc: accuracy(),
    consistency: mean ? 100 * (1 - Math.tanh(cv + cv ** 3 / 3 + cv ** 5 / 5)) : 0,
    time: elapsed,
    chars: [c, w, x, m],
    type: type.label,
    key: type.key,
    date: Date.now(),
  };
  showResult(r);
}

// ---------------------------------------------------------------- results

function showResult(r: Result): void {
  body.classList.remove("typing");
  testEl.hidden = true;
  resultEl.hidden = false;

  $("rWpm").textContent = String(Math.round(r.wpm));
  $("rWpm").title = `${r.wpm.toFixed(2)} wpm`;
  $("rAcc").textContent = `${Math.floor(r.acc)}%`;
  $("rAcc").title = `${r.acc.toFixed(2)}% (${correctKeys} correct, ${wrongKeys} incorrect keystrokes)`;
  $("rRaw").textContent = String(Math.round(r.raw));
  $("rChars").textContent = r.chars.join("/");
  $("rCons").textContent = `${Math.round(r.consistency)}%`;
  $("rTime").textContent = r.time < 10 ? `${r.time.toFixed(1)}s` : `${Math.round(r.time)}s`;
  $("rType").innerHTML = esc(r.type).replace(/\n/g, "<br>");
  $("rSource").textContent = quote ? `— ${quote.source}` : "";

  // Personal bests and history. Tests under 2 seconds or below 50% accuracy are not counted.
  const pb = $("rPb");
  pb.classList.remove("new");
  let pbText = "";
  const valid = r.time >= 2 && r.acc >= 50 && Number.isFinite(r.wpm);
  if (valid) {
    const history = read<Result[]>("clack.history", []);
    history.push(r);
    write("clack.history", history.slice(-500));
    if (r.key) {
      const bests = read<Record<string, Best>>("clack.pbs", {});
      const prev = bests[r.key];
      if (!prev || r.wpm > prev.wpm) {
        bests[r.key] = { wpm: r.wpm, acc: r.acc, raw: r.raw, date: r.date };
        write("clack.pbs", bests);
        pbText = prev ? `new personal best +${Math.round(r.wpm - prev.wpm)}` : "new personal best";
        pb.classList.add("new");
      } else {
        pbText = `best ${Math.round(prev.wpm)} wpm`;
      }
    }
  } else {
    pbText = "too short to count";
  }
  pb.innerHTML = pbText ? `${pb.classList.contains("new") ? ICON_CROWN : ""}<span>${pbText}</span>` : "";

  const words: string[] = [];
  for (let i = 0; i <= idx; i++) {
    const s = typed[i] ?? "";
    if (!s && i === idx) continue;
    const wrong = s !== targets[i] && (i < idx || settings.mode !== "time");
    words.push(`<div class="word${wrong ? " err" : ""}"${wrong ? ` title="${esc(s).replace(/"/g, "&quot;")}"` : ""}>${wordHTML(targets[i], s)}</div>`);
  }
  $("history").innerHTML = words.join("");
  $("history").hidden = true;
  $("historyBtn").classList.remove("on");

  tip.hidden = true;
  requestAnimationFrame(() => drawChart(chart, samples));
}

chart.addEventListener("mousemove", (e) => {
  if (!samples.length) return;
  const i = hoverIndex(chart, e.clientX, samples.length);
  drawChart(chart, samples, i);
  const s = samples[i];
  tip.innerHTML = `<div class="t-head">${i + 1}s</div><div>wpm <b>${s.wpm}</b></div><div>raw <b>${s.raw}</b></div><div>errors <b>${s.errors}</b></div>`;
  tip.hidden = false;
  const r = chart.getBoundingClientRect();
  const x = e.clientX - r.left;
  tip.style.left = `${x > r.width / 2 ? x - tip.offsetWidth - 14 : x + 14}px`;
});
chart.addEventListener("mouseleave", () => {
  tip.hidden = true;
  drawChart(chart, samples);
});

// ---------------------------------------------------------------- config bar

function renderConfig(): void {
  const s = settings;
  const opt = (label: string, act: string, on: boolean, icon = "") =>
    `<button class="opt${on ? " on" : ""}" data-act="${act}">${icon}${label}</button>`;
  let h = "";
  if (s.mode === "time" || s.mode === "words")
    h +=
      `<div class="group">${opt('<span class="glyph">@</span>punctuation', "punct", s.punctuation)}` +
      `${opt('<span class="glyph">#</span>numbers', "nums", s.numbers)}</div><div class="sep"></div>`;
  h += `<div class="group">${(["time", "words", "quote", "custom"] as Mode[]).map((m) => opt(m, `mode:${m}`, s.mode === m, MODE_ICONS[m])).join("")}</div>`;
  h += `<div class="sep"></div><div class="group">`;
  if (s.mode === "time") h += [15, 30, 60, 120].map((n) => opt(String(n), `time:${n}`, s.time === n)).join("");
  if (s.mode === "words") h += [10, 25, 50, 100].map((n) => opt(String(n), `words:${n}`, s.words === n)).join("");
  if (s.mode === "quote")
    h += (["all", "short", "medium", "long"] as const).map((l) => opt(l, `quote:${l}`, s.quoteLength === l)).join("");
  if (s.mode === "custom") h += opt("edit text", "edit", false, ICON_EDIT);
  configEl.innerHTML = h + "</div>";
}

configEl.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!b) return;
  const [k, v] = b.dataset.act!.split(":");
  if (k === "edit") return openCustom();
  if (k === "punct") settings.punctuation = !settings.punctuation;
  if (k === "nums") settings.numbers = !settings.numbers;
  if (k === "mode") settings.mode = v as Mode;
  if (k === "time") settings.time = Number(v);
  if (k === "words") settings.words = Number(v);
  if (k === "quote") settings.quoteLength = v as Settings["quoteLength"];
  saveSettings();
  renderConfig();
  newTest();
});

// ---------------------------------------------------------------- appearance

function applyAppearance(): void {
  applyTheme(themeByName(settings.theme));
  root.style.setProperty("--font", `"${settings.font}", ui-monospace, Consolas, monospace`);
  root.style.setProperty("--size", `${settings.fontSize}rem`);
  caret.classList.remove("line", "block", "underline");
  caret.classList.add(settings.caret);
  caret.classList.toggle("smooth", settings.smoothCaret);
  $("themeBtn").innerHTML =
    `<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:6px"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>${settings.theme}`;
  if (themeToggleBtn) {
    const light = isLightTheme(settings.theme);
    themeToggleBtn.innerHTML = light ? ICON_MOON : ICON_SUN;
    themeToggleBtn.title = light ? "Switch to default dark mode (dusk)" : "Switch to light mode (chalk)";
  }
}

function toggleTheme(): void {
  if (isLightTheme(settings.theme)) {
    settings.theme = "dusk";
  } else {
    settings.theme = "chalk";
  }
  saveSettings();
  applyAppearance();
}

// ---------------------------------------------------------------- modals

let resumeAfterModal = false;

function openModal(html: string): void {
  if (started && !finished) {
    clearTimeout(timer);
    finished = true; // abandoned; the same words come back when the modal closes
    resumeAfterModal = true;
  }
  body.classList.remove("typing");
  panel.innerHTML = CLOSE_BTN + html;
  panel.scrollTop = 0;
  modal.hidden = false;
}

function closeModal(): void {
  modal.hidden = true;
  if (!resultEl.hidden) requestAnimationFrame(() => drawChart(chart, samples));
  else if (resumeAfterModal) newTest(true);
  resumeAfterModal = false;
}

modal.addEventListener("mousedown", (e) => {
  if (e.target === modal) closeModal();
});

type Opt = [Settings[keyof Settings], string];
const ROWS: { key: keyof Settings; name: string; desc?: string; opts: Opt[]; section?: string }[] = [
  { section: "test", key: "language", name: "word list", desc: "used by time and words tests", opts: [["english", "english 200"], ["english 1k", "english 1k"]] },
  { key: "liveWpm", name: "live wpm", desc: "speed above the words, updated every second", opts: [[true, "show"], [false, "hide"]] },
  { key: "liveAcc", name: "live accuracy", opts: [[true, "show"], [false, "hide"]] },
  { key: "sound", name: "key sound", desc: "synthesized, no audio files", opts: [["off", "off"], ["click", "click"], ["soft", "soft"]] },
  { section: "appearance", key: "font", name: "font", opts: [["JetBrains Mono Variable", "jetbrains mono"], ["Roboto Mono Variable", "roboto mono"], ["Consolas", "consolas"], ["Segoe UI", "segoe ui"]] },
  { key: "fontSize", name: "font size", opts: [[1.25, "small"], [1.6, "medium"], [2, "large"], [2.5, "huge"]] },
  { key: "caret", name: "caret", opts: [["line", "line"], ["block", "block"], ["underline", "underline"]] },
  { key: "smoothCaret", name: "smooth caret", desc: "the caret glides between letters", opts: [[true, "on"], [false, "off"]] },
];

function settingsHTML(): string {
  const rows = ROWS.map(
    (r, ri) =>
      (r.section ? `<h3>${r.section}</h3>` : "") +
      `<div class="row"><div><div class="name">${r.name}</div>${r.desc ? `<div class="desc">${r.desc}</div>` : ""}</div>` +
      `<div class="seg">${r.opts
        .map(([v, label], oi) => `<button class="btn${settings[r.key] === v ? " on" : ""}" data-row="${ri}" data-opt="${oi}">${label}</button>`)
        .join("")}</div></div>`,
  ).join("");
  const themes = THEMES.map(
    (t) =>
      `<button class="swatch${settings.theme === t.name ? " on" : ""}" data-theme="${t.name}" style="background:${t.bg};color:${t.text}">` +
      `${t.name}<span class="dots"><i style="background:${t.main}"></i><i style="background:${t.sub}"></i><i style="background:${t.error}"></i></span></button>`,
  ).join("");
  return `<h2>settings</h2>${rows}<h3>theme</h3><div class="themes">${themes}</div>`;
}

function openSettings(): void {
  openModal(settingsHTML());
}

panel.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!b) return;
  if (b.dataset.close !== undefined) return closeModal();
  if (b.dataset.row) {
    const row = ROWS[Number(b.dataset.row)];
    (settings as unknown as Record<string, unknown>)[row.key] = row.opts[Number(b.dataset.opt)][0];
  } else if (b.dataset.theme) {
    settings.theme = b.dataset.theme;
  } else return;
  saveSettings();
  applyAppearance();
  if (b.dataset.row && ["language", "font", "fontSize"].includes(ROWS[Number(b.dataset.row)].key)) resumeAfterModal = true;
  if (b.dataset.row && ROWS[Number(b.dataset.row)].key === "language") targets = [];
  const top = panel.scrollTop;
  panel.innerHTML = CLOSE_BTN + settingsHTML();
  panel.scrollTop = top;
});

function openCustom(): void {
  openModal(
    `<h2>custom text</h2><textarea id="customText" spellcheck="false" placeholder="paste or type any text">${esc(settings.customText)}</textarea>` +
      `<div class="panel-foot"><label class="check"><input type="checkbox" id="customShuffle"${settings.customShuffle ? " checked" : ""}> shuffle words</label>` +
      `<span class="hint">ctrl + enter to start</span><button class="btn primary" id="customGo">start</button></div>`,
  );
  const ta = $<HTMLTextAreaElement>("customText");
  const go = () => {
    settings.customText = ta.value;
    settings.customShuffle = $<HTMLInputElement>("customShuffle").checked;
    settings.mode = "custom";
    saveSettings();
    renderConfig();
    resumeAfterModal = false;
    modal.hidden = true;
    newTest();
  };
  $("customGo").addEventListener("click", go);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      go();
    }
  });
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

function openStats(): void {
  const history = read<Result[]>("clack.history", []);
  const bests = read<Record<string, Best>>("clack.pbs", {});
  const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const recent = history.slice(-10);
  const avg = recent.length ? recent.reduce((a, r) => a + r.wpm, 0) / recent.length : 0;
  const top = history.reduce((a, r) => Math.max(a, r.wpm), 0);
  const seconds = history.reduce((a, r) => a + r.time, 0);
  const time = seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m` : `${Math.round(seconds / 60)}m`;
  const tile = (label: string, v: string) => `<div class="tile"><div class="r-label">${label}</div><div class="v">${v}</div></div>`;

  const order = (k: string) => (k.startsWith("time") ? 0 : k.startsWith("words") ? 1 : 2);
  const pbRows = Object.entries(bests)
    .sort(([a], [b]) => order(a) - order(b) || parseInt(a.split(" ")[1]) - parseInt(b.split(" ")[1]) || a.localeCompare(b))
    .map(([k, b]) => {
      const [mode, lang, flags] = k.split("|");
      const extra = [lang, flags?.includes("p") && "punctuation", flags?.includes("n") && "numbers"].filter(Boolean).join(", ");
      return `<tr><td>${mode}</td><td>${extra}</td><td class="hi">${Math.round(b.wpm)}</td><td>${Math.floor(b.acc)}%</td><td>${day(b.date)}</td></tr>`;
    })
    .join("");
  const recentRows = history
    .slice(-15)
    .reverse()
    .map(
      (r) =>
        `<tr><td class="hi">${Math.round(r.wpm)}</td><td>${Math.round(r.raw)}</td><td>${Math.floor(r.acc)}%</td><td>${Math.round(r.consistency)}%</td><td>${esc(r.type.replace(/\n/g, " "))}</td><td>${day(r.date)}</td></tr>`,
    )
    .join("");

  openModal(
    `<h2>stats</h2><div class="tiles">${tile("tests", String(history.length))}${tile("time typing", time)}` +
      `${tile("avg wpm (last 10)", String(Math.round(avg)))}${tile("highest wpm", String(Math.round(top)))}</div>` +
      `<h3>personal bests</h3>${pbRows ? `<table><tr><th>test</th><th></th><th>wpm</th><th>acc</th><th>date</th></tr>${pbRows}</table>` : `<div class="empty">finish a test to set one</div>`}` +
      `<h3>recent tests</h3>${recentRows ? `<table><tr><th>wpm</th><th>raw</th><th>acc</th><th>consistency</th><th>test</th><th>date</th></tr>${recentRows}</table>` : `<div class="empty">no tests yet</div>`}` +
      `${history.length ? `<div class="panel-foot"><span></span><button class="btn" id="resetStats">reset stats</button></div>` : ""}`,
  );
  const reset = document.getElementById("resetStats");
  reset?.addEventListener("click", () => {
    if (reset.dataset.armed) {
      write("clack.history", []);
      write("clack.pbs", {});
      openStats();
    } else {
      reset.dataset.armed = "1";
      reset.textContent = "click again to delete all stats";
    }
  });
}

// ---------------------------------------------------------------- input and wiring

document.addEventListener("keydown", (e) => {
  if (e.getModifierState) $("caps").hidden = !e.getModifierState("CapsLock");
  if (!modal.hidden) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    return newTest(e.shiftKey);
  }
  if (e.key === "Escape") {
    e.preventDefault();
    return openSettings();
  }
  if (!resultEl.hidden) {
    if (e.key === "Enter") {
      e.preventDefault();
      newTest();
    }
    return;
  }
  if (finished) return;
  if (e.key === "Backspace") {
    e.preventDefault();
    return backspace(e.ctrlKey || e.altKey);
  }
  const altGr = e.ctrlKey && e.altKey;
  if ((e.ctrlKey || e.metaKey || e.altKey) && !altGr) return;
  if (e.key === " ") {
    e.preventDefault();
    return space();
  }
  if (e.key.length === 1) {
    e.preventDefault();
    typeChar(e.key);
  }
});

// Buttons never keep focus, so Space and Enter always go to the test.
document.addEventListener("mousedown", (e) => {
  if ((e.target as HTMLElement).closest("button")) e.preventDefault();
});
document.addEventListener("mousemove", (e) => {
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) body.classList.remove("typing");
});
window.addEventListener("blur", () => {
  if (!isInitialLoad && !document.documentElement.classList.contains("preload")) {
    body.classList.add("blurred");
  }
});
window.addEventListener("focus", () => body.classList.remove("blurred"));
window.addEventListener("resize", () => {
  if (!resultEl.hidden) drawChart(chart, samples);
  else placeCaret(true);
});
if (!import.meta.env.DEV) document.addEventListener("contextmenu", (e) => e.preventDefault());

$("restartBtn").addEventListener("click", () => newTest());
$("nextBtn").addEventListener("click", () => newTest());
$("repeatBtn").addEventListener("click", () => newTest(true));
$("historyBtn").addEventListener("click", () => {
  const h = $("history");
  h.hidden = !h.hidden;
  $("historyBtn").classList.toggle("on", !h.hidden);
});
$("settingsBtn").addEventListener("click", openSettings);
$("themeBtn").addEventListener("click", openSettings);
$("statsBtn").addEventListener("click", openStats);
themeToggleBtn?.addEventListener("click", toggleTheme);

function updateLangLabel(): void {
  const l = $("langLabel");
  const s = settings;
  l.classList.toggle("static", s.mode === "quote");
  l.title = s.mode === "custom" ? "Edit custom text" : s.mode === "quote" ? "" : "Switch word list";
  l.innerHTML =
    s.mode === "quote"
      ? `${MODE_ICONS.quote}${quote ? lengthOf(quote) : ""} quote`
      : s.mode === "custom"
        ? `${ICON_EDIT}custom text${s.customShuffle ? ", shuffled" : ""}`
        : `${ICON_GLOBE}${s.language}`;
}

$("langLabel").addEventListener("click", () => {
  if (settings.mode === "custom") return openCustom();
  if (settings.mode === "quote") return;
  const names = Object.keys(LANGUAGES);
  settings.language = names[(names.indexOf(settings.language) + 1) % names.length];
  saveSettings();
  newTest();
});

$("version").textContent = `v${version}`;

// The desktop app draws its own title bar so it matches the theme.
const isTauri = "__TAURI_INTERNALS__" in window;
if (isTauri) {
  const win = getCurrentWindow();
  body.classList.add("tauri");
  $("titlebar").hidden = false;
  $("wMin").addEventListener("click", () => win.minimize());
  $("wMax").addEventListener("click", () => win.toggleMaximize());
  $("wClose").addEventListener("click", () => win.close());
}

applyAppearance();
renderConfig();
newTest();
document.fonts.ready.then(() => {
  lineH = parseFloat(getComputedStyle(wordsEl).fontSize) * 2;
  caret.style.opacity = "";
  placeCaret(true);
  caret.classList.add("blink");
  isInitialLoad = false;
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("preload");
  });
  // The window starts hidden so it never flashes the wrong theme.
  if (isTauri) getCurrentWindow().show();
});
