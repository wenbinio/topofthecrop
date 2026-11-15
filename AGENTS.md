# AGENTS.md

Instructions for any person or AI agent changing this repository. Read this first, then `HANDOVER-FRONTEND.md` for how the app is built and `HANDOVER.md` for the data files.

## What this is

Top of the Crop is a phone web app for NASA Space Apps 2026 (challenge: Field Shift). A rain-fed durum farmer in the Bradano basin (Basilicata, Italy) finds or draws a field, answers three questions, and gets ranked three-year rotations with the evidence behind each. It is a static site with no server, hosted on GitHub Pages at https://wenbinio.github.io/topofthecrop/.

## Where to read

| File | What it tells you |
|---|---|
| `README.md` | The design, the data contract, the decisions made and why |
| `HANDOVER-FRONTEND.md` | How the front end is put together and how it reads the data |
| `HANDOVER.md` | The data team's guide to the files in `data/` (written by the data lead) |
| `DATA_SOURCES.md` | Every dataset, its licence and citation |
| `docs/scoring.md` | The ranking and weather rules in plain words |
| `docs/support-and-prices.md`, `docs/crops-research.md` | Where the money and crop figures come from, and which are unverified |

## Commands

Needs Node 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

Run typecheck, test and build before every commit. All three must pass.

To regenerate the demo field's bundle after changing crop figures, support payments or `data/field.json`:

```bash
node scripts/make-placeholder-bundle.mjs
```

## Rules that must not be broken

**Data honesty**
- Never show a made-up number as if it were real. A figure nobody has sourced carries `placeholder: true` and the app marks it.
- `null` in the data means "no data". Show "no data" or leave the part out. Never turn it into 0.
- Every number on screen is a `Fact` with a source, a resolution and a confidence. Do not add a bare number.
- Figures for a drawn field come from 1 km squares. They are labelled "For the 1 km area around your field" and carry scale `"area"`, never `"field"`.
- A range `[low, typical, high]` is the 10th percentile, the median and the 90th percentile.

**The data folder**
- Never edit files in `data/` by hand. They come from the notebooks in `ColabNotebooks/`. To update them, replace the files as `HANDOVER.md` section 9 says.
- Never add Basilicata weather-station records to the repo. Their terms are non-commercial and checking-only.
- `src/data/fieldshift-data.js` is the data lead's helper. Do not change it; ask them.

**Hackathon rules**
- Outside (non-NASA) material must be free and open. Before adding a dataset, map layer, font or library, read its licence on the owner's own page and record it in the README.
- Do not use NASA logos or branding. Naming NASA datasets in citations is fine.
- AI use must be acknowledged. A file written with AI help says so in its header, and the README's "Use of AI" section lists the tools.
- No account, key or server. The app must work as plain files on any static host.

**Wording**
- Farmers read this on a phone. Use plain, short words. Say "aerial photo", not "orthoimagery".
- Every string lives in both `src/i18n/en.ts` and `src/i18n/it.ts`, under the same key. A test fails if the keys differ.
- A crop's name is always shown through the `CropName` component, so its symbol comes with it.

**Code**
- TypeScript is strict: no unused locals or parameters, `import type` for types, no enums or parameter properties.
- All state lives in the link (the hash query). Do not add local storage or a store. Add a parameter in `src/state/url.ts` and document it in the README.
- All MapLibre code stays in `src/components/Map.tsx`.
- Rules that turn data into field facts live once, in `src/data/field-rules.js`, shared by the demo-field script and the drawn-field builder. Change a rule there, never in one caller.
- Money sums live once, in `src/money/money.ts`. The bundle script repeats the same sum on purpose so the shipped file matches; keep the two in step.
- Tests use the frozen fixture `src/test-fixtures/money-bundle.json`. Only `src/data/public-bundle.test.ts` reads the shipped bundle.

## Git

- `main` deploys to the live site on every push, through `.github/workflows/pages.yml`.
- Work on a branch, open a pull request, merge when typecheck, tests and build pass.
- Teammates push data and research straight to `main`. Fetch before you branch and before you merge.
- Commit or push only when the person you are working for asks.
- Do not commit `node_modules/`, `dist/` or `.claude/`.

## What has never been checked

Say so if you rely on any of these.
- The app on a real phone: touch drawing, edge-finding, the Settings inputs, rotation, voice with a real microphone.
- The crop figures against their sources. Costs and nitrogen for every crop except durum are recalled figures.
- Each rotation's risk rating and the priority score rules, which are our judgement.
- How long the basin data takes to load on a slow phone connection.
