# How it works

Vanilla HTML, CSS and JavaScript (ES modules). No framework, no bundler, no runtime dependencies.

## Files

| Path | What |
|---|---|
| `index.html`, `404.html` | The page and the not-found page |
| `src/rules/` | The rules engine. Pure functions, no DOM |
| `src/levels/` | One module per level, plus `schema.js`, `index.js` (tests) and `manifest.js` (app) |
| `src/lib/` | Pure helpers: score, seeded shuffle, line diff, Tap-mode patching, the verified-source filter |
| `src/ui/` | Screens: level, board, scene (the map), result, share card, tour, router (`app.js`) |
| `src/i18n/` | Hebrew and English UI strings. `src/data/glossary.js` for terms |
| `styles/` | `tokens.css` (the only place for colors, sizes and durations), components, screen, app |
| `test/`, `e2e/` | Unit tests (`node --test`) and real-browser tests (Playwright and axe) |

## The rules engine

Each level has a `check(code)`. It uses tolerant, line-based parsers, not full parsers, so it accepts several valid fixes and
rejects garbage. Input is capped at 20,000 characters and no regex has a nested quantifier, so a hostile input cannot freeze the
browser. A test feeds 14 adversarial 20,000-character inputs to every level and requires each to finish in under 100 ms.

Known limits (by design, to keep the checks small): the key-in-the-repo rule does not catch a secret hidden in a dictionary,
and the label rule accepts any mention of the new `control-plane` label.

## Tap mode and Edit mode

Tap mode applies an exact text patch to the editor. Edit mode is a plain textarea. Both run the same `check()`.
A test applies every good option in every order for every level.

## The map and the mood

The map is an SVG built with DOM methods. Every color comes from a token. At night the door is open. After a fix the door locks,
the sun rises and the interface switches to the `dawn` token set (still dark). A light dawn palette exists but is unused.

## Motion

Only `transform`, `opacity` and `stroke-dashoffset` are animated, using the duration tokens in `tokens.css`. Loops run only when
`html[data-loops="on"]`: motion is allowed, the device does not look weak (an optional Chromium-only hint), the tab is visible and
the map is on screen. With reduced motion every transition is instant. Nothing needs the network.

## Security

- Content-Security-Policy in a `<meta>` tag: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'`. So there are no inline scripts and no `style` attributes.
  A meta CSP cannot set `frame-ancestors`. Real headers need a server.
- The player's code is only ever shown with `textContent`. No `innerHTML`, `eval` or `new Function` (a test checks this).
- Source links are built from verified data only, with `rel="noopener noreferrer"`.
- localStorage is used only for language, scores, progress and the welcome flag, always in try/catch. No cookies.

## Never break for a visitor

A global error handler shows one calm line and a Reload button, never a stack trace. Levels load one at a time, so a broken level
file only breaks itself. If storage, canvas, clipboard or downloads are missing, that one feature explains itself and the rest works.
There is no service worker, so there is no stale cache to break the live site.

## Testing notes

The e2e suite serves the site under `/fix-my-cloud/`, because GitHub Pages is not at the domain root. In Firefox under automation
we saw one page crash when a test polled with `expect().toHaveText` immediately after a same-page navigation. The same steps with
plain polling never crashed, so the smoke test uses `waitForFunction` there. It is worth checking Firefox by hand once.
WebKit tests need system libraries that only CI installs by default (`npx playwright install --with-deps`).
