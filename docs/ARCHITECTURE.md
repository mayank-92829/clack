# How Clack works

This document explains every part of Clack: what each file does, how the typing engine works, how the numbers are calculated, and why things were done the way they were. Read it top to bottom once, and you should be able to change anything — or rebuild the app from an empty folder.

## 1. The big picture

Clack is a **web page running inside a native window**.

```
┌──────────────────────── Clack.exe (Rust, Tauri 2) ─────────────────────────┐
│  creates the window, keeps one instance running, nothing else              │
│  ┌──────────────────── WebView2 (Edge engine) ──────────────────────────┐  │
│  │  index.html + style.css + main.ts (compiled to one small JS file)    │  │
│  │  - all typing logic, stats, results, settings                        │  │
│  │  - data saved in localStorage (inside the WebView's profile folder)  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Tauri** gives us a tiny native `.exe` (≈3 MB) that opens a window and shows our web page using the WebView2 engine built into Windows. Compared with Electron (which ships a whole Chromium, ~150 MB), it's very light.
- The **Rust side does almost nothing** (`src-tauri/src/lib.rs`): it starts the app, focuses the existing window if you launch it twice, and makes sure the window becomes visible.
- **Everything the user sees and does is plain TypeScript** with no UI framework. A typing test has to react to every keystroke in well under a frame, and updating the DOM by hand keeps that fast and predictable.
- **Vite** bundles the TypeScript, CSS and fonts into `dist/`, and Tauri embeds `dist/` inside the `.exe`. Nothing is loaded from the internet.

## 2. File map

| File | What it contains |
|---|---|
| `index.html` | The static skeleton: title bar, header, config bar slot, test area, results section, footer, modal container. |
| `src/main.ts` | The app: typing engine, timer, statistics, results screen, config bar, settings / stats / custom-text panels, keyboard handling, window controls. |
| `src/style.css` | All styling. Colours come from CSS variables set by the theme. |
| `src/settings.ts` | The `Settings` type, defaults, and `read`/`write` helpers around `localStorage`. |
| `src/themes.ts` | The 10 themes (7 colours each) and `applyTheme`, which writes them into CSS variables. |
| `src/words.ts` | Word lists ("english" = 200 most common words, "english 1k" = 1000). |
| `src/quotes.ts` | Quotes with their source, and `lengthOf` (short ≤ 100 chars, medium ≤ 250, long above). |
| `src/generator.ts` | Builds the text for a test: random words, punctuation, numbers, quote picking, custom-text cleanup. |
| `src/chart.ts` | Draws the results chart on a `<canvas>` and finds the hovered second. |
| `src/sound.ts` | Key sounds made with the Web Audio API (no sound files). |
| `src-tauri/tauri.conf.json` | Window size, frameless window, security policy, installer settings. |
| `src-tauri/capabilities/default.json` | Which window APIs the page may call (show, minimize, maximize, close, drag). |
| `src-tauri/src/lib.rs` | Rust entry: single-instance plugin, a fallback that shows the window. |
| `docs/*.png` | README screenshots. |

## 3. The typing engine (`src/main.ts`)

### 3.1 State

All test state is a handful of module-level variables:

```ts
let targets: string[]   // the words you must type: ["the", "quick", ...]
let typed: string[]     // what you typed for each word so far: ["the", "quic"]
let els: (HTMLElement | null)[] // the <div class="word"> for each target (null once removed)
let idx                 // index of the active word
let firstIdx            // first word still in the DOM (earlier lines are removed)
let started, finished   // test lifecycle
let startAt             // performance.now() at the first keystroke
let correctKeys, wrongKeys  // every keystroke, for accuracy
let secKeys, secErrors  // keystrokes / errors in the current second, for the chart
let samples: Sample[]   // one {wpm, raw, errors} per second
```

Keeping `targets` and `typed` as two parallel arrays makes every calculation a simple loop: word *i* is correct when `typed[i] === targets[i]`.

### 3.2 Rendering words

Each word is a `<div class="word">` holding one `<letter>` element per character (`<letter>` is just a custom inline tag; any unknown tag works and it keeps the HTML short). `wordHTML(target, typed)` decides each letter's class:

| Situation | Class | Colour |
|---|---|---|
| not typed yet | none | `--sub` (dim) |
| typed and matches | `c` | `--text` |
| typed but wrong | `w` | `--error` — shows the **expected** letter in red, so you see what you should have typed |
| typed beyond the word's length | `x` | `--extra` — shows the extra letter you typed |

**Performance rule:** on each keystroke only the *active word* is re-rendered (`redraw()` replaces one word's `innerHTML`, which is a few letters). The other words are never touched. That's why typing stays instant even with hundreds of words.

### 3.3 Keyboard input

A single `keydown` listener on `document` handles everything:

- `Tab` → new test, `Shift+Tab` → same words again, `Esc` → settings.
- On the results screen, only `Enter`/`Tab` do something.
- `Backspace` → `backspace()`; with `Ctrl` (or `Alt`) it deletes the whole word.
- Space → `space()` (finishes the word).
- Any single character (`e.key.length === 1`) → `typeChar()`.
- Shortcuts with `Ctrl`/`Alt`/`Meta` are ignored, **except** `Ctrl+Alt` together, because that's how AltGr reports itself on European layouts (`@`, `€` etc.).

Every handled key calls `preventDefault()` so the browser doesn't scroll on Space or move focus on Tab. Buttons call `preventDefault()` on `mousedown` so they never keep keyboard focus — otherwise pressing Space after clicking a button would "click" it again.

### 3.4 What each key does

**`typeChar(c)`**
1. Start the timer on the very first keystroke.
2. Compare `c` with the expected letter → count it in `correctKeys` or `wrongKeys`/`secErrors`.
3. Append it to `typed[idx]` (at most 15 extra letters beyond the word).
4. Re-render the word, move the caret.
5. In words/quote/custom modes, if this was the last word and it's now exactly right, finish immediately (you don't have to press space at the end).

**`space()`**
- Ignored if the current word is empty (you can't skip words by mashing space).
- Counts as a correct keystroke if the word was right, otherwise as an error.
- Marks a wrong word with the `err` class (red underline), moves to the next word.
- In time mode, generates 50 more words when fewer than 40 are left, so the text never runs out.

**`backspace(wholeWord)`**
- Inside a word: delete one letter (or the whole word).
- At the start of a word: go back to the previous word **only if it was wrong** and it's still on screen. Correct words are locked — the same rule Monkeytype uses, which stops you from "fixing" text you already got right.

### 3.5 The caret

The caret is one absolutely positioned `<div id="caret">` inside `#words`. `placeCaret()` reads the position of the next letter (`offsetLeft`/`offsetTop`; or the right edge of the last letter if the word is complete) and sets `transform: translate3d(x, y, 0)`. Using `transform` instead of `left/top` lets the GPU move it, and the CSS `transition: transform 0.1s` makes it glide (the "smooth caret" setting toggles that class). When we need it to jump without animating (new test, after a line scroll) the `noanim` class is added for one frame.

The caret blinks only when you're idle: `typingNow()` removes the `blink` class and sets a 1-second timer to add it back.

### 3.6 Three visible lines and smooth scrolling

`#wrap` has `height: 6em` and `overflow: hidden`, and every word line is exactly `2em` (1.5em word + 0.25em margin above and below), so exactly three lines are visible.

`scrollLines()` runs after every caret move. When the active word reaches the **third** line, it:
1. collects all words on the first line,
2. bumps `firstIdx` immediately (so backspace can't go back into them),
3. animates `#words` upward by one line (`element.animate(...)`, 140 ms),
4. when the animation finishes, removes those word elements and re-places the caret instantly.

Because the removed line had already slid out of view, removing it and ending the animation happen in the same frame and nothing visibly jumps. Removing old words also keeps the DOM small during long tests.

### 3.7 The timer and per-second samples

`start()` saves `startAt = performance.now()` and schedules ticks. Each tick is scheduled for **exactly** `startAt + n × 1000 ms` (not "1000 ms after the previous tick"), so small delays never add up into drift.

On every tick `pushSample()` stores one entry for the chart:

```
wpm    = WPM so far (from all correct characters)
raw    = keystrokes in this second ÷ 5 × 60
errors = mistakes in this second
```

In time mode the test ends on the tick that reaches the chosen duration. In the other modes it ends on the last word; the final partial second becomes its own sample if it's longer than half a second, otherwise its errors are merged into the previous one.

## 4. How the numbers are calculated (`finish()`)

These match how Monkeytype and most typing tests count:

| Number | Formula |
|---|---|
| **WPM** | `correctChars / 5 / minutes`. `correctChars` = letters of every fully correct word **plus one space after each**, plus the correct beginning of the word you were typing when time ran out. Dividing by 5 converts characters into "standard words". |
| **Raw WPM** | `(all typed letters + spaces) / 5 / minutes` — speed regardless of mistakes. |
| **Accuracy** | `correctKeys / (correctKeys + wrongKeys)`. Every keystroke counts, so a mistake you fixed still lowers accuracy. |
| **Characters** | `correct / incorrect / extra / missed`, counted letter by letter over the final text. "Missed" = letters you skipped by pressing space early. |
| **Consistency** | How steady your speed was. Take the per-second raw speeds, compute the coefficient of variation `cv = standard deviation / mean`, then `100 × (1 − tanh(cv + cv³/3 + cv⁵/5))`. Perfectly even typing gives 100%; erratic typing approaches 0%. |

A result is saved only if the test lasted ≥ 2 seconds and accuracy ≥ 50% — otherwise random key-mashing would pollute your stats.

## 5. Generating the text (`src/generator.ts`)

- **Random words:** pick from the chosen list, re-rolling if the word equals either of the previous two, so you never get "the the".
- **Numbers** (if on): each word has a 10% chance to become a 1–4 digit number.
- **Punctuation** (if on): after picking a word, a random roll may add `, . ? ! ; :`, wrap it in `"…"` or `(…)`, or insert a standalone `-`. After `. ? !` the next word is capitalised, and the very first word is too. Words tests end with a full stop (`endSentence`).
- **Time mode** generates 100 words up front, then 50 more at a time (`appendWords`), continuing the sentence state from the previous words.
- **Quotes:** `pickQuote` filters by length group and never returns the same quote twice in a row.
- **Custom text:** `normalize` turns curly quotes into straight ones, long dashes into `-`, `…` into `...`, removes anything that isn't printable ASCII, and collapses all whitespace (including newlines) into single spaces. Optional shuffle uses the Fisher–Yates algorithm.

## 6. Results screen

`showResult()` fills in the numbers, then:

- **History and personal bests.** The result is appended to `clack.history` (last 500 kept). Personal bests are stored per *test key*, e.g. `time 30|english|p` (mode + length, word list, `p` for punctuation, `n` for numbers), so a 15-second PB never competes with a 60-second one. Custom-text tests have no PB.
- **Chart** (`src/chart.ts`): a hand-drawn canvas. It scales by `devicePixelRatio` so it stays sharp on high-DPI screens, reads the theme colours from CSS variables at draw time, draws grid lines, the raw line, the filled WPM line, and an `×` for every second with errors (right-hand axis). Hovering redraws with a highlight and fills the tooltip.
- **Typed words:** every word you typed is rendered again with the same `wordHTML`, wrong ones underlined; hovering a wrong word shows what you actually typed.

## 7. Settings, themes and storage

- `settings` is one plain object loaded at startup as `{ ...DEFAULTS, ...saved }`, so new settings added in later versions get their defaults automatically. Every change calls `saveSettings()`.
- **localStorage keys:** `clack.settings`, `clack.history`, `clack.pbs`. In the desktop app these live in the WebView2 profile under `%LOCALAPPDATA%\com.clack.typing\`. All reads/writes are wrapped in `try/catch` so a broken storage never breaks the app.
- **Themes** are 7 colours: `bg`, `alt` (panels), `sub` (untyped text, labels), `text` (typed text), `main` (accent and caret), `error`, `extra`. `applyTheme` writes them as CSS variables on `<html>`; every colour in `style.css` uses those variables, so switching theme is instant and needs no re-render.
- **Fonts** JetBrains Mono and Roboto Mono are bundled through `@fontsource-variable` packages (imported at the top of `main.ts`), so they work offline. Consolas and Segoe UI come from Windows.
- **Modals** (settings, stats, custom text) share one container. Opening one in the middle of a test abandons it; closing brings back the same words (`resumeAfterModal`).

## 8. The desktop shell

- The window is **frameless** (`decorations: false`) so the page can draw a title bar in the theme's colours (`#titlebar` in `index.html`). Dragging works because the elements have `data-tauri-drag-region`; the three buttons call `getCurrentWindow().minimize() / toggleMaximize() / close()` from `@tauri-apps/api`. Each of those calls needs a permission in `capabilities/default.json`.
- The window starts **hidden** (`visible: false`) and the page calls `show()` once fonts are loaded and the first frame is drawn. That avoids a white or wrong-colour flash at startup. In case the page fails to load, `lib.rs` shows the window after 3 seconds anyway.
- `tauri-plugin-single-instance` makes a second launch focus the existing window.
- The page detects the desktop app with `"__TAURI_INTERNALS__" in window`. In a normal browser (`npm run dev`) the title bar stays hidden and everything else works the same.
- **Security policy (CSP)** in `tauri.conf.json` only allows the app's own scripts, styles and fonts — the page can't load anything from the internet.

## 9. Why these choices

| Choice | Reason |
|---|---|
| Tauri instead of Electron | ~3 MB app / 1.3 MB installer vs ~150 MB, ~30 MB RAM, starts instantly. |
| No UI framework | Typing needs one tiny DOM update per key; doing it by hand is the fastest possible and easy to reason about. The whole app is ~800 lines. |
| Canvas chart instead of a chart library | One small chart doesn't justify a 200 KB dependency. |
| Synthesized sounds | No audio files to ship or load; Web Audio plays filtered noise bursts with ~0 latency. |
| localStorage | The data is tiny (settings + a few hundred results); no database or file I/O needed. |
