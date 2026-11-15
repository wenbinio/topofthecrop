# AGENTS.md

Instructions for any person or AI agent changing this repository. Read this first, then `README.md` for how the app is built and what the data contract is.

## What this is

Top of the Crop is a phone web app for NASA Space Apps 2026 (challenge: Field Shift). A rain-fed durum farmer in the Bradano basin (Basilicata, Italy) finds or draws a field, answers three questions, and gets ranked three-year rotations with the evidence behind each. It is a static site with no server, hosted on GitHub Pages at https://wenbinio.github.io/topofthecrop/.

## Where to read

| File | What it tells you |
|---|---|
| `README.md` | The design, the data contract, the decisions made and why |
| `DATA_SOURCES.md` | Every dataset, its licence and citation |
| `docs/scoring.md` | Every rule and threshold in plain words: ranking, weather, this season's rain, the forecast, the yield lift |
| `docs/support-and-prices.md`, `docs/crops-research.md` | Where the money and crop figures come from, and which are unverified |
| `research-compilation/research-compilation.md` | The owner's research compilation (15 November 2026): CAP 2023–2027 support for the Bradano valley, legume-rotation economics. Summary below, under "Support payments from the research compilation" |
| `docs/checking-the-app.md` | A screen-by-screen check of the live app, with the demo field's expected figures |
| `docs/space-apps-submission.md`, `docs/ai-log.md` | The text for the Space Apps project page (NASA data, other references, AI statement), and a log of how AI was used from the start of the project |

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

Run typecheck, test and build before every commit. All three must pass. `npm test` runs only `src/**/*.test.*`; spare copies of the repo under `.claude/` are left out on purpose.

Scripts that rebuild shipped data (each says in its header how to run it):

| Script | Rebuilds | When |
|---|---|---|
| `node scripts/make-placeholder-bundle.mjs` | `public/data/genzano-demo.json` | After changing a crop figure, a payment, the yield lift or `data/field.json` |
| `python scripts/build-basemap.py <folder>` | `public/tiles/s2/` | For a newer Sentinel-2 picture of the basin |
| `node scripts/fetch-parcels.mjs <code> "<name>" <w> <s> <e> <n>` | `public/parcels/<code>/` | To add a commune's cadastral parcels |

## Rules that must not be broken

**Data honesty**
- Never show a made-up number as if it were real. A figure nobody has sourced carries `placeholder: true` and the app marks it.
- `null` in the data means "no data". Show "no data" or leave the part out. Never turn it into 0.
- Every number on screen is a `Fact` with a source, a resolution and a confidence. Do not add a bare number. On screen the source waits behind a tap (`FactButton`, `SourceButton` in `src/components/FactParts.tsx`); keep it one tap away.
- Figures for a drawn field come from 1 km squares. They are labelled "For the 1 km area around your field" and carry scale `"area"`, never `"field"`.
- A range `[low, typical, high]` is the 10th percentile, the median and the 90th percentile. New ranges follow the same rule.
- Measurements and model output (bare months, hot days, rain, the 2050 outlook, the forecast) are never editable by the farmer. Assumptions behind the income are: see "What the farmer can change".
- A threshold that is our own judgement is named as such in the code and written in `docs/scoring.md`.

**The data folder**
- Never edit files in `data/` by hand. They come from the notebooks in `ColabNotebooks/`. To update them: rerun the notebook concerned in Colab, then 06; 06 downloads `field_shift_for_repo.zip`, whose `data/` files replace the old ones and whose `DATA_SOURCES.md` goes at the top of the repo; then `node scripts/make-placeholder-bundle.mjs` rebuilds the demo field's bundle. Keys stay the same, so the app needs no change. The data caveats are in `docs/scoring.md`, "Data caveats".
- Never add Basilicata weather-station records to the repo. Their terms are non-commercial and checking-only.
- `src/data/fieldshift-data.js` is the data lead's helper. Do not change it; ask them.

**Hackathon rules**
- Outside (non-NASA) material must be free and open. Before adding a dataset, map layer, font or library, read its licence on the owner's own page, not in a search summary, and record it in the README. An AI researcher's claim about a licence or an endpoint is a lead to test, not a fact: one of ours was wrong about a service, and we were wrong about another.
- Do not use NASA logos or branding. Naming NASA datasets in citations is fine.
- AI use must be acknowledged. A file written with AI help says so in its header, and the README's "Use of AI" section lists the tools. The app's own short version, with the credit lines the data licences ask for, is `src/components/DataCredits.tsx`: keep it in step with that section and `DATA_SOURCES.md`.
- No account, key or server. The app must work as plain files on any static host.
- The team's code is under MIT (`LICENSE`). Data, map tiles, parcels and live services keep their own licences.

**Wording**
- Farmers read this on a phone. Use plain, short words. Say "aerial photo", not "orthoimagery".
- Every string lives in both `src/i18n/en.ts` and `src/i18n/it.ts`, under the same key. A test fails if the keys differ.
- A crop's name is always shown through the `CropName` component, so its symbol comes with it.
- If a screen shows a figure a farmer might not understand (costs, gross margin, a priority), say what it means on the screen.

**Code**
- TypeScript is strict: no unused locals or parameters, `import type` for types, no enums or parameter properties.
- All of the farmer's choices live in the link (the hash query). Do not add local storage or a store. Add a parameter in `src/state/url.ts` and document it. Whether a Settings section is folded open is not a choice and stays in component state.
  - **One deliberate exception:** `src/components/KeepFiguresOnBack.tsx` holds the newest figures (`m`, `x`) in memory for the visit, never stored. Each screen in the history keeps its own copy of the link and a browser cannot rewrite older copies, so a Back to the same field puts the newest figures back into the link it lands on. Without it, Back to Questions then Next lost a price changed in Settings.
- All MapLibre code stays in `src/components/MapView.tsx`, loaded on demand through the thin wrapper `src/components/Map.tsx`. Screens and tests import the wrapper.
- Keep the first download small: a screen or library that most visits do not need is loaded on demand (`React.lazy`), as the map, Settings, the printout and Area weather are.
- A screen that grows past a few hundred lines is split into a folder of parts beside a short entry file, as `src/screens/settings/` and `src/screens/find-field/` are.
- Rules that turn data into field facts live once, in `src/data/field-rules.js`, shared by the demo-field script and the drawn-field builder. Change a rule there, never in one caller.
- Money sums live once, in `src/money/money.ts`. `scripts/make-placeholder-bundle.mjs` repeats the same sum on purpose so the shipped file matches; keep the two in step (the yield lift is in both).
- Tests use the frozen fixture `src/test-fixtures/money-bundle.json`. Only `src/data/public-bundle.test.ts` reads the shipped bundle.
- A block that calls a live service loads on its own, gives up after 8 seconds, offers a retry, and never blocks the rest of the screen.
- The site's own data files (the demo field, the basin files, the parcels) are fetched through `stamped()` in `src/data/fresh.ts`, which adds a fingerprint of the shipped data to the address. The host caches files for ten minutes; without the fingerprint a newly published app can read the previous data. Fetch a new shipped data file the same way, and add its folder to `dataStamp()` in `vite.config.ts`.

## What the farmer can change

Everything behind the income figure, on the Settings screen, which is split into fold-out sections. Each is a key in the link parameter `m`:

| Figure | Key | Limits |
|---|---|---|
| Crop price | `p.<crop>` | 0–5,000 €/t |
| Crop direct costs | `c.<crop>` | 0–5,000 €/ha |
| Crop yield in a usual year | `y.<crop>` | 0–20 t/ha |
| More durum after a legume, first and second harvest | `l1.<crop>`, `l2.<crop>` | 0–100% |
| Support payment amount, and on or off | `s.<id>`, `on.<id>` | 0–2,000 €/ha |

Every change applies at once and travels in the link. "Save changes" at the foot of Settings takes the farmer back to the screen they came from with the new figures, and puts them in the plan kept on the phone (`keepFigures` in `src/state/plan.ts`) when that plan is the same field and answers. Back does the same, whether Settings' own, the top bar's or the phone's: it returns to the screen before with the new figures, and every further Back to the same field keeps them too (`src/components/KeepFiguresOnBack.tsx`).

Payments the farmer adds travel in `x`. A typed figure counts as "fair" confidence and tags the income "Yours". To make a new figure editable: add it to `resolveMoney`, `setMoney` and `MONEY_LIMITS` in `src/money/money.ts`, allow its key prefix in `src/state/url.ts`, add a row to a section in `src/screens/settings/Editor.tsx`, and list it on the printout when changed (`src/screens/Print.tsx`).

## Support payments from the research compilation

From `research-compilation/research-compilation.md`. The app's payments are in `scripts/make-placeholder-bundle.mjs`; each cites its own page, shown behind "Source" on Settings.
- **Region:** Basilicata is a Less Developed region. The compilation says much of the Alto Bradano has natural constraints, but Genzano di Lucania does not qualify for the mountain payment SRB01 (120 €/ha elsewhere), so 0 there.
- **Coupled support (CAP plan PD 06), €/ha:** durum 93.50 planned (min 84.15, max 102.86; 96.88 in 2027), Centre-South incl. Basilicata, certified seed; grain legumes 40.04 (29.00–44.04), chickpea, lentil, pea, faba, lupin, beans, not soybean; oilseeds (rapeseed, sunflower) 101.00 (90.90–111.10), only under a contract with a processor, seed company or feed mill, with certified seed (the compilation's 64.30 is wrong). The app uses what AGEA paid for 2025 (circular 94143): durum 102.86, legumes 44.04, oilseeds 111.10, redistributive 89.37.
- **Eco-scheme 4:** about 110 €/ha planned (paid 49.48 in 2024, 60.36 in 2025) for arable rotations with legumes or forage, with no chemical weedkillers or pesticides on the legume or forage crop (other crops in the rotation are not limited). Eco-schemes 2, 3 (tree crops) and 5 (pollinators, 250–500 €/ha) do not fit our rotations.
- **Durum wheat fund (DM 585284 of 30 October 2025; "DM 677535" in the compilation is unconfirmed):** up to 100 €/ha for 2026 (200 for 2024; 200 reported for 2025), 50 ha and €50,000 over three years; needs a three-year supply contract with a cooperative, consortium, producer organisation or processor, and certified seed; cut pro rata.
- **How farmers claim:** the farm dossier (*fascicolo aziendale*) on SIAN, usually through a CAA office; AGEA checks crops with Sentinel satellites (Area Monitoring System).
- **Not used:** the compilation's Lebanon study on wheat and faba bean (too far from southern Italy).
- **Legume fund:** up to 250 €/ha (137 after cuts in 2025), only on legume hectares above the 3-year average, up to 50 ha, supply contract required.
- **Basilicata (five-year commitments):** no-till SRA03 300 €/ha (2026 call closed 30 June 2026); integrated SRA01 171 arable, 114 forage; organic SRA29 258 arable, 208 legumes (291 and 233 converting). No-till cannot share a field with SRA01 or SRA29.
- **Checked:** AGEA's 2024–25 circulars (coupled, redistributive, Eco-scheme 4) and the owner's audit (funds, Basilicata, papers). See `docs/support-and-prices.md`. Keep the cap, the campaign rate and the amount paid apart.
- **Rotation economics:** wheat after chickpea yields 16% and 10% more (Lago-Olveira et al. 2023, Puglia); durum–vetch intercrop margin 280.6 €/ha against 47.5 for durum alone (Denora et al. 2025, two seasons at La Generale, Genzano di Lucania); more pulses cut nitrogen costs but raise disease and pesticide costs if sown too often.

## Live services the app calls

| Service | For | Licence | Notes |
|---|---|---|---|
| NASA POWER | Area weather history; this season's rain so far | Open | 2 to 4 days behind; about 50 km grid |
| MET Norway Locationforecast | Seven-day forecast | CC BY 4.0, NLOD 2.0 | The one part that is not NASA data: NASA has no forecast a web page can call |
| AGEA orthophotos (WMTS) | Aerial photos on the map | CC BY 4.0 | Use the WMTS tile path; `exportImage` returns a blank checkerboard |
| EOX Sentinel-2 cloudless 2016, NASA GIBS Blue Marble | Map layers | CC BY 4.0, public domain | |
| Photon | Town search | Open | |
| Microsoft Planetary Computer (STAC API, data API) | Field timelapse ("Your field from space", from the Year screen) and the intercrop map (Sentinel-2 greenness and leaf moisture, Copernicus DEM GLO-30 heights) | Copernicus Sentinel data: free, full and open, with the notice "Contains modified Copernicus Sentinel data [years]"; Copernicus DEM GLO-30: free worldwide licence, with its notice on the credits page; Planetary Computer previews: no account, not meant for production but not prohibited | Sentinel-2 at 10 m; tiles are JPEG with a PNG fallback |

A web page cannot read the phone's own weather app or call the cadastre directly; parcels are downloaded ahead of time.

## Git

- `main` deploys to the live site on every push, through `.github/workflows/pages.yml`.
- Work on a branch, open a pull request, merge when typecheck, tests and build pass. After merging, wait for the deploy run for that commit and check the live site.
- Teammates push data and research straight to `main`. Fetch before you branch and before you merge.
- Commit or push only when the person you are working for asks.
- Do not commit `node_modules/`, `dist/` or `.claude/`.
- After switching branches or a run of edits, restart `npm run dev`: it can serve stale files and show a blank page.

## What has never been checked

Say so if you rely on any of these.
- The app on a real phone beyond one screenshot of the Why screen in Android Chrome: touch drawing, edge-finding, the Settings inputs, rotation, voice with a real microphone.
- The crop figures against their sources. Direct costs for every crop except durum and chickpea are recalled figures (no published southern budget was found); durum's come from ISMEA's 2025 survey and chickpea's are worked out from Lago-Olveira et al. 2023. Each legume's nitrogen figure sits inside the range of published studies, none measured at this field (`docs/crops-research.md`, "Costs and nitrogen: the sources"). The yield lift: Garofalo et al. 2009's 12% after faba bean matches the paper's abstract (checked 15 November 2026); the 16% and 10% after chickpea come from Lago-Olveira et al. 2023's Table S3 as copied into the team's research compilation; the owner's audit found the 16% indirectly supported, the 10% still unchecked.
- Each rotation's risk rating, the priority score rules and the weights for the farmer's order of priorities (4, 3, 2, 1), which are our judgement.
- Whether NASA POWER's impossible rain months reach beyond the demo field. The data team's notebook 03 found POWER's October 2025, February 2026 and March 2026 more than three times what CHIRPS, IMERG and ERA5-Land measured there (592 mm for autumn 2025, about five times the usual). The app leaves those months out of its live POWER rain everywhere (`POWER_BAD_RAIN_MONTHS` in `src/weather/weather.ts`) and says so under the figures.
- The forecast against another forecast, and AGEA's service under load.

## State on 15 November 2026

- Live: the three setup steps and three tabs, basin-wide results for drawn fields, voice, open map imagery with AGEA aerial photos, parcel lookup for Genzano di Lucania, this season's rain and the seven-day forecast.
- Also live: "Your field from space", a timelapse of the farmer's own field (one clear Sentinel-2 picture a month, three years) linked from the Year screen; fewer words on screen (each figure's dataset, date and confidence in a tap-to-open bubble; Why opens with why it is suggested); "Data and credits" (the licences' credit lines and the AI note) on a page of its own, linked from Check and share, and on the printout; NASA POWER's three impossible rain months left out of the live rain; the Year screen's card comparing 2024 and 2026 with a usual season (with the demo field's seasons much less green than nearby fields), two more evidence lines on Why (NASA SMAP soil water, NASA MODIS crop water use), the yield lift after chickpea and faba bean, the MIT licence, Settings in fold-out sections with editable prices, costs, yields and lift, and the map and three screens loaded on demand.
- Support payments on Settings each have their own "Source" link to the official page with that payment's figure or rules: the Commission's BISS page, AGEA circular 94143 (coupled, redistributive, Eco-scheme 4), MASAF decrees DM 585284 (durum fund) and DM 688617 (legume fund), and CSR Basilicata (SRA01, SRA03, SRA29). The SRA03 call page (basilicatacsr.it) is blocked from the build machine: its rate (300 €/ha) is in the region's plan, and the region's monitoring-committee slides (June 2026) give the 30 June deadline; only the two determination numbers rest on a search result. Figures and rules were checked on 15 November 2026 (`docs/support-and-prices.md`).
- Step 2 asks the farmer to put priorities in order (tap to number them) instead of picking two.
- Strip intercrops (an option with a second sequence, `strips`) are the stand-in for intercropping: every figure is the average of the two sequences and no gain from mixing is counted. They are ranked only when the farmer switches them on. Name a rotation with `OptionName`, and loop over `sequencesOf(option)`, never `option.sequence` alone, when a rule must cover every crop grown. The research behind them was read from search excerpts only (`docs/crops-research.md`, "Intercropping").
- "Share your plan" (the check-and-share screen, from the plan) is for farmers with or without an adviser. It names kinds of people to ask (cooperative, CAA office, regional advisory service, neighbour, agronomist), never a named office or a phone number. Nobody has confirmed with a farmer or a CAA that these are the right places to send each question.
- Submission materials: the NASA data list, the other references and the AI statement are drafted in `docs/space-apps-submission.md`, and `docs/ai-log.md` logs how AI was used from the start; the 30-second video and the written description are with other team members. The deadline is 15 November 2026, 23:59 Finland time.
- Left fixed on purpose and offered to the owner: nitrogen left for the next crop, and the dry-year penalty behind the dry and driest years.
- "Your soil" on Options (`src/components/SoilCard.tsx`, rules in `src/data/soil.ts`) names the ground from the bundle's soil figures. It does not change the ranking, and says so. No checked rule yet says how soil should move each crop; add such rules only from a source, and as warnings on a rotation, not as hidden score changes.
- "Your field today" (`/today`) keeps the farmer's plan in `localStorage` (`src/state/plan.ts`): the best fit, the data fingerprint, the date and the ticked checks. It tells a returning farmer when new data has changed the advice. It cannot notify a closed phone (no server), and the page says so; do not add a permission prompt for notifications the app cannot send. It gives no crop calendar (sowing or fertiliser dates): the app has no checked one.
- Text the farmer reads is written by Gemini Hydrogen (fleet, `agy`), then checked and applied; the owner asked for this on 15 November 2026.
- The screens are laid out as a decision tree (the owner, 15 November 2026: "too much data and too many choices being made on screen"). Questions asks one question at a time. Options shows the one advice, then rows to open (`Fold` in `src/components/Fold.tsx`): why, the other options, priorities, what we see, soil, prices. Why keeps the reasons open and folds the rest. Do not put a folded section back on show by default without asking. A folded panel stays in the page but is `inert`.
- Motion is shared (`index.css`, "Motion"): `tc-tap` for a press, `tc-fold` for a panel that grows, `tc-reveal` and `tc-pop` for small things that appear, `tc-screen` for a new screen. Use these, not one-off transitions, and keep everything off under `prefers-reduced-motion`.
- The Year screen has no slider. It shows a usual, a dry and the driest year at once (`YearKind` in `src/screens/Year.tsx`), and nothing in the state or the link holds a kind of year: every other screen ranks for a usual year (`rankOptions` without `scenario`). Do not bring a chooser back without asking; the owner removed it because the farmer should not be the one deciding how dry it is.
