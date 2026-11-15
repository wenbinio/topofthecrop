# Top of the Crop

**What should I plant after the wheat?** A phone web app that helps a durum wheat farmer in the Bradano river valley (Basilicata, southern Italy) compare crop rotations for their own field using NASA Earth observations, and check the answer locally before sowing.

- **Live app:** https://wenbinio.github.io/topofthecrop/ (demo field: https://wenbinio.github.io/topofthecrop/#/questions?f=genzano-demo)
- **Event:** NASA International Space Apps Challenge 2026, challenge [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/)
- **Team:** Top of the Crop

## The problem

On the rain-fed clay hills of the upper Bradano, farmers often grow durum after durum. Autumns are getting drier, flowering hotter, and the soil sits bare through summer. A legume or forage crop could help, but which one? It may need a buyer who is not there, machinery the farm does not own, or carry a parasite risk (broomrape) on this field. NASA has decades of observations of this field and valley, but not in a form a farmer can use standing in it.

## What the farmer does

1. **Find the field** on a satellite map (town search, "My location", cadastral parcel numbers), or draw it. The Genzano demo field is preloaded.
2. **Answer three questions:** last year's crop (the EU crop map's guess already ticked, or "nothing, left fallow"); limits (no irrigation, cereal machinery only, no buyer nearby, broomrape before); and what matters most, in order (income, water, soil, forage).
3. **Get one plan:** the crop to sow next, the three harvests, the reasons, and how sure the app is. "Why this plan?" shows what the satellite and weather data found, the best rotation in a usual, a dry and the driest year, the money over three harvests, benefits, unknowns and what to check locally. "Where to intercrop" splits the field between two strip crops over a recent Sentinel-2 picture.

Then three tabs: **My field** (what to check before sowing, this month, this season's rain and the 7-day forecast, a timelapse of the field from space), **Advice**, and **My plans** (every plan kept on the phone). The plan can be printed or shared by link or WhatsApp to take to an adviser, cooperative or CAA office. English and Italian; a bigger-text view; voice commands.

The app gives advice with its reasons and how sure it is, and the farmer decides. It supports a conversation with someone who knows the land; it does not replace one.

## How this answers the challenge

| The challenge asks for | In the app |
|---|---|
| Decision support combining NASA observations, soil, crop traits and farmer priorities | Steps 1 to 3 |
| At least three rotation strategies, including the current one | Nine three-year rotations plus two strip intercrops; durum on durum always among them |
| For each: why suggested, evidence, benefits, information gaps, risks for local review | The Why screen, under those five headings |
| Bare-field periods and seasons of vulnerability | The month-by-month strip and the plan's findings |
| Satellite versus ground measurements, uncertainty | "Your field" or "your area" on every figure, ranges, and a source with date and confidence one tap away |
| Dry-year scenarios | A usual, a dry (1 in 10) and the driest year since 2001, now and by 2050 |
| Support, not replace, local expertise | Share your plan, and "Check locally" on every option |

## Data

NASA data used, from the data team's files (`data/`, made by the notebooks in `ColabNotebooks/`) and live services:

| Dataset | What the app takes from it | Resolution |
|---|---|---|
| MODIS Terra vegetation indices (MOD13Q1 v6.1) | Greenness: green, patchy and bare months, bare months after harvest, peak greenness each season | 250 m |
| MODIS evapotranspiration (MOD16A2GF v6.1) | Water the crops used each season | 500 m |
| GPM IMERG Final (V07) | One of three rain sources (with CHIRPS and ERA5-Land; the app shows their median) | about 11 km |
| NEX-GDDP-CMIP6 | Change by 2041–2060 from 29 climate models: hot days and highs at flowering, rain, frost | about 28 km |
| SMAP L4 soil moisture (SPL4SMGP v8) | Root-zone soil water in spring | 9 km |
| NASADEM, HLS (HLSL30/HLSS30 v2.0) | Height and slope in the data; 30 m greenness to check MODIS | 30 m |
| NASA POWER | Live: weather history for fields outside the basin, and this season's rain | about 50 km |
| NASA GIBS Blue Marble | The zoomed-out map | 500 m |

Other sources: ERA5-Land (temperature), CHIRPS (rain), SoilGrids (soil), the EU Crop Map (last crop), ESA WorldCover, CORINE and HydroSHEDS (farmland and basin), Sentinel-2 and Copernicus DEM GLO-30 (map, timelapse and intercrop map, through Microsoft Planetary Computer), AGEA aerial photos, Agenzia delle Entrate cadastral parcels, MET Norway forecasts, Photon/OpenStreetMap town search, a published trial at the demo field (Denora et al. 2025), and published agronomy and price sources for the crop figures. Every dataset, licence and citation: `DATA_SOURCES.md`. Where the crop and money figures come from and how sure each is: `docs/crops-research.md`, `docs/support-and-prices.md`, `research-compilation/`.

**Honest numbers.** Every figure is badged "your field" (from inside the demo field's outline) or "your area" (the 1 km squares around a drawn field, or a weather grid); coarse data is never shown as a measurement of the field. A missing value shows as "no data", never 0. Every figure has a range, a source and a confidence (good, fair or low); the plan's "How sure" line names the figures nobody has checked. Each rotation's risk rating has no source yet and is marked as a placeholder.

## How the advice is made

Written rules an adviser can read; there is no trained model.

1. **Diagnose.** A decision tree reads three signals for the field's last five seasons against 2001–2020: peak greenness (MODIS), hot days at flowering (ERA5-Land) and crop water use (MODIS). Agreement between them gives a finding and a confidence; it first checks whether the field is bare on purpose after harvest, and whether the whole area shows it (weather, not the field).
2. **Filter.** The farmer's limits remove or flag options; a legume just grown is not repeated. The current rotation is always kept as a baseline.
3. **Rank.** Each option has fixed scores for income, water, soil and forage from its crops' figures; the farmer's own prices and payments (Settings) change the income score. Each priority's scores are rescaled across the remaining options (lowest 0, highest 1), then weighted 4, 3, 2, 1 in the farmer's order. The ranking is re-run for a dry and the driest year.

The NASA data describes the field and is shown as evidence beside the advice; it does not change the order. Every rule, threshold and data caveat is written in plain words in `docs/scoring.md`.

## Use of AI

Space Apps allows AI tools if their use is disclosed and they do not produce the core idea. The idea, the choices and the checking are the team's; most of the code and the notebooks were written with AI tools. A log of what we asked AI to do and how it helped: `docs/ai-log.md`.

**What the team did.** The farmer's question, the flow and a phone app rather than a dashboard. The place: rain-fed durum in southern Italy, chosen after the team's own Earth Engine run (10 November 2026) compared clear-sky satellite coverage in 17 areas, and a demo field at a published durum and vetch trial so satellite figures could be checked against measurements. The data lead ran every notebook in Google Earth Engine, checked the results against the trial's weather station and other datasets, and decided what reaches the app (those checks caught NASA POWER's impossible rain months, which the app leaves out). The team's research compilation is behind the extra durum yield after a legume. The team tried each version, decided what to change and reviewed every change before it went live.

**What AI tools did.**
- **Code and research:** Claude (Anthropic) wrote most of the app and the data notebooks and their checks; OpenAI Codex (Sol) and Google Gemini (Argon, Hydrogen) reviewed it; AI research agents gathered crop and price figures from sources the team chose; jobs were coordinated with a multi-agent tool called fleet. The data values come from the cited datasets, not from AI, apart from a few values from the trial at the demo field, typed in from Denora et al. (2025) and labelled as such.
- **Wording:** Gemini (Hydrogen) wrote the on-screen wording in English and Italian, which Claude checked and applied. No native Italian speaker has read it yet.
- **Pictures:** the nine crop pictures (`public/crops/`) were drawn with ChatGPT image generation; each carries a visible "AI" badge.
- **In the app:** no AI model. Options come from written rules. Voice commands and read-aloud use the phone's own speech services, and spoken words become commands through a written list of phrases (`src/voice/commands.ts`). A short version of this statement, with the credit lines the data licences ask for, is on the app's "Data and credits" page and the printout.

## Credits and licence

The code is under the MIT licence (`LICENSE`). Everything else keeps its own licence (`DATA_SOURCES.md`): the files in `data/` are built from the datasets listed there; the map tiles in `public/tiles/s2/` contain modified Copernicus Sentinel data 2026; the parcels in `public/parcels/` are from the Agenzia delle Entrate (CC BY 4.0); aerial photos (AGEA, CC BY 4.0), forecasts (MET Norway) and other map layers are loaded live from their owners. The intercrop map's heights are "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved". We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

## Running it

Needs Node 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Before pushing, run `npm run typecheck`, `npm test` and `npm run build`. The build writes a static site to `dist/` that works from any folder; GitHub Pages publishes `main` through `.github/workflows/pages.yml`.

**How it is built.** React, TypeScript and Vite; MapLibre for the map; Tailwind for the two looks; two typed dictionaries for the languages. No server and no accounts: the field, answers and the farmer's own figures travel in the link, so a shared link reopens the same plan. The one exception is `src/components/KeepFiguresOnBack.tsx`, which holds the newest figures in memory for the visit so that going back never loses a price changed in Settings. The bundle a field's screens read is typed in `src/data/types.ts` and checked when it loads.

**Updating the data.** Never edit files in `data/` by hand. Rerun the notebook concerned in Colab, then notebook 06; it downloads `field_shift_for_repo.zip`, whose `data/` files replace the old ones and whose `DATA_SOURCES.md` goes at the top of the repo. Then `node scripts/make-placeholder-bundle.mjs` rebuilds the demo field's bundle (`public/data/genzano-demo.json`). `scripts/build-basemap.py` rebuilds the basin's map picture and `scripts/fetch-parcels.mjs` the cadastral parcels.
