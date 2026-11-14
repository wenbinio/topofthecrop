# Top of the Crop Frontend Buildout Implementation Plan

> **For agentic workers:** This plan is executed as two parallel tracks dispatched through fleet (Task 2 to Codex, Task 3 to Claude Opus), then integrated and reviewed in the main session. Steps use checkbox (`- [ ]`) syntax for tracking. Workers do not run git; the main session commits.

**Goal:** A phone web app that runs the six-step farmer flow end to end on the placeholder Genzano bundle, in two views and two languages, with live NASA weather for a field drawn anywhere else.

**Architecture:** A static React app with no backend. All state lives in the URL hash route and query string. Pure logic (ranking, diagnosis, weather counting, URL codec, geometry, bundle validation) sits in small tested modules with no React in them; screens only call those modules and render. Every colour, font and radius comes from CSS variables in two theme files, so a restyle changes tokens, not components.

**Tech Stack:** Vite 8, React 19, TypeScript 7, react-router-dom 7 (`HashRouter`), MapLibre GL JS 6, Tailwind CSS 4, Vitest 4 with jsdom and Testing Library.

**Spec:** `README.md` at the repo root. Read it first. The mockups in `docs/mockups/` show layout and content only; the owner called the look ugly, so the look will be redone later.

## Global Constraints

- Interfaces are already written as outlines: `src/data/types.ts` (types, complete) and the function signatures with doc comments in `src/data/validate.ts`, `src/ranking/rank.ts`, `src/ranking/diagnose.ts`, `src/weather/weather.ts`, `src/state/url.ts`, `src/geo/geometry.ts`. Do not rename or re-type anything exported from them. Fields may be added to types; none may be renamed.
- No backend, no accounts, no analytics, no AI model in the app.
- Every string a person reads comes from the dictionaries `src/i18n/en.ts` and `src/i18n/it.ts`. Bundles carry dictionary keys, not text.
- No more than about 40 words visible on any screen except "Why?" and the printout, in both languages. Numbers, years and units do not count.
- No text under 12 px. Tap targets at least 44 px tall. Works from 360 px wide on Chrome Android and Safari iPhone.
- Score numbers are never shown anywhere in the app.
- Every number shown carries its scale badge ("your field" or "your area"); its source and range are one tap away at most. A visible "placeholder figures" note appears whenever any shown fact has `placeholder: true`.
- No colour, font family or radius literal inside a component: use the theme variables.
- `npm run typecheck`, `npm test` and `npm run build` must all pass.

## Review Focus

1. A shared link with missing, unknown or malformed parameters opens the app at sensible defaults and never shows a blank page. (Task 2: `decodeState` tests. Task 3: route guard test.)
2. NASA POWER marks missing days as -999. A missing day must not count as a frost day or a dry day, and a year with a mostly missing window is left out. (Task 2: `summarise` tests.)
3. The farmer's limits remove every alternative. The current rotation still shows, and the screen says why the others are gone. (Task 2: `rankOptions` test. Task 3: Options screen test.)
4. A finger trace that is a dot, a line or a tiny scribble must ask for a redraw, not produce a field of 0 ha. (Task 2: `isUsableRing` tests. Task 3: uses it before accepting.)
5. The bundle or the weather call fails or is slow (rural mobile signal). The screen says so in plain words and offers a retry and the demo field. (Task 2: `fetchPower` timeout and `loadBundle` 404 tests. Task 3: error states.)

---

### Task 1: Scaffold and contract (main session, done before dispatch)

**Files:** `package.json`, `vite.config.ts`, `tsconfig.app.json`, `src/test-setup.ts`, `src/data/types.ts`, the six outline modules above, `scripts/make-placeholder-bundle.mjs`, `public/data/genzano-demo.json`, `README.md`, `docs/mockups/*`.

- [x] Vite React TypeScript template with Tailwind, Vitest, router and MapLibre installed
- [x] Data contract and function outlines written
- [x] Placeholder bundle generated
- [x] `npm run typecheck` passes
- [x] Commit

### Task 2: Logic modules (Codex)

**Files (only these may be touched):**
- Modify: `src/geo/geometry.ts`, `src/data/validate.ts`, `src/ranking/rank.ts`, `src/ranking/diagnose.ts`, `src/weather/weather.ts`, `src/state/url.ts`
- Create: one `*.test.ts` beside each of those six files
- Create: `docs/scoring.md`

**Interfaces:**
- Consumes: `src/data/types.ts`; `public/data/genzano-demo.json` as the test fixture (import it in tests).
- Produces: the exported functions exactly as outlined in the six files. Task 3 calls them.

Work test-first for each module: write the tests below, see them fail on "not implemented", implement, see them pass. No React, no DOM, no new dependencies, no change to `package.json`.

- [ ] **geometry.** Tests:
  - `areaHa` of the demo outline (drop the closing point) is between 5.5 and 6.9, and is the same for the reversed ring.
  - `centroid` of the demo outline is inside it (`pointInRing` true); `[16.07, 40.87]` is outside.
  - `simplifyRing` of a 200-point circle of radius 150 m returns at most 12 points, every coordinate has at most 5 decimals, and its `areaHa` is within 15% of the circle's.
  - `simplifyRing` of 8 points returns 8 points. Of 0, 1 or 2 points returns them unchanged in count (no throw).
  - `isUsableRing` is false for 2 points, false for three points 5 m apart, true for the demo outline.
- [ ] **validate.** `validateBundle` checks: `field.id`, `field.name` strings; `field.areaHa` positive; `field.outline` a Polygon with a ring of at least 4 positions; `lastCrop.crop` a known crop; exactly 3 findings, each with string `title` and `detail`, a valid fact, three valid signals, boolean `weatherDriven`, string array `addressedBy`; exactly 12 months with known cover and risks; `hotDays` for all three scenarios with valid `now` and `by2050` facts; exactly 4 options with unique ids, exactly one `isCurrent`, a `sequence` of 3 known crops, integer `firstHarvestYear`, four valid facts, scores for 3 scenarios by 4 priorities each a number from 0 to 1, `removedBy` and `flaggedBy` of known limits, boolean `supportTag`, and a complete `why`. A valid fact has `value` number or string, `scale` field or area, `source` with three strings, a known `confidence`, boolean `placeholder`, and if present a `range` of two numbers. Tests:
  - the placeholder bundle validates and is returned unchanged.
  - each of these single mutations throws an Error whose message starts with `bundle:` and contains the quoted word: 2 findings ("findings"); 3 options ("options"); two options with `isCurrent` ("isCurrent"); a sequence containing `"maize"` ("sequence"); 11 months ("months"); a score of 1.2 ("scores"); a fact with no `source` ("source"); `removedBy: ["no-tractor"]` ("removedBy"); `null` input ("bundle").
  - `loadBundle("genzano-demo")` with `fetch` stubbed to return the fixture resolves to it and requests a URL ending `data/genzano-demo.json`; stubbed 404 rejects; stubbed body `"<html>"` rejects.
- [ ] **rank.** Rules: an option is removed when any chosen limit is in its `removedBy`, except the option with `isCurrent`, which is never removed and gets that limit as a flag instead. `flags` are the chosen limits found in `flaggedBy` (plus the exception above), in `LIMITS` order. Score is the mean of `scores[scenario][p]` over the chosen priorities, or over all four when none is chosen. Ties are broken by the mean over the priorities not chosen, then by the option's position in the input. `rank` counts from 1 and `best` is true only for rank 1. The input is not mutated. Tests on the fixture's options, expected order by id:
  - priorities `["income","water"]`, normal, no limits: chickpea-durum-durum, vetch-oat-durum-durum, faba-durum-faba, durum-durum-durum; first has `best: true`, the others false; `removed` is empty.
  - same priorities, `much-drier`: vetch-oat-durum-durum first, chickpea-durum-durum second.
  - priorities `["income","soil"]`, normal: faba-durum-faba first, chickpea-durum-durum second.
  - no priorities, normal: vetch-oat-durum-durum, faba-durum-faba, chickpea-durum-durum, durum-durum-durum.
  - limits `["cereal-machinery"]`: chickpea-durum-durum is in `removed` with `by: ["cereal-machinery"]`; three are ranked 1 to 3.
  - limits `["broomrape","no-buyer"]`: nothing removed; chickpea flags are `["no-buyer","broomrape"]`; durum flags are `[]`.
  - a synthetic current option with `removedBy: ["no-irrigation"]` and limits `["no-irrigation"]` stays ranked with flags `["no-irrigation"]`.
  - when every non-current option is removed, `ranked` has exactly the current option with `rank: 1`.
  - two synthetic options equal on the chosen priorities: the one with the higher mean on the other two comes first; fully equal options keep input order.
- [ ] **diagnose.** Only these directions count as a signal: greenness `falling`, temperature `rising`, waterUse `falling`; any other value except `no-data` is treated as normal. If any signal is `no-data` the result is `not-enough-data` with confidence `low`. The eight rows (greenness, temperature, waterUse to key, confidence): F R F `water-heat-stress` good; F R N `decline-with-heat` fair; F N F `less-canopy-less-water` fair; F N N `unexplained-canopy-loss` low; N R F `early-water-stress` fair; N R N `warm-healthy` low; N N F `one-weak-signal` low; N N N `no-decline` good. Tests: all eight rows; greenness `rising` with the rest normal is `no-decline`; one `no-data` gives `not-enough-data`.
  `buildPath` returns dictionary keys in this order: `path.signal.greenness.falling`, `path.signal.temperature.rising`, `path.signal.waterUse.falling` (each only when that signal counts; if none counts, the single key `path.signal.allNormal`); then `diagnosis.<key>`; then `path.weatherDriven` if the finding is weather-driven; then `path.limit.<limit>` for each chosen limit in `LIMITS` order; then `path.priority.<priority>` for each chosen priority in the order given, or `path.priority.none`. Tests: the fixture's first finding with limits `["no-buyer","no-irrigation"]` and priorities `["soil","income"]` gives exactly `["path.signal.greenness.falling","path.signal.temperature.rising","path.signal.waterUse.falling","diagnosis.water-heat-stress","path.limit.no-irrigation","path.limit.no-buyer","path.priority.soil","path.priority.income"]`; the third finding with nothing chosen gives `["path.signal.waterUse.falling","diagnosis.one-weak-signal","path.weatherDriven","path.priority.none"]`.
- [ ] **weather.** `fetchPower` requests exactly `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&longitude=<lon>&latitude=<lat>&start=20010101&end=20251231&format=JSON` with both coordinates fixed to 2 decimals, passes an `AbortSignal`, and maps `properties.parameter.T2M_MAX / T2M_MIN / PRECTOTCORR` to `tmax / tmin / rain`. `summarise` works per calendar year from `POWER_FIRST_YEAR` to `POWER_LAST_YEAR` using `WEATHER_RULES`: hot days are days in the flowering window with `tmax` strictly above 30; autumn rain is the sum of `rain` in the autumn window; late frost days are days in the frost window with `tmin` strictly below 0. A day that is absent or -999 is skipped. For each measure, a year counts only if at least 90% of its window days are present. The value is the mean over the last 10 counted years (hot and frost days rounded to 1 decimal, rain to a whole mm) and the range is the minimum and maximum over those same years. If any measure has fewer than 3 counted years, `summarise` throws `Error("weather: not enough data")`. Each fact has `scale: "area"`, `confidence: "fair"`, `placeholder: false`, `asOf: "2025"`, `source: { dataset: "NASA POWER", resolution: "about 50 km", url: "https://power.larc.nasa.gov/" }`, units `"days"`, `"mm"`, `"days"`, and labels `weather.hotDays`, `weather.autumnRain`, `weather.lateFrost`. `years` is `[2001, 2025]`. Tests, from a generated series with every day at tmax 20, tmin 5, rain 1:
  - baseline: hot 0 with range [0, 0]; frost 0; autumn rain 91 with range [91, 91].
  - in 2025 set tmax 31 on 0415 and 0531, 35 on 0414 and 0601, exactly 30 on 0501: hot value 0.2, range [0, 2].
  - in 2024 set tmin -1 on 0301, 0430, 0229 and 0501: frost value 0.2, range [0, 2].
  - set every 2025 day to -999: 2025 is left out, the ten years used are 2015 to 2024, and no frost or hot day is counted for 2025.
  - a series covering only 2024 and 2025 throws `weather: not enough data`.
  - `fetchPower([16.0637, 40.8624], fake)` calls a URL containing `longitude=16.06&latitude=40.86`; a fake returning status 500 rejects; a fake returning `{}` rejects; with fake timers, a fake that only settles when its signal aborts rejects after 8000 ms.
- [ ] **url.** Parameters: `f` field id (only `genzano-demo` is accepted), `o` outline as `lon,lat;lon,lat` with 5 decimals, `c` last crop, `l` limits comma-separated, `p` priorities comma-separated, `s` scenario, `v` view, `g` language. Defaults are omitted on encode. On decode: unknown values are dropped; limits are unique and in `LIMITS` order; priorities are unique, at most the first two, order kept; an outline needs at least 3 valid points (longitude within ±180, latitude within ±90), is cut to 12 points and rounded to 5 decimals, otherwise it is `null`; if `f` is valid the outline is `null`. Tests:
  - `encodeState(DEFAULT_STATE)` is `""` and `decodeState("")` equals `DEFAULT_STATE`.
  - a full demo-field state (limits `["no-buyer","no-irrigation"]`, priorities `["soil","income"]`, scenario `drier`, view `simple`, lang `it`, last crop `chickpea`) round-trips, with limits coming back in `LIMITS` order and priorities in the order given.
  - a drawn-field state with a 4-point outline round-trips; `decodeState` accepts a leading `?`.
  - `decodeState("p=money,income,income,soil,water&s=wet&v=fancy&g=fr&c=maize&l=x&o=abc&f=other")` equals `DEFAULT_STATE` except `priorities: ["income","soil"]`.
  - `decodeState("o=1,2;3,4")` has `outline: null`; a 20-point outline decodes to 12 points; `decodeState("%E0%A4%A")` does not throw.
- [ ] **docs/scoring.md.** In plain words for an agronomist, not a programmer: the eight-row signal table with its two pre-checks from the README, the limit rules, the ordering rule, and the weather thresholds from `WEATHER_RULES`, each marked as a placeholder for the team to correct. Under 120 lines.
- [ ] Run `npm run typecheck` and `npx vitest run src/geo src/data src/ranking src/weather src/state`. Expected: no type errors, every test passes.

### Task 3: Screens (Claude Opus)

**Files (only these may be touched):**
- Replace: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`. Delete: `src/App.css`, `src/assets/`, `public/icons.svg`.
- Create: `src/theme/standard.css`, `src/theme/simple.css`, `src/i18n/en.ts`, `src/i18n/it.ts`, `src/i18n/index.ts`, `src/state/useAppState.ts`, `src/components/*`, `src/screens/*`, tests beside them.
- May edit: `package.json` (only to add a dependency that is really needed).

**Interfaces:**
- Consumes: everything exported from `src/data/types.ts` and the six logic modules, exactly as outlined there. Those modules are being filled in by another worker at the same time; until that lands their functions throw "not implemented". Do not edit them. Build the screens first and run the full checks last.
- Produces: `useAppState(): [AppState, (patch: Partial<AppState>) => void]` in `src/state/useAppState.ts`, reading and writing the query string through `decodeState` / `encodeState` and keeping it across route changes; `useT(): (key: string) => string` in `src/i18n/index.ts`, which returns the key itself when it is missing; `en` is the source dictionary and `it` must be typed as having exactly its keys.

Routes (hash routing): `/` FindField, `/area` AreaWeather, `/questions` Questions, `/options` Options, `/why/:optionId` Why, `/year` Year, `/adviser` Adviser, `/print` Print.

- [ ] **Shell.** `TopBar` (app name, Standard/Simple switch, EN/IT switch) and `StepBar` (six steps, earlier steps tappable). `data-view` and `lang` set on `<html>`. Theme files define the same variable names under `[data-view="standard"]` and `[data-view="simple"]`; Tailwind reads them through `@theme inline`. Any route other than `/` with no field in the state redirects to `/`; `/area` needs an outline; the rest need the demo field. An unknown route redirects to `/`.
- [ ] **FindField (step 1).** MapLibre map filling the screen, raster source `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` with its attribution and a short "aerial photo, not NASA data" label, opening on the demo field at zoom 15 with the demo outline drawn from the bundle. Town search through `https://photon.komoot.io/api/?q=<text>&limit=5` (results list, tap to fly there). "My location" through the browser's geolocation, with one short line if it is refused. Tapping inside the demo outline (`pointInRing`) opens a sheet: field name, "about 6 ha", "Yes, this one", "No, draw it". Tapping anywhere else offers "Draw your field". Draw mode stops the map from panning and records the finger trace; on release run `simplifyRing`, reject with a short "too small, try again" if `isUsableRing` is false, otherwise show the shape with its `areaHa` and "Yes" / "Redraw". "Yes" on the demo field sets `fieldId` and goes to `/questions`; "Yes" on a drawn field sets `outline` and goes to `/area`. Keep the map in one `Map` component that tests can mock.
- [ ] **AreaWeather.** `fetchPower(centroid(outline))` then `summarise`. Shows the three facts as "your area" numbers with ranges, one line saying field-level results exist for the demo field only so far, and a button that switches to the demo field and goes to `/questions`. A loading state. On any error: one line saying the weather history is not available right now, "Try again", and the demo button.
- [ ] **Questions (step 2).** Last crop (four crop buttons, pre-set from `bundle.lastCrop.crop`); limits (four toggles); priorities (pick two of four; when two are chosen the others are disabled until one is released). "Next" is enabled only with two priorities.
- [ ] **Options (step 3).** The three findings (icon, title, the fact's number, scale badge). Then `rankOptions` output: each row shows the three crop icons with the harvest year under each, income per year, water, nitrogen, risk, and tags for best fit, what you do now, support may apply, the confidence word, and one warning per flag. Removed options are not listed; one line says how many were ruled out by the farmer's limits. Tapping a row opens `/why/<id>`.
- [ ] **Why (step 4).** Five headings in this order: why suggested, evidence, benefits, what we don't know, check locally. "Why suggested" starts with `buildPath` for the first finding whose `addressedBy` includes this option (or the first finding), one step per line, then the option's `why.suggested` text. Each fact shows its label, value, range, scale badge, source dataset and resolution, and "as of" date when present. `Term` wraps NDVI, evapotranspiration, gross margin and confidence and opens a one-line explanation on tap.
- [ ] **Year (step 5).** A twelve-month strip from October with cover shown by colour and pattern, and risk icons. One headline: hot days at flowering now and by 2050 for the chosen scenario. One three-stop slider bound to `scenario`. Below it, the best option under that scenario, so the re-ranking is visible when the slider moves.
- [ ] **Adviser (step 6) and Print.** Adviser: "Print one page" (opens `/print`), "Send on WhatsApp" (`https://wa.me/?text=` plus the encoded share sentence and the link to `/options` with the current state), "Copy link". Print: one A4 page with the field, the answers, the findings, the ranked options with their facts and flags, the unknowns and local checks of the best option, the list of data sources, the placeholder note and the link; app chrome hidden under `@media print`; a "Print" button that calls `window.print()`.
- [ ] **Dictionaries.** Every key used by the screens and by the placeholder bundle, in English and Italian: `crop.*` (four crops), `level.*`, `finding.{bare,heat,dry}.{title,detail,fact}`, `why.<option id>.suggested` for the four option ids, `evidence.*`, `benefit.*`, `unknown.*`, `check.*`, `fact.*`, `year.*`, `weather.*`, `diagnosis.*` (nine keys), `path.*`, `limit.*`, `priority.*`, `term.*`. Italian is plain farmer's Italian, not a word-for-word translation.
- [ ] **Tests.** Mock the `Map` component and `fetch`. (a) `it` has every key of `en` and no empty string. (b) Every dictionary key that appears as a string in `public/data/genzano-demo.json` exists in `en`. (c) Options, rendered with the fixture and state `p=income,water`, shows four option rows, exactly one best-fit tag on chickpea and one what-you-do-now tag on durum. (d) Options with `l=cereal-machinery` shows three rows and the ruled-out line. (e) Opening `#/options` with no field redirects to FindField. (f) Opening `#/options?f=genzano-demo&p=zzz&s=wet` renders without throwing. (g) AreaWeather shows the error line and both buttons when `fetch` rejects. (h) Year: moving the slider to the last stop changes the best option shown to vetch-oat (with priorities income and water).
- [ ] Run `npm run typecheck`, `npm test`, `npm run build`. Expected: all pass once the logic modules have landed. Report any test that fails only because a logic function still throws "not implemented".

### Task 4: Integrate and check in a browser (main session)

- [ ] Commit Task 2 and Task 3 separately. Run `npm run typecheck`, `npm test`, `npm run build`.
- [ ] `npm run dev`, then at 375 px wide walk the demo field through all six steps in both views and both languages; draw a field elsewhere and confirm real NASA POWER numbers appear; reload a copied link and confirm the same state returns; open the print page.
- [ ] Count visible words per screen in both languages against the 40-word limit.
- [ ] Fill in the README "Running it" section.

### Task 5: Independent review (fleet: Sol and Gemini Hydrogen, read-only)

- [ ] Send the branch diff against `main` with the README and this plan. Ask for defects against the Review Focus list and the Global Constraints, most severe first. Fix what both agree on.
