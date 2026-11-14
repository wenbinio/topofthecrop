# Top of the Crop

**What should I plant after the wheat?** A phone web app that helps a durum wheat farmer in the Bradano river valley (Basilicata, southern Italy) compare crop rotations for their own field using NASA Earth observations, and take the answer to their agricultural adviser.

- **Event:** NASA International Space Apps Challenge 2026 (14–15 November 2026)
- **Challenge:** [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/)
- **Status:** planning. Nothing is built yet. This README is the agreed design and build plan.
- **Deadline:** Sunday 15 November 2026, 23:59 Finland time (to be confirmed with our Local Lead, who may set an earlier cutoff).

> Every figure in the app is a labelled placeholder until the real Genzano data bundle replaces it (see [Build plan](#build-plan)). No placeholder may appear in the submitted version.

## The problem

A farmer on the rain-fed clay hills of the upper Bradano grows durum wheat, often durum after durum. Autumns are getting drier, flowering is getting hotter, and the soil sits bare through the summer. Adding a legume or a forage crop to the rotation could help, but which one? A crop that fixes nitrogen may also need a buyer who is not there, machinery the farm does not own, or carry a parasite risk (broomrape) on this particular field.

NASA has decades of observations that describe this field and this valley. They are not in a form a farmer can use while standing in the field.

## What the farmer does

Six steps, each one screen on a phone.

| Step | What the farmer sees | How it stays simple |
|---|---|---|
| 1. Find your field | Satellite map, town search, "My location". Tap the field; if we have no outline for it, or the wrong one, draw around it with a finger. | The Genzano demo field is preloaded. A field drawn anywhere else gets live NASA weather history for its area. |
| 2. Three questions | Last crop; limits (no irrigation, cereal machinery only, no buyer nearby, broomrape before); pick 2 of 4 priorities (income, water, soil, forage). | Big buttons. Last crop is pre-filled from the EU crop map. |
| 3. Your options | "What we see on your field": three measured findings (for example bare soil July to October). Then four ranked rotations, each a three-year sequence shown as three crop icons with the harvest year under each (for example chickpea 2027, durum 2028, durum 2029): continuous durum plus three alternatives. The top one says "Best fit for you". | At most four facts per option: income in €/ha per year (averaged over the three years), water, nitrogen, risk; plus a confidence word. Possible public support shows as a small tag. |
| 4. Why? | Tap an option for five headings: why suggested, evidence, benefits, what we don't know, check locally. "Why suggested" opens with the path that led here, as plain steps. | Every number shows its source, its range, and whether it describes "your field" or "your area". Terms such as NDVI open a one-line explanation. |
| 5. Your field's year | One strip from October to September: green and bare months, risk icons (dry autumn, heat at flowering, heavy rain on bare soil, frost). One slider, "try a drier, hotter year", re-ranks the options. | One headline number: hot days at flowering, now and by 2050. |
| 6. Take it to your adviser | A one-page printout and a WhatsApp link. | The link reopens the same field and answers. |

The tool supports a conversation with a local adviser. It never tells the farmer what to do, and every option lists what must be checked locally.

### How it sits beside existing tools

Rotation planners already exist. Assolia, a French tool sold through cooperatives, plans a whole farm's crops over 3 to 7 years to maximise gross margin from farm records, prices and constraints, and is mostly run by an adviser (as described in a 2022 trade article; we could not check its current state). We found no sign that it uses satellite or climate data, or explains its choices.

Top of the Crop does the step before that. It reads what satellites show on one field, turns that into three or four options with their reasons and unknowns, and hands the farmer a page to take to the adviser. The adviser, with a whole-farm tool, does the money.

### How this answers the challenge

| The challenge asks for | Where it is in the app |
|---|---|
| A decision-support tool combining NASA observations, local soil information, crop characteristics and farmer priorities | Steps 1 to 3 |
| At least three rotation strategies including the existing one | Step 3: four options, each a three-year sequence, the current rotation always among them |
| For each: why suggested, evidence, benefits, information gaps, risks needing local review | Step 4, using the same five headings |
| Bare-field periods and seasons of vulnerability | Step 5 strip and step 3 findings |
| Explaining terms, satellite versus ground measurements, uncertainty | Step 4 explanations, scale badges, ranges and confidence words |
| Scenario sliders | Step 5 |
| Farmer inputs for priorities and constraints | Step 2 |
| Support, not replace, local expertise | Step 6 and "check locally" on every option |

## Two views

The app has one set of screens and two looks, switched from the top bar. The choice travels in the shared link.

| | Standard view | Simple view |
|---|---|---|
| For | A farmer or adviser who wants to see the data | A farmer who wants the answer at a glance |
| Look | Satellite first: the map fills the screen, and the options screen opens with a vegetation thumbnail of the field and a 12-month green/bare strip | Weather app: one big headline for the field, then the findings and options as forecast-style rows, each led by an icon and one number |
| Detail | Dataset and resolution labels on screen (for example "LANDSAT · 30 m") | Dataset labels hidden until tapped; risk shown as an icon plus one word |

The mockups for both are in `docs/mockups/`: direction B is the Standard view and direction D is the Simple view.

The design test for both: it must look like something a working farmer would have open on their phone next to WhatsApp and the weather app. Not a dashboard, not a concept piece.

Few words. A farmer will not read through a screen of text, so each screen leads with a number, an icon or a picture of the field, and keeps sentences for the "Why?" screen. As a working limit: no more than about 40 words visible on any screen outside "Why?" and the printout.

Languages: English and Italian, switchable on every screen. The demo video and submission are in English.

## Data

### NASA data

| Dataset | What we take from it | Shown as | Resolution |
|---|---|---|---|
| Landsat / HLS (Harmonized Landsat Sentinel-2) | Vegetation index over the seasons: green and bare months, stress years | Your field | 30 m |
| SRTM elevation | Slope, for erosion risk on bare soil | Your field | 30 m |
| ECOSTRESS | Land surface temperature and plant water stress, where scenes exist | Your field | 70 m |
| NASA POWER | Daily temperature and rainfall history: hot days at flowering, frost days, dry autumns | Your area | about 50 km |
| GPM IMERG | Heavy-rain events | Your area | about 10 km |
| SMAP | Soil moisture anomalies as regional context | Your area | 9–36 km |
| NEX-GDDP-CMIP6 | Hot days at flowering by 2050 | Your area | about 25 km |

Left out on purpose: GRACE (about 300 km, far too coarse for a field) and GEDI (sparse, poor over annual crops).

Resolutions above are from general knowledge and must be checked against each product page before submission.

### Other data

| Source | Use |
|---|---|
| EU Crop Map (JRC, 10 m) | Pre-filling the last crop |
| SoilGrids (ISRIC, 250 m) | Soil texture and organic carbon |
| Published agronomy trials and regional price data | Income (gross margin), nitrogen and water figures for each three-year rotation (sources to be chosen in the data phase) |
| High-resolution aerial basemap (provider to be chosen, licence to be checked) | Finding and tapping the field. This is not NASA data and is labelled as such. |

### Rules for honest numbers

- **Field or area.** Every number carries a badge: "your field" (30–70 m data) or "your area" (10–50 km data). Coarse data is never presented as a measurement of the field.
- **Source and range.** Every number links to its dataset and shows a range, not only a point value.
- **Confidence word.** Each option carries one: good, fair or low.
- **Income is a gross margin.** It is the average per year over the three-year sequence, in €/ha, and the "Why?" screen states the prices used and their date.
- **Placeholders are labelled.** Until real data arrives, the screen says so.
- **How data reaches the app.** The browser cannot read most NASA archives directly (login and cross-site restrictions). We extract the data for the demo field ahead of time into one JSON bundle. NASA POWER needs no login and allows calls from any website, so the app calls it live for fields outside the demo.

### How options are ranked

Diagnose, match, filter, rank. Every stage is a written rule an adviser can read; there is no trained model.

**1. A decision tree diagnoses the field from agreement between signals.** Three satellite signals are read for the field, each compared with the same weeks in earlier years:

- **Greenness** (NDVI, from Landsat/HLS or the ECOSTRESS-grid NDVI product)
- **Surface temperature** (ECOSTRESS)
- **Water use** (evapotranspiration, from ECOSTRESS and Landsat)

The goal is agreement. If temperature rises or water use drops while greenness falls, that is stronger evidence of decline than any one signal alone. If they disagree, such as a warm patch with healthy greenness, it may be early stress, or something unrelated like bare soil or the weather that day. Each permutation leads to one finding and one confidence word:

| Greenness | Temperature | Water use | Finding | Confidence |
|---|---|---|---|---|
| Falling | Rising | Dropping | Water and heat stress; the crop is declining | Good |
| Falling | Rising | Normal | Decline with heat; could be heat damage, disease or a thin stand | Fair |
| Falling | Normal | Dropping | Less canopy and less water use without heat; poor establishment or nutrient shortage | Fair |
| Falling | Normal | Normal | Canopy loss not explained by heat or water; nutrients, weeds, disease, or simply harvest | Low: check locally |
| Normal | Rising | Dropping | Early water stress, before the canopy shows it | Fair |
| Normal | Rising | Normal | Warm patch with a healthy crop; early stress or unrelated | Low |
| Normal | Normal | Dropping | One weak signal; probably timing or sensor | Low |
| Normal | Normal | Normal | No decline detected | Good |

Two checks run before the table is read, so the tree does not blame the field for something else:

- **Is the field bare on purpose?** After harvest, low greenness is expected and is reported as a bare-soil period, not as decline.
- **Is the whole area affected?** If rainfall and temperature for the area (NASA POWER, GPM) show a drought or heat wave, the finding is marked as weather-driven, not specific to this field.

This table is a first draft for the team to correct. The findings it produces are the "What we see on your field" strip in step 3, and the signals behind each one are the "Evidence" in step 4.

**2. Each finding points to rotation traits that address it.** For example: repeated water stress at grain fill points to crops that finish earlier or use less water; bare soil through summer points to a crop or cover that shortens the bare period; decline under continuous durum with no heat or water signal points to a legume break. This mapping from finding to rotation is the agronomy the team writes down in `docs/scoring.md`.

**3. The farmer's limits rule options in or out.** The limits from step 2 are yes/no facts, so they are also branches, not scores. Each either removes an option or flags it, and keeps its reason:

- No irrigation → options that need irrigation are removed.
- Cereal machinery only → options needing other equipment are removed.
- No buyer nearby → cash crops without a local outlet are flagged.
- Broomrape seen before → susceptible legumes are flagged.

A dealbreaker stays a dealbreaker: no score can outvote it. The current rotation is never removed, so there is always a baseline to compare against.

**4. The options that remain are ordered by the farmer's two priorities.** Each option has a score from 0 to 1 for income, water, soil and forage. The two chosen priorities are averaged with equal weight; the other two only break ties. This is the only place an index is used, and only to put a short list in order.

**5. The slider re-runs the ordering** with the water and heat inputs for a drier, hotter year.

**6. The farmer sees the path, never the score.** The "Why?" screen shows the route taken as plain steps, for example "greenness falling and water use dropping → water stress → no irrigation → you chose income and soil". Score numbers are not shown anywhere in the app.

The tree's branches and the score definitions are set in the data phase and written down in `docs/scoring.md`.

## Tech stack

| Part | Choice | Why |
|---|---|---|
| App | React + TypeScript, built with Vite | Fast to build, no server needed |
| Hosting | Static site on Cloudflare Pages | Free, public demo link with no login |
| Map | MapLibre GL JS | No API key; draws the field outline and the finger-drawn shape |
| Town search | Photon (OpenStreetMap geocoder) | No key, no account |
| Styling | Tailwind CSS, with the two views as two sets of design tokens | One set of screens, two looks |
| Languages | Two typed dictionary files (`en.ts`, `it.ts`) | No library needed for two languages |
| State and sharing | Field, answers, view and language stored in the URL | The WhatsApp link reopens the same state with no backend |
| Printout | A dedicated print page with a print stylesheet | One page, no PDF library |
| Data | One typed JSON bundle per field in `public/data/` | The handover point between the screens and the data work |
| Tests | Vitest on ranking and on URL round-trip | The only real logic in the frontend |

Not included: user accounts, a database, offline mode, an AI chat inside the app, automatic field-boundary detection.

### The data contract

Every number the app shows has this shape, so the data work can replace placeholders without touching the screens:

```ts
type Fact = {
  value: number | string;
  unit?: string;                       // "€/ha", "kg N/ha", "days"
  range?: [number, number];
  scale: "field" | "area";
  source: { dataset: string; resolution: string; url: string };
  confidence: "good" | "fair" | "low";
  asOf?: string;                       // date of the prices or data, where it matters ("2026-10")
  label?: string;                      // dictionary key naming what the number is
  placeholder: boolean;                // true until real data replaces it
};
```

A field's bundle wraps those facts in a fixed outline. The builder may add fields but not rename these:

```ts
type Scenario = "normal" | "drier" | "much-drier";     // the three slider stops
type Priority = "income" | "water" | "soil" | "forage";
type Limit = "no-irrigation" | "cereal-machinery" | "no-buyer" | "broomrape";
type Signal = "rising" | "falling" | "normal" | "no-data";

type FieldBundle = {
  field: { id: string; name: string; areaHa: number; outline: GeoJSON.Polygon };
  lastCrop: { crop: string; source: Fact["source"] };
  findings: {                                                         // exactly three
    title: string; detail: string; fact: Fact;
    signals: { greenness: Signal; temperature: Signal; waterUse: Signal };
    weatherDriven: boolean;            // the whole area shows it, not just this field
    addressedBy: string[];             // ids of the options that respond to this finding
  }[];
  year: {                                                             // October first
    months: { cover: "green" | "part" | "bare"; risks: ("dry" | "frost" | "heat" | "rain")[] }[];
    hotDays: Record<Scenario, { now: Fact; by2050: Fact }>;
  };
  options: {
    id: string;                        // "chickpea-durum-durum"
    isCurrent: boolean;
    sequence: [string, string, string]; // crop ids for the next three harvests, in order
    firstHarvestYear: number;          // 2027 for the demo field
    facts: { income: Fact; water: Fact; nitrogen: Fact; risk: Fact };  // each covers the whole sequence; income is the average per year
    scores: Record<Scenario, Record<Priority, number>>;               // 0 to 1
    removedBy: Limit[];                // limits that take this option out
    flaggedBy: Limit[];                // limits that keep it but add a warning
    supportTag: boolean;
    why: { suggested: string; evidence: Fact[]; benefits: Fact[]; unknowns: string[]; checkLocally: string[] };
  }[];                                                                // exactly four
};
```

All wording in a bundle is a dictionary key, not text, so both languages work.

Live weather for other fields uses the same `Fact` type:

```ts
type AreaWeather = {
  years: [number, number];             // [2001, 2025]
  hotDaysAtFlowering: Fact;            // scale "area", source NASA POWER, placeholder false
  autumnRain: Fact;
  lateFrostDays: Fact;
};
```

### Decisions already made for the builder

- **Which fields work.** Only the Genzano demo field has an outline and a bundle, so only it gets findings from the field itself and ranked options. Tapping it selects it. Anywhere else, the farmer draws the field and gets live weather for the area (next point), a plain line saying field-level results exist for the demo field only so far, and a button to see the full example on the demo field. No fake results for other fields.
- **Live weather for any field.** For a field that is not the demo field, the browser calls NASA POWER for the field's centre (rounded to two decimal places) and asks for daily maximum and minimum temperature and rainfall from 2001 to 2025. Tested on 14 Nov: the service allows calls from any website, and 25 years of daily data came back in about 1.5 seconds (about 300 KB). From that the app counts three things, each shown as a "your area" fact with the last ten years as the value and the spread across those years as the range:
  - hot days at flowering (days above 30 °C, 15 April to 31 May)
  - autumn rain (total, September to November)
  - late frost days (below 0 °C, March and April)

  The thresholds and dates are placeholders for the team to correct, and live in `docs/scoring.md`. The same counting code produces the demo bundle's weather facts, so the two always agree. The "by 2050" number and the slider need climate projections, so they stay demo-field only. If the call fails or takes longer than 8 seconds, the app says the weather history is not available right now and offers the demo field.
- **The four options are three-year sequences** for the harvests of 2027, 2028 and 2029, after the durum just harvested. Placeholders until the data phase confirms them:
  - chickpea → durum → durum (one legume break)
  - faba bean → durum → faba bean (legume every other year)
  - vetch-oat forage → durum → durum (one forage year)
  - durum → durum → durum (what the farmer does now)
- **Three years, fixed.** Every option has exactly three crops. The card shows them as three icons with the year under each, not as a sentence. Longer or shorter rotations are out of scope for this version.
- **The year strip in step 5** still shows the field's year as observed under the current rotation. A separate strip for each option is out of scope.
- **The slider** has three stops: normal, drier and hotter, much drier and hotter. It changes the ranking, the hot-days number and the risk icons. All three are precomputed in the bundle; the browser does no climate maths.
- **Simple view** is the same components with a `view` flag. It swaps the design tokens, hides dataset labels until tapped, and shows the findings and options as weather-style rows under one big headline. No separate screens.
- **Sharing link.** Hash routing (`/#/options?...`), so it works on any static host. The demo field travels as its id. A drawn field travels as its outline, simplified to at most 12 points at 5 decimal places. Nothing is stored on a server.
- **Print page** is a route in the same app that reads the same link.
- **Basemap for the scaffold:** Esri World Imagery with its attribution, until the licence question below is settled.
- **Target devices:** current Chrome on Android and Safari on iPhone, from 360 px wide.

### Planned layout

```
src/
  screens/      one file per step (FindField, Questions, Options, Why, Year, Adviser)
  components/   shared pieces (TopBar, StepBar, FactBadge, OptionRow, YearStrip, Map)
  ranking/      scoring rules and tests
  weather/      NASA POWER call, and the counting rules with tests
  state/        URL encoding and decoding
  i18n/         en.ts, it.ts
  theme/        standard.css, simple.css
public/data/    genzano-demo.json
docs/           scoring.md, data-sources.md, mockups/
```

## Build plan

Frontend first, on placeholder data. The data work follows and swaps in real numbers through the data contract. Times are Finland time.

| When | What | Done when |
|---|---|---|
| Sat by 16:00 | Scaffold, both themes, top bar, step bar, deploy pipeline | A public link shows an empty app in both views and both languages |
| Sat by 21:00 | All six screens on the placeholder bundle; tap and draw on the map; ranking with tests. In parallel: the live weather module with tests | The Genzano demo runs start to finish on a phone, and a field drawn elsewhere shows real weather for its area |
| Sat evening to Sun 12:00 | Data phase: extract the real Genzano bundle (HLS, SRTM, POWER, GPM, CMIP6 first; ECOSTRESS and SMAP if time allows); choose agronomy sources; set scoring | No placeholder flag left in the demo bundle |
| Sun by 15:00 | Slider, term explanations, print page, WhatsApp link, Italian wording check | Every row of the challenge table above is visible in the app |
| Sun by 18:00 | 30-second video, submission text, NASA data list, AI-use statement | Draft submission saved on the project page |
| Sun by 21:00 | Submit, then test every link in a private window | Submitted, with three hours of margin |

If time runs short, cut in this order: ECOSTRESS and SMAP, live weather for other fields (fall back to "demo field only"), the WhatsApp link, the Simple view's separate look (keep the switch for detail level only). Never cut: real NASA data for the demo field, the five "Why?" headings, the scale badges.

## Submission

Aiming at the **Local Impact** award, with **Best Use of Data** second.

- [ ] Project name and high-level summary
- [ ] Link to demo: a video of 30 seconds or less, in English, on a public link
- [ ] Link to final project: the live app, plus this repository
- [ ] Detailed description, including tools used
- [ ] NASA data list with links (at least one NASA source is required for a global award)
- [ ] Partner data and other references
- [ ] Use of AI statement (below)
- [ ] All links open in a private window with no login
- [ ] "Submit for Judging" clicked before the deadline

The video opens on the Genzano field and the hot-days number, not on a logo.

## Use of AI

Space Apps allows AI tools if their use is disclosed and they do not produce the core idea.

- **The idea and the six-step design** came from the team.
- **AI coding and research tools** were used to build it: Claude (Opus for interface code and design, Sonnet for background research), OpenAI Codex (Sol, for audits), and Gemini (Hydrogen, for read-only reviews), coordinated with a multi-agent tool called fleet.
- **Code in this repository** was largely written by these tools and reviewed by the team.
- **No AI-generated images or video** are used without a visible watermark.
- **The app itself contains no AI model.** Options come from a written decision tree and ranking rules.

## Open questions

- Is the submission deadline 23:59 Finland time, or does our local event close earlier?
- Team member names for this page.
- Must the repository be public for judging? (Planned: make it public before submitting.)
- Licence for the code (planned: MIT).
- Are the weather thresholds right for durum in the upper Bradano (30 °C, 15 April to 31 May for flowering; frost in March and April)?
- Are the three alternative sequences right for the upper Bradano (chickpea → durum → durum, faba bean → durum → faba bean, vetch-oat forage → durum → durum)?
- Which aerial basemap, and does its licence allow this use?
- Sources for rotation income and nitrogen figures in Basilicata.
- What to say about public support (CAP eco-schemes) and where to source it.
- Italian wording needs a check by a native speaker.

## Running it

Needs Node 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints. To check everything before pushing:

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` writes a static site to `dist/` that works from any folder on any static host.

### Replacing the placeholder data

The app reads one file, `public/data/genzano-demo.json`. Its shape is defined in `src/data/types.ts` and checked when the app loads it, so a wrong file fails with a message saying what is wrong. `scripts/make-placeholder-bundle.mjs` shows how the current placeholder file is produced. Set `placeholder` to `false` on each fact as real numbers replace made-up ones; the "placeholder figures" note disappears from a screen once none of its facts are placeholders.

The decision tree, the limit rules and the weather thresholds are written in plain words in `docs/scoring.md` for the team to correct.
