# How to add a level

A level is one file in `src/levels/`, a rule in `src/rules/`, and a few lines of registration. Level code stays a string
inside the level file. Never add real `.py`, `.tf`, `.yaml` or workflow files to the repo.

## 1. Write the rule

Rules are pure functions in `src/rules/`. They take the player's text and return `{ passed, failures: [{ ruleId, line?, message: {en, he} }] }`.
Use the helpers in `src/rules/common.js` (`guard`, `toLines`, `findBlocks`, `attrsOf`, `kv`, `unq`).

- Cap input with `guard()` (20,000 characters). Do not use regexes with nested quantifiers on user text.
- Accept several valid fixes. Ignore comments, whitespace and quote style. Reject empty or garbage input.
- A fix must not pass by deleting everything. Check that the essential parts remain.

## 2. Write the level

Copy an existing level, for example `src/levels/inc-0002-key-in-the-repo.js`, and fill in:

| Field | What it is |
|---|---|
| `id`, `incidentId` | `incidentId` is `INC-000N`, or `null` for practice |
| `title`, `intro`, `hints` (3 tiers), `lesson` | Each text is `{ en, he }`. Hebrew is written naturally, not translated word for word |
| `tags`, `difficulty`, `estimatedMinutes`, `language`, `file` | Tags: Secrets, CI/CD, Reliability, Cloud, Kubernetes, Network |
| `vulnerableCode`, `fix` | Fake secrets must look fake (`FAKE_KEY_DO_NOT_USE_123`). Use only documentation IPs and `example.com` |
| `check` | Your rule |
| `choices` | Tap-mode groups. Each `anchor` must appear exactly once in `vulnerableCode`. Include at least one plausible bad option |
| `scene` | The picture: actor icon, target icon, meter label, the two captions, the alert and the goal |
| `graph`, `realWorld` | `realWorld` is `null` or a list (see below) |

Icons: actor `globe`, `repo`, `comment`, `gear`, `package`. Target `rack`, `db`.

## 3. Register it

- Add it to `src/levels/index.js` (used by tests) and `src/levels/manifest.js` (used by the app). A test checks they match.
- Add expected rule ids and 2 or more alternative valid fixes to `test/fixtures.js`.

## 4. Add a real-world fact (optional)

Add an entry to `realWorld` with `name`, `year`, a short blameless summary in your own words (two sentences at most), and `sources`.
**Every source starts with `verified: false`.** Then list it in `docs/incident-sources.md` (run the generator in that file's history, or add it by hand),
open the link, and only after you checked the fact set `verified: true`. Never add a fact from memory.

## 5. Check

```bash
npm test      # schema, every fix passes, every Tap order works, no slow regexes, translations complete
npm run e2e   # the level is solved in Tap mode and in Edit mode in real browsers
```
