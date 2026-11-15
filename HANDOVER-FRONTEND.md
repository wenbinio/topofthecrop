# Front-end handover

For the next person working on the app. It explains how the front end is put together and how it reads the data in this repository. Written on 15 November 2026 with AI assistance (Claude, Anthropic).

Read `AGENTS.md` first for the rules. The data files themselves are explained in `HANDOVER.md`, written by the data lead; this file covers the app's side of that link.

Live site: https://wenbinio.github.io/topofthecrop/

## 1. The app in one minute

A farmer goes through six steps. Each step is one screen and one route.

| Step | Route | Screen file | What it shows |
|---|---|---|---|
| 1 | `/` | `src/screens/FindField.tsx` | Map, town search, "My location", tap or draw a field, or find it by parcel number |
| 2 | `/questions` | `src/screens/Questions.tsx` | Last crop, limits, pick two priorities |
| 3 | `/options` | `src/screens/Options.tsx` | What the satellites see, the recommendation, ranked rotations |
| 4 | `/why/:optionId` | `src/screens/Why.tsx` | One rotation: income sum, evidence, what we don't know, what to check locally |
| 5 | `/year` | `src/screens/Year.tsx` | The field's year month by month, hot days now and by 2050, the drier-year slider |
| 6 | `/adviser`, `/print` | `src/screens/Adviser.tsx`, `Print.tsx` | A link and a one-page printout for the adviser |

Two more screens sit outside the steps: `/area` (`AreaWeather.tsx`, live weather for a field outside the basin) and `/settings` (`Settings.tsx`, the farmer's own prices and support payments).

Routes and their guards are in `src/App.tsx`. A screen that needs field data is wrapped in `BundleGate`, which shows one loading line, a retry on failure, or sends a field outside the basin to `/area`.

## 2. Stack

- Vite 8, React 19, TypeScript 7, react-router-dom 7 with `HashRouter`.
- MapLibre GL JS for the map. Tailwind CSS 4 for layout, with colours and sizes as CSS variables in `src/theme/standard.css` and `src/theme/simple.css`, switched by `data-view` on the root.
- Vitest with jsdom and Testing Library.
- Fonts are bundled (`@fontsource`), so nothing loads from a font service.
- `vite.config.ts` sets `base: './'`, so the built site works from any folder.

## 3. Where state lives

Everything the farmer chose is in the link, after the `#`. There is no local storage and no store, so a link reopens the same field and settings on any device. `src/state/url.ts` encodes and decodes it; `src/state/useAppState.ts` is the hook screens use.

| Parameter | Meaning |
|---|---|
| `f` | Field id: `genzano-demo` for the demo field, absent for a drawn field |
| `o` | A drawn outline: `lon,lat;lon,lat;...` |
| `c`, `cn` | Last crop (a crop id or `other`), and its typed name when `other` |
| `l` | Limits: no irrigation, cereal machinery only, no buyer, broomrape history |
| `p` | The two priorities: income, water, soil, forage |
| `s` | Scenario for the slider: normal, drier, much-drier |
| `v`, `g` | View (standard or simple) and language (en or it) |
| `m` | The farmer's own figures: `p.<crop>` price, `c.<crop>` direct costs, `y.<crop>` yield, `l1.<crop>` and `l2.<crop>` the extra durum after that crop (first and second harvest), `s.<id>` support amount, `on.<id>` support switch. Up to 80 figures. |
| `x` | Payments the farmer added |

## 4. How the app links to the data

There is one shape that every screen reads: the `FieldBundle` in `src/data/types.ts`. It holds the field, three findings, the year strip, the rotations and the money figures. Three different routes fill it, depending on where the field is.

```
                      ┌─ demo field ─────── public/data/genzano-demo.json ──┐
data/ (data team) ────┤                      (built ahead by a script)       ├─▶ FieldBundle ─▶ screens
                      └─ drawn, in basin ─── built in the browser ──────────┘
NASA POWER (live) ────── drawn, outside ──── AreaWeather screen only (no bundle)
```

`src/components/BundleProvider.tsx` is where this happens. It loads the demo bundle once, builds a drawn field's bundle when the link holds an outline, applies the farmer's own prices (`withMoney`), and hands the result to every screen through `useBundle()`.

### 4a. The demo field

1. The data team's `data/field.json` holds the figures measured inside the demo field's own outline.
2. `scripts/real-field.mjs` reads it and builds the field parts: outline, last crop, the three findings, the twelve months, the risk icons, the hot-day stops and the evidence lines.
3. `scripts/make-placeholder-bundle.mjs` adds the nine rotations and the money figures (from `docs/crops-research.md` and `docs/support-and-prices.md`) and writes `public/data/genzano-demo.json`.
4. The app fetches that one file. `src/data/validate.ts` checks its shape on load and refuses a broken one.

After changing `data/field.json`, a crop figure or a payment, rebuild it:

```bash
node scripts/make-placeholder-bundle.mjs
```

### 4b. A field drawn inside the basin

1. The data team's 1 km files stay in `data/`. A small plugin in `vite.config.ts` serves them at `data/basin/` while developing and copies them into the build. They exist once in git.
2. When a link holds an outline, `src/data/basin.ts` downloads them (about 1 MB compressed, once per session) together with the data lead's helper `src/data/fieldshift-data.js` and turf.js. The demo field never downloads any of this.
3. `outlineValues()` in the helper finds the 1 km squares under the outline and averages their values, weighted by how much of the field lies in each. It returns `null` when the outline covers no farmland square.
4. `src/data/fieldFromBasin.ts` turns those values into a `FieldBundle`. The rotations and money figures are copied from the demo bundle, because they are regional; only the field facts and each rotation's evidence are the drawn field's own.
5. Every fact gets scale `"area"`, and screens show "For the 1 km area around your field".

### 4c. A field drawn outside the basin

No bundle can be built, so `BundleGate` redirects to `/area`. `src/weather/weather.ts` calls NASA POWER for the field's centre and counts hot days at flowering, autumn rain and late frost over ten years. The screen says full results cover Bradano basin farmland only.

### 4c-2. This season so far, for every field

`src/components/SeasonNow.tsx` sits on the Year screen and on Area weather. It calls NASA POWER for daily rain from ten Septembers ago to today and shows the rain since 1 September, the usual amount by this date, a one-word verdict and the last day with 5 mm or more. `src/weather/season.ts` does the counting and holds the thresholds; `docs/scoring.md` states them in plain words. It loads on its own and never blocks the screen. Below it, `src/components/ForecastNext.tsx` shows the next seven days (rain day by day, the coldest night, a frost flag) from MET Norway's open forecast, counted in `src/weather/forecast.ts`, with a link to the full forecast for the same place. NASA has no forecast a web page can call, which is why this one part is not NASA data. These two blocks are the only parts of the app that change from day to day. Both services see the caller's IP address and the field's position rounded to two decimals (about 1 km).

### 4d. One set of rules for both fields

`src/data/field-rules.js` holds the rules that turn data into what the farmer sees: which months count as green, patchy or bare, when a risk icon appears, how the slider's stops are worked out. Both `scripts/real-field.mjs` (4a) and `src/data/fieldFromBasin.ts` (4b) import it, so the demo field and a drawn field can never be judged by different rules. It is plain JavaScript so Node can run it without a build; its types are in `field-rules.d.ts`.

### 4e. Which data keys reach the screen

| On screen | Data key (see `HANDOVER.md` for units) | File |
|---|---|---|
| Finding "Bare after harvest" | `bare_months` | `cells_greenness.json` |
| Finding "Hot flowering", and the "now" figure on Year | `hot_days_flower` | `cells_weather.json` |
| Finding "Autumn rain varies" | `rain_autumn` | `cells_weather.json` |
| Year strip: green, patchy, bare | `ndvi_month`, with `meta.thresholds` | `cells_greenness.json` |
| Year strip: dry, frost, heat, heavy-rain icons | `rain_month`, `frost_month`, `hot30_month` | `cells_weather.json` |
| "By 2050" and the slider's stops | `ssp245.hot`, `ssp585.hot`, through the helper's `projected()` | `cells_future.json` |
| Hottest season | `hot_days_flower_by_season` | `cells_weather.json` |
| Usual high at flowering (hover on "hot days") | `tmax_flower`, `ssp245.tmaxfl` | weather, future |
| Evidence lines on Why | `rain_season`, `durum_need`, `clay` | weather, water, soil |
| Pre-filled last crop | `durum22` (share of durum on the 2022 crop map) | `grid.geojson` |
| Basin outline on the map | the whole file | `area.geojson` |
| Source names and resolutions | `meta.sources` | `field.json` |

**In the data but not yet shown:** soil water at sowing and in spring (`sm_sowing`, `sm_spring`), actual water use (`aet_season`), rain-onset day, dry spells in spring, late-frost and winter-frost counts, season dates from greenness (`greenup_day`, `peak_day`, `dryoff_day`), peak greenness by season, slope and elevation, and soil organic carbon, pH, nitrogen and water-holding capacity. Each is a possible next feature, and `sourcesFor()` in the helper gives the datasets behind any of them.

## 5. From data to a recommendation

1. **Diagnosis** (`src/ranking/diagnose.ts`): a small decision tree reads the findings and names what the field's main problem is.
2. **Ranking** (`src/ranking/rank.ts`): limits remove or flag rotations, the two priorities count equally, and ties break in a fixed order. A legume is not suggested straight after itself.
3. **Reasons** (`src/ranking/reasons.ts`): the plain lines under the recommendation, each tied to a priority.
4. **Money** (`src/money/money.ts`): income is the mean over three harvests of yield × price − direct costs + the payments that apply. The farmer's own figures from Settings replace ours, and anything they changed is tagged "Yours". Confidence is the weakest figure the income is built from, leaving out payments every rotation gets alike.

`docs/scoring.md` states all of these rules in plain words. Keep it in step with the code.

## 6. The map

All map code is in `src/components/MapView.tsx`. `src/components/Map.tsx` is a thin wrapper that fetches it the first time a map is drawn, because the map library is about two thirds of the app's code; screens and tests keep importing `Map.tsx`. The picture is four open layers stacked, none needing an account or key:

| Layer | Source | Detail | Licence |
|---|---|---|---|
| Zoomed out | NASA Blue Marble, from NASA GIBS | 500 m | Public domain |
| Zoomed in, anywhere | Sentinel-2 cloudless 2016 by EOX | 10 m | CC BY 4.0 |
| Zoomed in, the basin | Our own tiles in `public/tiles/s2/`, cut from Sentinel-2 scenes of 30 May 2026 | 10 m | Copernicus, free with credit |
| On top, where it exists | AGEA aerial photos, flights 2022 to 2024 | about 1.8 m in Basilicata, finer in Puglia | CC BY 4.0 |

- AGEA serves one layer per flight year and answers with a see-through tile outside that year's regions, so the three years stack. If AGEA's server is slow or down, the Sentinel-2 picture underneath still shows.
- The AGEA address that works is the WMTS tile path. Its `exportImage` address returns a blank checkerboard, which cost us an hour.
- `scripts/build-basemap.py` rebuilds our own tiles; the README says how.
- Drawing: tap corners, drag corner and side handles, Undo, or Trace with a finger (`src/geo/edit.ts`). "Find edges" reads the picture's pixels around a tap and grows a region to the field's edge (`src/geo/edges.ts`). It needs every map layer to allow cross-site reading, which all four do.

## 7. Other parts

- **Parcel lookup:** on step 1 a farmer in Genzano di Lucania can type the sheet (foglio) and parcel (particella) numbers from their farm file. `src/data/parcels.ts` reads `public/parcels/D971/index.json` and the one sheet file it needs, and the parcel's outline becomes the drawn shape, cut down to 12 corners so it fits in a link. The files come from `scripts/fetch-parcels.mjs`, which downloads them ahead of time from the Agenzia delle Entrate (CC BY 4.0), because its service refuses calls from a web page. Only one commune ships so far. A parcel is a property unit, not always a field, and the form says so.

- **Languages:** `src/i18n/en.ts` and `it.ts` hold every string under the same keys. `useT()` gives a screen its translate function.
- **Two views:** Standard shows sources and ranges; Simple shows bigger text and fewer figures. Same screens, different theme file and a few `simple` branches.
- **Crop symbols:** `src/components/Crops.tsx`. Use `CropName` wherever a crop is named.
- **Voice:** `src/voice/`. A push-to-talk microphone and a read-aloud button, using the phone browser's own speech service. `commands.ts` is a pure parser for English and Italian; `apply.ts` turns a command into a state change. Hidden where the browser has no speech support.
- **Settings in fold-out sections:** `Settings.tsx` is the screen's entry; its parts are in `src/screens/settings/` (`Editor.tsx` puts the sections together, `path.ts` holds `SETTINGS_PATH` for links into it). Settings, Print and Area weather load on demand (`React.lazy` in `App.tsx`). The editor groups the figures into six sections (crop prices, crop costs, crop yields, more durum after a legume, support payments, the farmer's own payments), each behind a header button with a one-line summary. All start closed except a section holding something the farmer changed; which are open is plain component state, not part of the link. Reset, the adviser line and the voice note stay outside the sections.
- **Sideways phones:** the custom Tailwind variant `phone-land` (landscape, at most 500 px tall and 1000 px wide) rearranges screens into two columns.

## 8. Tests and publishing

- `npm test` runs about 360 tests. Screens are tested with a frozen bundle, `src/test-fixtures/money-bundle.json`, so changing the shipped figures does not break them. One test, `src/data/public-bundle.test.ts`, checks the shipped file.
- The map is mocked in tests. Check map changes by hand in a browser.
- Every push to `main` runs `.github/workflows/pages.yml`: typecheck, test, build, publish.
- After switching branches, restart `npm run dev`; it can serve stale files.

## 9. What is weak or unfinished

- **Never tried on a real phone.** Touch drawing, edge-finding, Settings inputs, rotation and voice have only been checked in a desktop browser or by tests.
- **Crop figures are unverified.** Costs and nitrogen for every crop except durum are recalled, not sourced. See `docs/crops-research.md`.
- **Two things are still our judgement:** each rotation's risk rating and the priority score rules. Both are marked as placeholders.
- **The yield lift covers two crops only.** Durum counts 16% then 10% more grain after chickpea and 12% more after faba bean (`durumAfter` in the bundle, `yieldLift` in `src/money/money.ts`). Lentil, pea and vetch get none because no figure was found, which tilts the comparison. The figures come from the team's research compilation; nobody opened the papers.
- **The Standard Options screen is long**, well over the 40-word target in the README.
- **The AGEA photos are a live service.** If it fails during a demo, the map falls back to the 10 m picture.
- **Not offline.** The team's plan mentioned working offline once opened; there is no service worker.

## 10. Ideas already scoped

- **More communes for the parcel lookup, and parcel lines on the map.** Only Genzano di Lucania (`D971`) ships. Each further commune is one run of `scripts/fetch-parcels.mjs`. Drawing the parcel lines on the map, so a farmer can tap a parcel instead of typing its number, is the natural next step; a field made of several parcels cannot be joined yet.
- **Show more of the data.** See the "not yet shown" list in 4e.
- **Submission materials.** The 30-second video, the written description, the NASA data list and the AI-use statement are not started.
