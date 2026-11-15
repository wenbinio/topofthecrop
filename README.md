# Top of the Crop

**What should I plant after the wheat?** A phone web app that helps a durum wheat farmer in the Bradano river valley (Basilicata, southern Italy) compare crop rotations for their own field using NASA Earth observations, and check the answer locally before sowing, with an adviser or without one.

- **Event:** NASA International Space Apps Challenge 2026 (14–15 November 2026)
- **Challenge:** [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/)
- **Status:** built and live at https://wenbinio.github.io/topofthecrop/. This README is the agreed design, with the decisions made while building.
- **Deadline:** Sunday 15 November 2026, 23:59 Finland time (to be confirmed with our Local Lead, who may set an earlier cutoff).

> The field figures are real: they come from the data team's files in `data/`. The crop and money figures are researched but nobody has checked them against their sources (`docs/crops-research.md`). Two things are still our own judgement and are marked as placeholders in the app: each rotation's risk rating and the priority score rules.

**New here?** Read `AGENTS.md` for the rules, `HANDOVER-FRONTEND.md` for how the app is built and how it reads the data, and `HANDOVER.md` for the data files.

## The problem

A farmer on the rain-fed clay hills of the upper Bradano grows durum wheat, often durum after durum. Autumns are getting drier, flowering is getting hotter, and the soil sits bare through the summer. Adding a legume or a forage crop to the rotation could help, but which one? A crop that fixes nitrogen may also need a buyer who is not there, machinery the farm does not own, or carry a parasite risk (broomrape) on this particular field.

NASA has decades of observations that describe this field and this valley. They are not in a form a farmer can use while standing in the field.

## What the farmer does

Six steps, each one screen on a phone.

| Step | What the farmer sees | How it stays simple |
|---|---|---|
| 1. Find your field | Satellite map, town search, "My location". Tap the field. If we have no outline for it, or the wrong one, draw it: tap each corner, then pull any dot to adjust. Tracing round it with one finger also works. | The Genzano demo field is preloaded. A field drawn on the basin's farmland gets the same steps from the 1 km squares around it; anywhere else gets live NASA weather history for its area. |
| 2. Three questions | Last crop; limits (no irrigation, cereal machinery only, no buyer nearby, broomrape before); put the priorities (income, water, soil, forage) in order by tapping them, most important first: at least 2, up to all 4. | Big buttons. Last crop is pre-filled from the EU crop map. |
| 3. Your options | "What we see on your field": three measured findings (for example bare soil July to October). Then the four best-ranked rotations (a "More options" row opens the rest), each a three-year sequence shown as three crop icons with the harvest year under each (for example chickpea 2027, durum 2028, durum 2029). The top one is marked "Best fit", and its income is compared with durum after durum, what the farmer grows now. A switch under the list adds strip intercrops (two crops side by side, half the field each, swapped every year) to the ranking. | At most four facts per option: income in €/ha per year (averaged over the three years), water, nitrogen, risk; plus a confidence word. Possible public support shows as a small tag. |
| 4. Why? | Tap an option for five headings: why suggested, evidence, benefits, what we don't know, check locally. "Why suggested" opens with the path that led here, as plain steps. | Every number shows its source, its range, and whether it describes "your field" or "your area". Terms such as NDVI open a one-line explanation. |
| 5. Your field's year | One strip from October to September: green and bare months, risk icons (dry autumn, heat at flowering, heavy rain on bare soil, frost). One slider, "try a drier, hotter year", re-ranks the options. Below: this season's rain so far and the next seven days (live), and 2024 and 2026 against a usual season. | Two headline figures: hot days at flowering and October–May rain, now and by 2050. |
| 6. Check and share | What the farmer can check alone for the best-fit rotation; who can look at the plan if there is no adviser (cooperative or seed dealer, the CAA office, the region's farm advisory service, a neighbour, an agronomist); a one-page printout and a WhatsApp link. | The link reopens the same field and answers. No names or phone numbers: we could not keep them right. |

The tool supports a conversation with someone who knows the land: an adviser where the farmer has one, otherwise the people named in step 6. It never tells the farmer what to do, and every option lists what must be checked locally.

### How it sits beside existing tools

Rotation planners already exist. Assolia, a French tool sold through cooperatives, plans a whole farm's crops over 3 to 7 years to maximise gross margin from farm records, prices and constraints, and is mostly run by an adviser (as described in a 2022 trade article; we could not check its current state). We found no sign that it uses satellite or climate data, or explains its choices.

Top of the Crop does the step before that. It reads what satellites show on one field, turns that into a short ranked list of options with their reasons and unknowns, and hands the farmer a page to take to the adviser. The adviser, with a whole-farm tool, does the money.

### How this answers the challenge

| The challenge asks for | Where it is in the app |
|---|---|
| A decision-support tool combining NASA observations, local soil information, crop characteristics and farmer priorities | Steps 1 to 3 |
| At least three rotation strategies including the existing one | Step 3: nine options, each a three-year sequence, the current rotation always among them |
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
| Detail | Dataset and resolution labels on screen (for example "NASA MODIS (MOD13Q1) · 250 m") | Dataset labels hidden until tapped; risk shown as an icon plus one word |

The mockups for both are in `docs/mockups/`: direction B is the Standard view and direction D is the Simple view.

The design test for both: it must look like something a working farmer would have open on their phone next to WhatsApp and the weather app. Not a dashboard, not a concept piece.

Few words. A farmer will not read through a screen of text, so each screen leads with a number, an icon or a picture of the field, and keeps sentences for the "Why?" screen. As a working limit: no more than about 40 words visible on any screen outside "Why?" and the printout.

Languages: English and Italian, switchable on every screen. The demo video and submission are in English.

## Data

### NASA data

What the app uses, from the data team's files (`data/`, made by the notebooks in `ColabNotebooks/`) and two live services. `DATA_SOURCES.md` gives each dataset's licence, citation and resolution.

| Dataset | What we take from it | On screen | Resolution |
|---|---|---|---|
| MODIS Terra vegetation indices (MOD13Q1, v6.1) | Greenness: the green, patchy and bare months on the year strip, the bare months after harvest, and peak greenness each season (the Why screen's "less green than usual" step, the Year screen's 2024 and 2026 card, and the demo field's seasons much less green than nearby fields). Also green-up and dry-off dates | Yes. Demo field "your field"; a drawn field "your area" (1 km mean) | 250 m |
| MODIS Terra evapotranspiration (MOD16A2GF, v6.1; MOD16A2 for the latest months) | Water the crops used each season (the Why screen's "crops used less water" step) | Yes: a Why evidence line, and the Year screen's 2024 and 2026 card | 500 m |
| GPM IMERG Final, monthly (V07) | One of the three rain sources (with CHIRPS and ERA5-Land; the app shows their median): autumn rain, October–May rain, the slider's rain | Yes | about 11 km |
| NEX-GDDP-CMIP6 | Change by 2041–2060 from 29 climate models, on the middle (SSP2-4.5) and high (SSP5-8.5) paths: hot days at flowering, the usual high at flowering, the slider's rain; frost and rain for the evidence screens | Yes | about 28 km |
| SMAP L4 soil moisture (SPL4SMGP, v8) | Root-zone soil water at sowing (November) and in spring (March–April), 2016–2025 | Spring soil water: a Why evidence line, and the Year screen's 2024 and 2026 card. Sowing: in the data only | 9 km |
| NASADEM | Height and slope | Not yet: in the data | 30 m |
| Harmonized Landsat Sentinel-2 (HLSL30 and HLSS30, v2.0) | 30 m greenness at the demo field, used to check MODIS | No | 30 m |
| NASA POWER | Live: weather history for a field outside the basin, and this season's rain so far. In the data: a check on rain and temperature at the demo field | Yes, live | about 50 km |
| NASA GIBS Blue Marble | The map picture, zoomed out | Yes | 500 m |

Not used: ECOSTRESS (not processed in time, so the app has no surface-temperature data), GRACE (about 300 km, far too coarse for a field) and GEDI (sparse, poor over annual crops).

### Other data

| Source | Use |
|---|---|
| ERA5-Land (ECMWF, Copernicus Climate Change Service), about 11 km. Copernicus licence: free, with credit | Temperature: hot days at flowering, the usual high at flowering, frost nights. One of the three rain sources. The reference evapotranspiration behind durum's water need |
| CHIRPS daily rainfall (Climate Hazards Center, UCSB), about 5.6 km. Public domain | One of the three rain sources; with ERA5-Land, the daily rain behind rain onset and spring dry spells |
| ESA WorldCover 2021, CORINE Land Cover 2018, HydroSHEDS | The basin's outline and the mask of rain-fed farmland the 1 km squares cover |
| EU Crop Map (JRC, 10 m) | Pre-filling the last crop from the share of durum in the 2022 map. That map labels 86% of the basin's arable land as durum, so the farmer can change the answer |
| SoilGrids (ISRIC, 250 m) | Topsoil clay on the Why screen; sand, silt, organic carbon, pH, nitrogen, CEC and water-holding capacity in the data |
| FAO-56 (Allen et al. 1998) | The method behind reference evapotranspiration and durum's water need |
| Denora et al. (2025), the vetch trial at the demo field | The trial's own weather station and soil, typed in from the paper and used only to check our figures |
| Published agronomy trials and regional price data | Income (gross margin), nitrogen and water figures for each three-year rotation: see `docs/crops-research.md` and `docs/support-and-prices.md` |
| Map picture, zoomed out: NASA Blue Marble (MODIS), from NASA GIBS. Public domain. | Finding the area |
| Map picture, zoomed in, anywhere: Sentinel-2 cloudless 2016 by EOX (contains modified Copernicus Sentinel data 2016), 10 m, CC BY 4.0 | Finding and drawing a field outside the basin |
| Map picture, zoomed in, Bradano basin: our own tiles in `public/tiles/s2/`, cut by `scripts/build-basemap.py` from four Sentinel-2 L2A scenes of 30 May 2026 (contains modified Copernicus Sentinel data 2026), 10 m | Finding and drawing a field in the basin |
| Aerial photos on top, where they exist: AGEA orthophotos, flights 2022 to 2024, loaded live from AGEA's tile service. CC BY 4.0 (AGEA legal notes: "messe a disposizione per il riutilizzo alle condizioni della licenza Creative Commons BY 4.0"). About 1.8 m in Basilicata, finer in Puglia. | Seeing tracks, trees and field corners |
| Cadastral parcels of Genzano di Lucania: Agenzia delle Entrate, Cartografia catastale (INSPIRE Cadastral Parcels WFS). CC BY 4.0, stated in the service's own capabilities document. Downloaded ahead of time into `public/parcels/`. | Finding a field by its sheet and parcel numbers |
| Weather forecast: MET Norway, Locationforecast 2.0, loaded live. CC BY 4.0 and NLOD 2.0 (MET Norway's licence page); its terms allow calls straight from a web page. Credit shown: "Data from MET Norway". | Rain and the coldest night over the next seven days |

### Rules for honest numbers

- **Field or area.** Every number carries a badge: "your field" (figures from the demo field itself: MODIS greenness at 250 m, SoilGrids at 250 m, NASADEM at 30 m) or "your area" (the 1 km squares around a drawn field, and weather and climate grids of 5 to 50 km). Coarse data is never presented as a measurement of the field.
- **Source and range.** Every number links to its dataset and shows a range, not only a point value.
- **Confidence word.** Each option carries one: good, fair or low.
- **Income is a gross margin.** It is the average per year over the three-year sequence, in €/ha, and the "Why?" screen states the prices used and their date.
- **Placeholders are labelled.** A figure nobody has sourced yet, such as each rotation's risk rating, is marked on screen.
- **How data reaches the app.** The browser cannot read most NASA archives directly (login and cross-site restrictions). We extract the data for the demo field ahead of time into one JSON bundle. For the whole Bradano basin the data team extracted every 1 km square of farmland ahead of time too (`data/`, documented in `HANDOVER.md`); the app downloads those files only when a farmer draws a field. NASA POWER needs no login and allows calls from any website, so the app calls it live: for fields outside the basin, and for this season's rain on every field.

### How options are ranked

Diagnose, match, filter, rank. Every stage is a written rule an adviser can read; there is no trained model.

**1. A decision tree diagnoses the field from agreement between signals.** Three signals are measured for the field from the data team's season series, each comparing the field's last five seasons with its normal seasons, 2001–2020 (`measuredSignals` in `src/data/field-rules.js`; the thresholds are our judgement, written in `docs/scoring.md`):

- **Greenness:** peak greenness each season (NASA MODIS, 250 m)
- **Temperature:** hot days at flowering each season (ERA5-Land air temperature; the app has no surface temperature data)
- **Water use:** water the crops used each season (NASA MODIS evapotranspiration, 500 m)

The goal is agreement. If temperature rises or water use drops while greenness falls, that is stronger evidence of decline than any one signal alone. If they disagree, such as a warm patch with healthy greenness, it may be early stress, or something unrelated like bare soil or the weather that day. Each permutation leads to one finding and one confidence word:

| Greenness | Temperature | Water use | Finding | Confidence |
|---|---|---|---|---|
| Falling | Rising | Dropping | Water and heat stress; the crop is declining | Good |
| Falling | Rising | Normal | Decline with heat; could be heat damage, disease or a thin stand | Fair |
| Falling | Normal | Dropping | Less canopy and less water use without heat; poor establishment or nutrient shortage | Fair |
| Falling | Normal | Normal | Canopy loss not explained by heat or water; nutrients, weeds, disease, or simply harvest | Low: check locally |
| Normal | Rising | Dropping | Early water stress, before the canopy shows it | Fair |
| Normal | Rising | Normal | Hotter seasons but the crop stays green; early stress or unrelated | Low |
| Normal | Normal | Dropping | One weak signal; probably timing or sensor | Low |
| Normal | Normal | Normal | No decline detected | Good |

Two checks run before the table is read, so the tree does not blame the field for something else:

- **Is the field bare on purpose?** After harvest, low greenness is expected and is reported as a bare-soil period, not as decline.
- **Is the whole area affected?** Heat and autumn rain come from area grids (ERA5-Land; CHIRPS, NASA GPM IMERG and ERA5-Land), so those findings are marked as weather-driven, not specific to this field.

The table is our own judgement and needs an agronomist's check. The findings it produces are the "What we see on your field" strip in step 3, and the signals behind each one are the "Evidence" in step 4.

**2. Each finding points to rotation traits that address it.** For example: repeated water stress at grain fill points to crops that finish earlier or use less water; bare soil through summer points to a crop or cover that shortens the bare period; decline under continuous durum with no heat or water signal points to a legume break. This mapping from finding to rotation is the agronomy the team writes down in `docs/scoring.md`.

**3. The farmer's limits rule options in or out.** The limits from step 2 are yes/no facts, so they are also branches, not scores. Each either removes an option or flags it, and keeps its reason:

- No irrigation → options that need irrigation are removed.
- Cereal machinery only → options needing other equipment are removed.
- No buyer nearby → cash crops without a local outlet are flagged.
- Broomrape seen before → susceptible legumes are flagged.

A dealbreaker stays a dealbreaker: no score can outvote it. The current rotation is never removed, so there is always a baseline to compare against.

**3a. A legume just grown is not grown again.** If the farmer's last crop is a legume (chickpea, faba bean, lentil, pea, vetch-oat), an option that starts with the same crop is left out, and the Options screen says so in one line. The current rotation is never left out.

**4. The options that remain are ordered by the farmer's priorities, in the farmer's order.** Each option has a score from 0 to 1 for income, water, soil and forage. The farmer ranks at least two of the four; the first counts 4, the second 3, the third 2, the fourth 1, and the scores are averaged with those weights. A priority left out has no weight and only breaks ties. The weights are our own judgement (`docs/scoring.md`). This is the only place an index is used, and only to put a short list in order.

**5. The slider re-runs the ordering** for a drier, hotter year. Each stop is defined from the data: normal is a typical season (2001–2020), drier a 1-in-10 dry and hot season, much drier the driest and hottest seasons since 2001, each also shown by 2050. The Year screen says so under the slider and shows the stop's October–May rain beside its hot days (`docs/scoring.md`, "The slider").

**6. The farmer sees the path, never the score.** The "Why?" screen shows the route taken as plain steps, for example "greenness falling and water use dropping → water stress → no irrigation → you chose income and soil". Score numbers are not shown anywhere in the app.

The tree's branches and the score definitions are written down in `docs/scoring.md`.

## Tech stack

| Part | Choice | Why |
|---|---|---|
| App | React + TypeScript, built with Vite | Fast to build, no server needed |
| Hosting | Static site on GitHub Pages, built and published by `.github/workflows/pages.yml` on every push to `main` | Free, public demo link with no login |
| Map | MapLibre GL JS | No API key; draws the field outline and the finger-drawn shape |
| Town search | Photon (OpenStreetMap geocoder) | No key, no account |
| Styling | Tailwind CSS, with the two views as two sets of design tokens | One set of screens, two looks |
| Languages | Two typed dictionary files (`en.ts`, `it.ts`) | No library needed for two languages |
| State and sharing | Field, answers, view and language stored in the URL | The WhatsApp link reopens the same state with no backend |
| Printout | A dedicated print page with a print stylesheet | One page, no PDF library |
| Data | One typed JSON bundle per field in `public/data/` | The handover point between the screens and the data work |
| Tests | Vitest: ranking, the link, money, the data builders against the real data files, and the screens | Run on every pull request |

Not included: user accounts, a database, offline mode, an AI chat inside the app, automatic field-boundary detection ("Find edges" only grows a region from the spot the farmer taps).

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
type CropId = "durum" | "chickpea" | "faba" | "vetch-oat" | "lentil" | "pea" | "barley" | "rapeseed" | "coriander";

type FieldBundle = {
  field: { id: string; name: string; areaHa: number; outline: GeoJSON.Polygon };
  lastCrop: { crop: CropId; source: Fact["source"] };
  findings: {                                                         // three; a drawn field leaves out one it has no data for
    title: string; detail: string; fact: Fact;
    signals: { greenness: Signal; temperature: Signal; waterUse: Signal };
    weatherDriven: boolean;            // the whole area shows it, not just this field
    expectedBare?: boolean;            // the field is bare on purpose (after harvest), so it is not read as decline
    addressedBy: string[];             // ids of the options that respond to this finding
  }[];
  year: {                                                             // October first
    months: { cover: "green" | "part" | "bare"; risks: ("dry" | "frost" | "heat" | "rain")[] }[];
    risksByScenario?: Partial<Record<Scenario, ("dry" | "frost" | "heat" | "rain")[][]>>;  // risk icons per month for a slider stop
    hotDays: Record<Scenario, { now: Fact; by2050: Fact }>;
    flowerHigh?: { now: Fact; by2050: Fact };  // usual daytime high, 15 April to 15 June, °C; shown with the "hot day" definition
    rainSeason?: Record<Scenario, { now: Fact; by2050: Fact }>;  // October–May rain at each slider stop
  };
  options: {
    id: string;                        // "chickpea-durum-durum"
    isCurrent: boolean;
    sequence: [CropId, CropId, CropId]; // the next three harvests, in order
    strips?: [CropId, CropId, CropId];  // strip intercrop: a second sequence beside the first, half the field each
    firstHarvestYear: number;          // 2027 for the demo field
    facts: { income: Fact; water: Fact; nitrogen: Fact; risk: Fact };  // each covers the whole sequence; income is the average per year
    scores: Record<Scenario, Record<Priority, number>>;               // 0 to 1
    removedBy: Limit[];                // limits that take this option out
    flaggedBy: Limit[];                // limits that keep it but add a warning
    supportTag: boolean;
    why: { suggested: string; evidence: Fact[]; benefits: Fact[]; unknowns: string[]; checkLocally: string[] };
  }[];                                                                // 3 to 12, exactly one with isCurrent
  economics?: {                        // the sums behind the income figure; without it, facts.income is shown as given
    crops: Partial<Record<CropId, { yield: Fact; price: Fact; costs: Fact }>>;  // every crop any option grows; others may be left out
    support: { id: string; name: { en: string; it: string }; condition: { en: string; it: string };
      level: "eu" | "italy" | "basilicata"; amount: Fact; crops: CropId[]; options: string[]; defaultOn: boolean }[];
  };
  fieldData?: FieldData;               // the rest of the data team's figures as Facts, for evidence screens:
                                       // see FieldData in src/data/types.ts and HANDOVER-FRONTEND.md section 4f
};
```

All wording in a bundle is a dictionary key, not text, so both languages work (support names and conditions, which come from policy documents, carry both languages).

The income figure's confidence is worked out in the app (`incomeFact` in `src/money/money.ts`): the weakest confidence among the yield, price and cost facts of the option's three crops and the amounts of the support that applies and is switched on. A figure the farmer typed in Settings counts as `fair`.

Live weather for other fields uses the same `Fact` type:

```ts
type AreaWeather = {
  years: [number, number];             // [2001, 2025]
  hotDaysAtFlowering: Fact;            // scale "area", source NASA POWER, placeholder false
  autumnRain: Fact;
  lateFrostDays: Fact;
  rainLeftOut?: string[];              // NASA POWER rain months left out as impossible, "YYYYMM"
};
```

### Decisions made while building

- **Which fields work.** Three cases, and no fake results for any of them:
  - **The Genzano demo field** has its own bundle, with figures from inside its own outline. Tapping it selects it.
  - **A field drawn (or found from its edges) on rain-fed farmland in the Bradano basin** gets the same six steps. The app builds its bundle in the browser from the 1 km squares under the outline (`src/data/fieldFromBasin.ts`, using Edison's `src/data/fieldshift-data.js`), with the same rules as the demo field (`src/data/field-rules.js`, shared with `scripts/real-field.mjs`). Every figure is badged "your area" and each screen says once that it is for the 1 km area around the field; Options adds a line when under 80% of the outline is farmland. Crop prices, yields and support are regional, so the options and their income are the demo's. A value missing in the data is left out ("no data"), never shown as 0. The basin's outline is drawn as a thin white line on the map so the farmer sees where full results exist.
  - **Anywhere else** (outside the basin's farmland), the farmer gets live weather for the area (next point), a plain line saying full results cover Bradano basin farmland only, and a button to see the full example on the demo field.
- **Live weather for any field.** For a field that is not the demo field, the browser calls NASA POWER for the field's centre (rounded to two decimal places) and asks for daily maximum and minimum temperature and rainfall from 2001 to 2025. Tested on 14 Nov: the service allows calls from any website, and 25 years of daily data came back in about 1.5 seconds (about 300 KB). From that the app counts three things, each shown as a "your area" fact with the last ten years as the value and the spread across those years as the range:
  - hot days at flowering (days of 30 °C or more, 15 April to 15 June)
  - autumn rain (total, September to November)
  - late frost days (below 0 °C, March and April)

  The thresholds and dates are placeholders for the team to correct, and live in `docs/scoring.md`. These live counts are not the same figures as a basin field's. The demo field and drawn basin fields use the data team's 2001–2020 values (ERA5-Land temperature; for rain the median of CHIRPS, IMERG and ERA5-Land, with autumn as October–November), while this live count uses NASA POWER over the last ten years and starts autumn in September. Three NASA POWER rain months the data team found impossible at the demo field (October 2025, February and March 2026) are left out, and the screen says so. The "by 2050" number and the slider need climate projections, so outside the basin they are not shown. If the call fails or takes longer than 8 seconds, the app says the weather history is not available right now and offers the demo field.
- **The nine options are three-year sequences** for the harvests of 2027, 2028 and 2029, after the durum just harvested. Crop figures come from `docs/crops-research.md`; each option's facts, limits and scores are derived from its crops by the rules written in `scripts/make-placeholder-bundle.mjs`:
  - chickpea → durum → durum (one legume break)
  - faba bean → durum → faba bean (legume every other year)
  - vetch-oat forage → durum → durum (one forage year)
  - lentil, pea, barley, rapeseed or coriander → durum → durum (one break year)
  - durum → durum → durum (what the farmer does now)
- **Three years, fixed.** Every option has exactly three crops. The card shows them as three icons with the year under each, not as a sentence. Longer or shorter rotations are out of scope for this version.
- **The year strip in step 5** still shows the field's year as observed under the current rotation. A separate strip for each option is out of scope.
- **The slider** has three stops: normal, drier and hotter, much drier and hotter. It changes the ranking, the hot-days and rain figures and the risk icons. All three are precomputed in the bundle; the browser does no climate maths.
- **Simple view** is the same components with a `view` flag. It swaps the design tokens, hides dataset labels until tapped, and shows the findings and options as weather-style rows under one big headline. No separate screens.
- **Sharing link.** Hash routing (`/#/options?...`), so it works on any static host. The demo field travels as its id. A drawn field travels as its outline, simplified to at most 12 points at 5 decimal places. The farmer's own figures from Settings travel in `m`, only where they differ from ours: `p.<crop>` a crop's price (€/t), `c.<crop>` a crop's direct costs (€/ha), `y.<crop>` its yield (t/ha), `l1.<crop>` and `l2.<crop>` the extra durum after it (%), `s.<support id>` a support amount (€/ha) and `on.<support id>` 1 or 0 for a payment switched on or off. Payments the farmer added travel in `x`. Nothing is stored on a server.
- **Print page** is a route in the same app that reads the same link.
- **Map picture:** four open layers, none needing an account or key: NASA Blue Marble zoomed out, Sentinel-2 cloudless 2016 (EOX, CC BY 4.0) zoomed in, over the Bradano basin our own Sentinel-2 picture of one clear day (30 May 2026), and on top AGEA's aerial photos (CC BY 4.0) wherever AGEA serves them. Sentinel-2 pixels are 10 m; the AGEA photos show about 1.8 m in Basilicata. If AGEA's server does not answer, the Sentinel-2 picture underneath still shows. We dropped Esri World Imagery, which the scaffold used, because it is under a commercial licence (the Esri Master License Agreement), and the challenge rules ask for outside material that is free and open. Of Italy's other public aerial photos, the national geoportal's and the Basilicata region's could not be loaded from a web page when we tested them on 15 November 2026.
- **Target devices:** current Chrome on Android and Safari on iPhone, from 360 px wide.

### Layout

```
src/
  screens/      one file per step (FindField, Questions, Options, Why, Year, Adviser), plus Settings, Print and
                AreaWeather; the bigger ones keep their parts in a folder (find-field/, settings/)
  components/   shared pieces: the map, crop names and symbols, fact rows, the year strip, the live weather blocks, credits
  data/         the data contract, loading and checking a bundle, and the rules that turn the data files into field facts
  money/        the income sums
  ranking/      diagnosis and ranking rules, with tests
  weather/      the NASA POWER and MET Norway calls and their counting rules, with tests
  voice/        voice commands and read-aloud
  state/        the link: the farmer's choices in and out of the address
  geo/          drawing, edge-finding and outline maths
  i18n/         en.ts, it.ts
  theme/        standard.css, simple.css
public/data/    genzano-demo.json, the demo field's bundle
public/tiles/   the basin's own Sentinel-2 map picture
public/parcels/ cadastral parcels for Genzano di Lucania
data/           the data team's files (HANDOVER.md); never edited by hand, served at data/basin/
ColabNotebooks/ the data team's notebooks that make data/
scripts/        builders for the demo bundle, the basin map picture and the parcels
docs/           scoring.md, crops-research.md, support-and-prices.md, checking-the-app.md, mockups/
```

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

Space Apps allows AI tools if their use is disclosed and they do not produce the core idea. In short: the idea, the choices and the checking are the team's; most of the code and the notebooks were written with AI tools.

**What the team did**
- **The idea and the design.** The farmer's question, the six steps, and a phone web app rather than a dashboard came from the team.
- **The place.** The team picked rain-fed durum in southern Italy after its own Earth Engine run (10 November 2026) compared how often satellites get a clear view of cropland in 17 areas. It chose the demo field, the site of a published durum and vetch trial (Denora et al. 2025), so the satellite figures could be checked against what was measured there.
- **The data.** The data lead ran every notebook in Google Earth Engine, checked the results against the trial's own weather station and against other datasets, and decided what reaches the app (`HANDOVER.md`). Those checks caught, for example, NASA POWER's impossible rain months, which the app now leaves out.
- **The research.** The team's research compilation (`research-compilation/`) is behind the extra durum after a legume.
- **The product.** The team tried each version of the app, decided what to change (for example putting the priorities in order instead of picking two, and defining what "drier" means) and reviewed every change before it went live.

**What AI tools did**
- **AI coding and research tools** were used to build it: Claude (Opus for interface code and design, Sonnet for background research), OpenAI Codex (Sol, for audits), and Gemini (Hydrogen, for read-only reviews and for editing the app's wording in English and Italian, which Claude then checked and applied; no native Italian speaker has read it), coordinated with a multi-agent tool called fleet.
- **The data notebooks** in `ColabNotebooks/` were written with Claude (Anthropic) on claude.ai, as were their checks, `HANDOVER.md`, the data helper `src/data/fieldshift-data.js` and the code that turns the data into the app's figures. The data values come from the cited datasets, not from the AI, except a few published values from the trial at the demo field (its weather station's rain and temperature, and its soil), typed in from Denora et al. (2025) and labelled as such.
- **Code in this repository** was largely written by these tools and reviewed by the team.
- **No AI-generated images or video** are used without a visible watermark.
- **The app says so too.** A short version of this section, with the credit lines the data licences ask for, is under "Data and credits" at the end of Check and share and on the printout (`src/components/DataCredits.tsx`).
- **The app itself contains no AI model.** Options come from a written decision tree and ranking rules.
- **Voice uses the phone, not us.** The app contains no hosted AI model and sends nothing to a server of ours. Its voice commands and "read aloud" use the browser's built-in speech recognition and speech synthesis, which the phone maker (Google, Apple, Samsung) provides; recognition may send the audio to the phone maker's servers. Spoken words become commands through a written list of phrases (`src/voice/commands.ts`), not a model.

## Licence

The code in this repository is under the MIT licence (`LICENSE`).

That covers what the team wrote. Everything else keeps its own licence, which the tables under [Data](#data) name:
- the data team's files in `data/` are built from the datasets listed in `DATA_SOURCES.md`, each under its own terms;
- the map tiles in `public/tiles/s2/` contain modified Copernicus Sentinel data;
- the parcels in `public/parcels/` are from the Agenzia delle Entrate, CC BY 4.0;
- the aerial photos (AGEA), the forecast (MET Norway) and the other map layers are loaded live from their owners and are not part of this repository.

## Open questions

- Is the submission deadline 23:59 Finland time, or does our local event close earlier?
- Team member names for this page.
- Are the weather thresholds right for durum in the upper Bradano (30 °C or more, 15 April to 15 June for flowering; frost in March and April)?
- Are the eight alternative sequences right for the upper Bradano?
- The crop, price and support figures, checked against their sources (`docs/crops-research.md`, `docs/support-and-prices.md`).
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

The basin data needs no extra step: a small plugin in `vite.config.ts` serves `data/*.json` and `data/*.geojson` at `data/basin/` while `npm run dev` runs, and writes them to `dist/data/basin/` on `npm run build` (so the GitHub Pages workflow ships them too). Nothing is copied into `public/`, so the files exist once in git. The demo field never downloads them; a drawn field loads them once per session (about 4.6 MB, 1.2 MB gzipped), with the same 8-second limit per file as the demo bundle and a Retry.

### Updating the data

The demo field's figures come from `data/field.json`. `scripts/real-field.mjs` turns it into field facts, and `scripts/make-placeholder-bundle.mjs` (named from when its figures were made up) adds the rotations and money and writes `public/data/genzano-demo.json`. Run `node scripts/make-placeholder-bundle.mjs` after replacing `data/field.json` or changing a crop figure. The bundle's shape is defined in `src/data/types.ts` and checked when the app loads it, so a wrong file fails with a message saying what is wrong. A figure nobody has sourced carries `placeholder: true`, and the screen showing it says so.

The basin files in `data/` come from the data team's notebooks; to update them, replace the files as `HANDOVER.md` section 9 says. Keys stay the same, so the app needs no change.

The basin's map picture in `public/tiles/s2/` (1,597 tiles, about 25 MB, zooms 10 to 14) is cut by `scripts/build-basemap.py` from four Sentinel-2 L2A true-colour scenes of 30 May 2026, each under 1% cloud, downloaded without a login from the public `sentinel-cogs` archive. `public/tiles/s2/about.json` lists the scenes. To rebuild it for another day, download each scene's `TCI.tif`, name them `TCI_<square>.tif`, and run `python scripts/build-basemap.py <folder>` (needs rasterio, numpy, pillow, mercantile and shapely). The script was written with AI assistance.

The cadastral parcels in `public/parcels/D971/` (Genzano di Lucania) are downloaded by `scripts/fetch-parcels.mjs`. The cadastre's service refuses calls from a web page and answers only for areas about 1.5 km across, so the script walks the commune in small squares and writes one small file per cadastral sheet. To add a commune, run it with that commune's code, name and a box that holds it, then add the commune to `PARCEL_COMMUNES` in `src/data/parcels.ts`. The script was written with AI assistance.

Credits the map shows: "Contains modified Copernicus Sentinel data 2026" (our tiles), "Sentinel-2 cloudless by EOX, contains modified Copernicus Sentinel data 2016, CC BY 4.0", "Aerial photos © AGEA, flights 2022–2024, CC BY 4.0", and NASA GIBS for Blue Marble. We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

The decision tree, the limit rules and the weather thresholds are written in plain words in `docs/scoring.md` for the team to correct.
