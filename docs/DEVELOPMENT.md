# Developing Clack

How to set up, run, change, build and release Clack. For how the code works, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. One-time setup (Windows)

| Tool | Why | Get it |
|---|---|---|
| Node.js 20+ | runs Vite and the Tauri CLI | nodejs.org (LTS installer) |
| Rust (MSVC toolchain) | compiles the native app | rustup.rs → `rustup default stable-msvc` |
| Visual Studio Build Tools | C++ linker that Rust needs on Windows | "Desktop development with C++" workload |
| WebView2 | the browser engine the app uses | already in Windows 11 |

Then, in the project folder:

```bash
npm install
```

## 2. Everyday commands

```bash
npm run dev            # browser only: http://127.0.0.1:1430 (fastest for UI work, hot reload)
npm run tauri dev      # the real desktop window, hot reload for the page
npm run build          # type-check (tsc) + bundle the page into dist/
npm run tauri build    # release app + installer
```

The first `tauri dev`/`tauri build` compiles all Rust dependencies (a few minutes). Later builds take about a minute.

**Tip:** most work is UI work — use `npm run dev` in a browser. Your settings and history there are separate from the desktop app's.

**Debugging the desktop app:** in `tauri dev`, right-click → Inspect opens DevTools. In release builds DevTools and the right-click menu are disabled.

## 3. Build output

After `npm run tauri build`:

```
src-tauri/target/release/Clack.exe                                  the app itself (portable)
src-tauri/target/release/bundle/nsis/Clack_<version>_x64-setup.exe  the installer
```

The installer is per-user (no admin) and downloads WebView2 if a machine doesn't have it.

## 4. Releasing a new version

1. Bump the version in **three** places (they must match):
   `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
2. Add an entry at the top of `CHANGELOG.md`.
3. `npm run tauri build`.
4. Commit and push: `git commit -am "Release x.y.z" && git push`.
5. On GitHub → Releases → *Draft a new release* → tag `vx.y.z` → upload:
   - `Clack_x.y.z_x64-setup.exe` (installer)
   - `Clack.exe` renamed to `Clack_x.y.z_x64_portable.exe`
   - `SHA256SUMS.txt` — make it with `sha256sum Clack_*.exe > SHA256SUMS.txt` (Git Bash)
6. If you change the look, refresh the README screenshots in `docs/`.

## 5. Common changes

### Add a theme
Add one line to `THEMES` in `src/themes.ts`:

```ts
{ name: "ocean", bg: "#0f1b2a", alt: "#16263a", sub: "#4f6a85", text: "#dce8f5", main: "#5fb3ff", error: "#ff6b7a", extra: "#a84a55" },
```

It appears in Settings automatically. Keep `sub` readable on `bg` but clearly dimmer than `text`.

### Add a quote
Add `{ text, source }` to `QUOTES` in `src/quotes.ts`. Use plain ASCII (straight quotes `'` `"`, `-` instead of long dashes). The length group is computed automatically.

### Add a word list
Add a long string of words to `src/words.ts` and register it in `LANGUAGES`, then add an option to the `language` row in `ROWS` (in `src/main.ts`). Clicking the label above the words cycles through all lists.

### Add a setting
1. Add the field and its default to `Settings` / `DEFAULTS` in `src/settings.ts`.
2. Add a row to `ROWS` in `src/main.ts` (`key`, `name`, optional `desc`, and `opts` as `[value, label]` pairs; `section` starts a new heading).
3. Use `settings.yourField` where it matters. If it changes appearance, apply it in `applyAppearance()`.

### Add a test duration or word count
Edit the arrays in `renderConfig()` (`[15, 30, 60, 120]` and `[10, 25, 50, 100]`).

### Change the window
Size, minimum size and startup behaviour live in `src-tauri/tauri.conf.json` → `app.windows`. If you call a new window API from the page, add its permission to `src-tauri/capabilities/default.json` (look up the name in the Tauri docs: `core:window:allow-<command>`).

## 6. Checklist before a release

- [ ] `npm run build` passes (no TypeScript errors).
- [ ] Time, words, quote and custom modes each finish and show results.
- [ ] Backspace can't enter a correct previous word; `Ctrl+Backspace` clears a word.
- [ ] Long time test (60 s+) scrolls lines smoothly and the caret stays on the letters.
- [ ] Theme, font and font-size changes apply instantly and survive a restart.
- [ ] Desktop app: title bar drag, double-click maximize, minimize and close work.

## 7. Rebuilding from scratch (learning path)

If you want to write Clack yourself, build it in this order — each step is runnable:

1. **Static page:** show a list of words as `<span>`s. Listen to `keydown`, colour letters green/red.
2. **Words and state:** split into `targets` / `typed` arrays, handle space and backspace (§3.4 of ARCHITECTURE).
3. **Caret:** an absolute `<div>` moved with `transform` to the next letter's `offsetLeft/offsetTop`.
4. **Timer and WPM:** start on first key, compute WPM/accuracy with the formulas in §4.
5. **Results screen** with the numbers; then the canvas chart from per-second samples.
6. **Modes and generator:** time vs words, then quotes, punctuation, numbers, custom text.
7. **Line scrolling:** fixed 3-line box, remove the first line when you reach the third.
8. **Persistence:** settings and personal bests in `localStorage`.
9. **Themes** via CSS variables.
10. **Desktop app:** `npm create tauri-app`, point it at your page, then frameless window + custom title bar.
