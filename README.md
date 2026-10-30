# Clack

A fast, offline, minimalist typing test for Windows.

- **Modes:** time (15 / 30 / 60 / 120 s), words (10 / 25 / 50 / 100), quotes (short / medium / long) and your own custom text.
- **Punctuation and numbers** toggles; English 200 and English 1k word lists.
- **Live** WPM and accuracy while you type; the rest of the UI fades away until you move the mouse.
- **Results:** WPM, accuracy, raw WPM, consistency, characters (correct / incorrect / extra / missed), a per-second chart with errors, and the words you typed with mistakes underlined.
- **Personal bests** per test type and a stats page with your recent tests.
- 10 themes, 4 fonts, caret styles, optional key sounds. Everything is stored locally; nothing goes online.

## Keys

| | |
|---|---|
| `Tab` | new test (also from the results screen) |
| `Shift+Tab` | repeat the same test |
| `Enter` | next test, on the results screen |
| `Esc` | settings |
| `Ctrl+Backspace` | delete the whole word |

You can go back into a previous word only if it has a mistake.

## How results are counted

- **WPM:** characters in correctly typed words (plus their spaces) ÷ 5 ÷ minutes.
- **Raw:** every character typed, right or wrong, ÷ 5 ÷ minutes.
- **Accuracy:** correct keystrokes ÷ all keystrokes. Mistakes you fixed still count.
- **Consistency:** how steady your raw speed was from second to second.

Tests shorter than 2 seconds or under 50% accuracy are not saved.

## Build

Needs Node 20+, Rust and the Visual Studio Build Tools.

```bash
npm install
npm run tauri dev      # run in development
npm run tauri build    # installer in src-tauri/target/release/bundle/nsis/
```

`npm run dev` alone serves the app at http://127.0.0.1:1430 in a browser.

```
src/main.ts       typing engine, results, config bar, settings / stats / custom text panels
src/generator.ts  random words with punctuation and numbers, quote picker, custom text cleanup
src/words.ts      word lists
src/quotes.ts     quotes
src/chart.ts      results chart (canvas)
src/themes.ts     themes
src/sound.ts      synthesized key sounds
```
