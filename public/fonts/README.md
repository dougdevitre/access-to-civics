# Fonts

Self-hosted, not linked. `vercel.json` sets `font-src 'self'` and
`scripts/check-privacy-regression.mjs` fails the build on any non-allowlisted host, so a font CDN
is not an option — and it should not be. A child in a classroom with no wifi gets the same
typography as everyone else, and no third party learns that they opened the app.

| File | Family | Licence |
|---|---|---|
| `atkinson-hyperlegible-latin-400-normal.woff2` | Atkinson Hyperlegible | OFL 1.1 (`LICENSE-atkinson-hyperlegible.txt`) |
| `atkinson-hyperlegible-latin-700-normal.woff2` | Atkinson Hyperlegible | ” |
| `atkinson-hyperlegible-latin-400-italic.woff2` | Atkinson Hyperlegible | ” |
| `source-serif-4-latin-wght-normal.woff2` | Source Serif 4 (variable, 200–900) | OFL 1.1 (`LICENSE-source-serif-4.txt`) |

112KB total, Latin subsets only.

**Why these two.** Atkinson Hyperlegible was drawn by the Braille Institute to be legible at low
vision: characters that normally get harmonised — I, l, 1; O, 0 — are drawn apart instead. For a
product whose claim is that everyone in the room can use it, that is the body face. Source Serif
carries the constitutional text, so an engrossed clause looks the same on a school Chromebook as
on an iPad; before this the clause face was a font name with a typo in it and silently fell back
to whatever each device had.

**No serif italic is shipped.** It would cost another 51KB, and the two places that wanted it —
citizen letters and pending-clause notes — read better upright anyway. Italic serif at running-text
size is one of the harder things for a developing reader to decode.

## Regenerating

```bash
npm i --no-save @fontsource/atkinson-hyperlegible @fontsource-variable/source-serif-4
cp node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-{400-normal,700-normal,400-italic}.woff2 public/fonts/
cp node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2 public/fonts/
```

The files are committed rather than installed at build time: the build must not depend on a
registry being reachable to produce a correct-looking document.
