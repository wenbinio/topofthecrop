# Field Shift: data handover for the app

Sat 14 Nov 2026, 18:30 UK. From Edison (data lane) to the frontend. Written with AI assistance (Claude, Anthropic) and checked against the final data files.

Put this file at the top of the repo. If you use Claude, ask it to read this file before it touches the app's data code. With Claude Code, add the line `Read HANDOVER.md before working on data or the screens.` to the repo's `CLAUDE.md`.

## 0. Briefing for an AI assistant

- **Project.** Field Shift (NASA Space Apps Challenge 2026) helps family durum-wheat farmers in the Bradano basin (Basilicata, southern Italy) compare crop rotations under a changing climate. It's a static web app on GitHub Pages: no backend, no login, Italian first with an English switch, built for tablets. The five screens, in build order: rotation comparison, the field's year, find your field, evidence and method, printout for an adviser.
- **The data is finished.** Everything the app needs is in `data/`, made by the Colab notebooks in `notebooks/` and checked. **Never edit files in `data/` by hand.** If a value looks wrong, ask Edison to rerun the notebook that made it.
- **Use `fieldshift-data.js`** (tested against these files) to load the data and read values for a tap or a drawn outline. Sections 3–5 explain what it returns.
- **Ground rules for the screens:**
  - Show every number as a range (low, typical, high) with its source.
  - Show `null` as "no data", never 0.
  - Label traced-field values "for the 1 km area around your field".
  - Show the caveats in section 7 where they apply.
  - Say on every result that the tool supports, and doesn't replace, the judgement of the farmer and their adviser.
- **Rules from the competition and the data licences:**
  - Acknowledge AI use in text and in metadata.
  - Don't use NASA logos or branding; naming NASA datasets in citations is fine.
  - Credit the data sources (section 10).
  - Never add Basilicata weather-station records to the repo: their terms are non-commercial and checking-only.
- **Next tasks, in order:**
  1. Wire `loadData` and `outlineValues` into "Find your field".
  2. Build the farming-year strip and risk bands.
  3. Build the rotation scorer with `crops.json`.
  4. Build the evidence panel.
  5. Build the printout and share link.

## 1. What's in the repo

```
DATA_SOURCES.md      every dataset: what it's used for, resolution, licence, citation; ground check; AI note
data/                the app's data (9 files, 4.6 MB)
notebooks/           the six Colab notebooks that make the data (01 to 06)
```

| File in `data/` | Size | Made by | What it holds |
|---|---|---|---|
| `grid.geojson` | 1.2 MB | 01 | 3,079 squares of 1 km over the basin (2,526 farmland), with land-cover shares, durum share, height and slope |
| `area.geojson` | 10 kB | 01 | The Bradano basin outline (3,075 km²) |
| `field.json` | 0.17 MB | 01, merged by 06 | The demo field near Genzano di Lucania, in detail |
| `cells_greenness.json` | 1.7 MB | 02 | Greenness calendar and season dates per farmland square |
| `cells_weather.json` | 0.34 MB | 03 | Rain, temperature, heat and frost per square |
| `cells_water.json` | 0.62 MB | 04 | Water need (ET₀), durum water need, soil moisture, crop water use per square |
| `cells_future.json` | 0.06 MB | 05 | Change by 2041–2060 under two scenarios, per square |
| `cells_soil.json` | 0.56 MB | 05 | Topsoil properties and water-holding capacity per square |
| `index.json` | 2 kB | 06 | List of the files, which notebook run made each one, conventions and the AI note |

Notebooks: `01_area_grid` (basin and grid), `02_greenness`, `03_weather`, `04_water`, `05_future_soil`, `06_check_and_sources` (merges `field.json`, checks every file, writes `index.json` and `DATA_SOURCES.md`). Run order: 01 first, then 02–05, then 06.

All files come from the final runs on 14 Nov (02 at 15:59, 03 at 16:04, 04 at 16:11, 05 at 16:17, checked by 06 at 16:51, UTC). Every value was checked by script: no NaN, every range in order, and `null` only where listed in section 7.

## 2. Getting the data into the app

- **Fetch with relative paths:** `fetch("data/cells_weather.json")`. GitHub Pages serves the site under `/repo-name/`, so a path starting with `/` breaks. If the app's page sits in a subfolder, use `"../data/"`.
- **Use a web server, also when developing.** Browsers won't load JSON from a page opened by double-clicking (`file://`). Use VS Code's Live Server, `npx serve`, or `python -m http.server` in the repo folder. Turn on GitHub Pages under the repo's Settings → Pages (deploy from the main branch, root folder).
- **Load everything once at start.** It's 4.6 MB, and the biggest files are greenness (1.7 MB) and the grid (1.2 MB). The service worker can cache `data/` for offline use.
- **`fieldshift-data.js`** does the loading and lookups. Put it with the app's code, and install turf.js 7 (`npm install @turf/turf`). In a plain HTML page without a bundler, add an import map instead:

```html
<script type="importmap">{"imports": {"@turf/turf": "https://esm.sh/@turf/turf@7"}}</script>
<script type="module">
  import { loadData, squareAt, outlineValues, projected, farmingYear, dayToDate, howOften, sourcesFor }
    from "./fieldshift-data.js";
  const d = await loadData("data/");
  const v = outlineValues(d, drawnPolygon);          // drawnPolygon: GeoJSON Polygon in lon/lat
  if (!v) showMessage("This field is outside the farmland we cover");
  else {
    const hot = v.weather.hot_days_flower;           // [low, typical, high], e.g. [0, 4, 8]
    const hotLater = projected(v, "ssp245").hot_days_flower;   // e.g. [4.2, 5.4, 6.9]
  }
</script>
```

| Function | Returns |
|---|---|
| `loadData(base)` | All files, plus `farmSquares` and `seasons` (2001–2026) |
| `squareAt(d, lon, lat)` | The farmland square at a tap or GPS point, or `null` |
| `squareValues(d, id)` | `{greenness, weather, water, futureChange, soil}` for one square (a part is `null` if missing) |
| `outlineValues(d, polygon)` | The same, averaged over the squares the outline overlaps by overlap area, plus `squares`, `fieldHa` and `farmlandShare`. `null` if no farmland is covered |
| `projected(values, "ssp245" or "ssp585")` | Values by 2041–2060 for the six future indicators, worked out exactly as notebook 05 does |
| `farmingYear(monthly)` | A January–December list reordered September–August |
| `dayToDate(day, season)` | A day number turned into a date |
| `howOften(bySeason, test)` | `{count, of}` for "in X of the last N seasons" |
| `sourcesFor(d, file, key)` | The datasets behind a value (name, resolution, licence, citation) |

## 3. Conventions (read before using any value)

- **Ranges.** Every indicator is `[low, typical, high]` = 10th percentile, median, 90th percentile.
  - Today's values cover the seasons 2001–2020.
  - SMAP soil moisture covers 2016–2025.
  - For the future, the range is across the 29 climate models.
  - For soil, it's the range within the square.
- **Monthly lists** hold 12 ranges, January to December.
- **Seasons** are named by harvest year: season 2024 runs from September 2023 to August 2024. Each `*_by_season` list has 26 entries, lined up with `meta.seasons` (2001–2026).
- **Day numbers** count from 1 September (1 September = day 0). Day 226 in season 2024 is 14 April 2024.
- **`null` means no data.** Only farmland squares (`farm: true` in the grid) appear in the `cells_*` files.
- **Ids** are EEA 1 km grid codes like `1kmE4836N1990` (EPSG:3035). The geometry in both GeoJSON files is in longitude/latitude, ready for Leaflet or MapLibre.
- **Each file's `meta`** holds:
  - `sources`: name, Earth Engine id, resolution in metres, licence and citation.
  - `indicators`: a plain description of each key, used on the evidence screen.
  - `made_by`, `ai_assistance` and `checked`.

## 4. The files in detail

**`grid.geojson`.** Feature `id` = square id. Properties:
- `lon` and `lat`: the centre.
- `basin`: the share of the square inside the basin.
- `crop`: cropland share (WorldCover).
- `arable`: non-irrigated arable share (CORINE).
- `rainfed`: share that is both.
- `arable22`: any arable crop, from the 2022 EU crop map.
- `durum18` and `durum22`: durum share in 2018 and 2022.
- `elev_m` and `slope_deg`: height and slope (NASADEM).
- `farm`: true if the rain-fed arable share is at least 10%.

**`cells_greenness.json`.** Look up `cells[id]`. It has 2,521 of the 2,526 farmland squares; the other 5 have no usable MODIS pixels. Greenness is NDVI: about 0.2 is bare soil, about 0.8 a thick healthy crop.
- `ndvi_month`: typical greenness in each month.
- `peak_ndvi`: the season's highest greenness (February–June).
- `peak_day`, `greenup_day`, `dryoff_day`: day numbers.
  - Green-up is when greenness rises past halfway from the autumn low to the peak; dry-off is when it falls back below halfway.
  - Treat these dates as about a week either way.
- `season_days`: green-up to dry-off.
- `bare_months`: months below 0.3.
- `peak_by_season` and `dryoff_by_season`: one value per season.
- `meta.thresholds`: green is 0.5 or more, bare is under 0.3.

**`cells_weather.json`.** Look up `records[cells[id]]`. Squares under the same 5–11 km source pixels share a record. Rain is the median of CHIRPS, IMERG and ERA5-Land; temperatures come from ERA5-Land.
- Monthly lists:
  - `rain_month` (mm).
  - `tmax_month` and `tmin_month` (°C).
  - `hot30_month`: days at 30 °C or more.
  - `frost_month`: nights at 0 °C or less.
- Rain over a season or part of it:
  - `rain_autumn`: October–November, at sowing.
  - `rain_season`: October–May.
  - `rain_spring`: March–May.
  - `rain_year`: September–August.
- Season indicators:
  - `rain_onset_day`: the first time it rains 20 mm in 3 days, as a day number.
  - `dry_spell_spring`: the longest run of dry days in March–May.
  - `hot_days_flower`: days at 30 °C or more from 15 April to 15 June, durum's flowering and grain fill.
  - `tmax_flower`: the average daytime high over the same window.
  - `frost_days_winter`: frost nights December–February.
  - `late_frost_days`: frost nights March–April.
- `rain_year_by_source`: each source's typical yearly rain, which shows how far the sources agree.
- By-season lists: `rain_season_by_season`, `rain_autumn_by_season`, `hot_days_flower_by_season`.
- `meta.rain_sources_by_season`: season 2026 uses only CHIRPS and ERA5-Land.

**`cells_water.json`.** The values come from two places:
- `records[cells[id].rec]`, shared by squares under the same pixels:
  - `et0_month` (mm): a crop's water need is ET₀ × its monthly Kc.
  - `et0_season`: November–June.
  - `durum_need`: durum over its 240-day season from 15 November, using the FAO-56 Kc in `meta.durum_kc`.
  - `sm_root_month`: root-zone soil water (0–100 cm), % volume.
  - `sm_sowing` and `sm_sowing_surface`: November, root zone and top 5 cm.
  - `sm_spring`: March–April.
  - By-season lists: `durum_need_by_season`, `sm_sowing_by_season` and `sm_spring_by_season`. The soil-moisture ones are `null` before season 2016.
- `cells[id]` itself:
  - `aet_season`: water actually used by crops November–June (MODIS).
  - `aet_by_season`.
  - Both are `null` for 135 squares.

**`cells_future.json`.** Look up `records[cells[id]]`, which gives `{ssp245: {...}, ssp585: {...}}`. These are **changes**, not values. SSP2-4.5 is the middle emissions path and SSP5-8.5 the high one.

| Future key | Changes this weather key | How |
|---|---|---|
| `hot` | `hot_days_flower` | today + change, at least 0 |
| `tmaxfl` | `tmax_flower` | today + change |
| `frost` | `frost_days_winter` | today + change, at least 0 |
| `late` | `late_frost_days` | today + change, at least 0 |
| `rainse` | `rain_season` | today × (1 + change/100) |
| `rainau` | `rain_autumn` | today × (1 + change/100) |

"Today" is the typical value from `cells_weather.json`. The future period is 2041–2060, compared with 2001–2020; `projected()` does this for you.

**`cells_soil.json`.** Look up `cells[id]`. Topsoil is 0–30 cm.
- `clay`, `sand`, `silt` (%).
- `soc` (organic carbon, g/kg).
- `phh2o` (pH).
- `bdod` (bulk density, g/cm³).
- `cfvo` (stones, % volume).
- `nitrogen` (g/kg).
- `cec` (cmol(c)/kg).
- `awc`: water held in the top metre (mm).

Units are in `meta.units`. SoilGrids is a prediction, so show "check with a soil test".

**`field.json`.** The demo field, 6.5 ha, at 349 m, near Genzano di Lucania. It's the field of a published durum and vetch trial (Denora et al. 2025).
- `field`: the outline (a GeoJSON Polygon) and the trial point.
- `greenness`: typical values and season rows, including `peak_vs_nearby_z` for the disease flags. It also holds every MODIS, HLS (30 m) and Sentinel-2 (10 m, with red-edge NDRE) view, with nearby fields' percentiles for comparison.
- `weather`: typical values, season rows (with the GSMaP and POWER checks) and monthly series. `weather.ground_check` compares satellite rain and ERA5-Land temperature with the trial's own weather station.
- `water`: the same as the cells file. MODIS water use is called `water_use_modis` here.
- `future`: `now`, `change`, `projected` (already worked out) and `by_model`.
- `soil`: `values`, plus `trial_reported`, the soil the trial measured.

Use `field.json` for the demo field and the cells files for any other field.

**`index.json`.** The file list, conventions and the AI note text (`ai_assistance`).

## 5. How the app uses the data, screen by screen

**Find your field**
1. Draw the basin (`area.geojson`) and, optionally, the farmland squares (`grid.geojson` where `farm` is true) over a base map.
2. When the farmer draws an outline, call `outlineValues(d, polygon)`. It finds the farmland squares under it and averages their values by overlap area. When they tap instead, or use their location, call `squareAt` and then `squareValues`.
3. If it returns `null`, the field is outside the basin's farmland: say so. If `farmlandShare` is well under 1, part of the outline isn't farmland; mention it.
4. The demo field button uses `field.json` directly.
5. Crops, limits (irrigation, equipment, buyer) and priorities come from the farmer, not the data.

**Your field's year**
- **Strip:** `farmingYear(greenness.ndvi_month)`, coloured by `meta.thresholds`. Mark green-up, peak and dry-off with `dayToDate(day)`.
- **Risk bands:**
  - Dry autumn at sowing: `rain_autumn` and `rain_onset_day`.
  - Heat at flowering: `hot_days_flower`, or `hot30_month` for other crops' months.
  - Frost: `frost_days_winter`, `late_frost_days` and `frost_month`.
  - Spring dry spell: `dry_spell_spring`.
  - Soil water at sowing and in spring: `sm_sowing` and `sm_spring`.
- **Frequencies** use the by-season lists. For example, `howOften(weather.hot_days_flower_by_season, x => x >= 8)` gives 6 of 26 seasons at the demo field.
- **Headline numbers** show today against 2041–2060 with `projected()`: hot days at flowering, October–May rain, and frost.
- **Water need against rain:** compare a crop's need with rain over the same months, using `rain_month`. `durum_need` covers mid-November to mid-July, while `rain_season` is October–May, so don't compare those two directly.

**Rotation comparison.** The scorer gives each rotation 0–1 on eight criteria, weighted by the farmer's sliders.
- These criteria come from the data:
  - **Water use:** sum `et0_month` × the crop's monthly Kc over its season. Compare that with rain over the same months and the soil's `awc`.
  - **Climate risk:** `hot30_month` in the crop's flowering months, `frost_month` in its frost-sensitive months, a dry autumn at sowing (`rain_autumn`, `rain_onset_day`), and the 2041–2060 versions from `projected()`.
  - **Soil cover:** months with and without a crop, from the crops' calendars. Today's `bare_months` describes the current rotation.
  - **Soil and slope limits:** `clay`, `sand`, `phh2o`, `awc` and `soc`, and `slope_deg` from the grid (no bare fallow on slopes).
- These come from `crops.json` and the trial evidence, not the data files:
  - Nitrogen.
  - Disease and weed break.
  - Organic matter.
  - Forage value.
  - Income.
- CAP rules show as a badge, not a score.

**Evidence and method**
- For any number, show:
  - Its plain description (`meta.indicators[key].what`).
  - Its range.
  - Its datasets (`sourcesFor`).
  - The relevant caveats from section 7.
- For the demo field, also show:
  - The ground check (`field.weather.ground_check`).
  - MODIS against HLS (`field.greenness`).
  - The trial's soil (`field.soil.trial_reported`).
- **Disease and stress flags (demo field):** a season is unusual when `peak_vs_nearby_z` is far below 0. It was −2.59 in 2018 and −1.69 in 2023. Every flag ends in "check locally".
- Link to `DATA_SOURCES.md`, and show the AI note from `index.json`.

**Printout and share link.** Print with print CSS. For the link, store the outline (coordinates rounded to 5 decimals) and the settings in the URL hash, then recompute on load. There's no server.

## 6. The demo field at a glance (use these to check the UI)

| | Today (low / typical / high) | 2041–2060 middle (SSP2-4.5) | 2041–2060 high (SSP5-8.5) |
|---|---|---|---|
| Hot days at flowering | 0 / 4 / 8 | 4.2 / 5.4 / 6.9 | 4.8 / 6.0 / 9.7 |
| Average daytime high at flowering | 21.2 / 22.9 / 24.5 °C | 23.7 / 24.5 / 25.3 °C | 24.1 / 25.1 / 26.3 °C |
| October–May rain | 418 / 542 / 631 mm | 477 / 520 / 558 mm | 455 / 509 / 575 mm |
| Winter frost nights | 17 / 26 / 41 | 19.7 / 22.5 / 25.8 | 18.3 / 21.4 / 24.2 |

| | Normal | 2024 (drought) | 2026 (wet) |
|---|---|---|---|
| October–May rain | 542 mm | 413 mm | 651 mm |
| Root-zone soil water in spring | 30.1% | 27.3% | 32.8% |
| Peak greenness (NDVI) | 0.71 | 0.60 | 0.72 |
| Crop water use, November–June | 319 mm | 258 mm | 326 mm |

The other demo-field values:
- Typical durum water need: 509 mm.
- Green-up around day 173 (21 February), peak around day 226 (mid-April), dry-off around day 269 (late May). In 2024 the peak came about a month early (day 194, mid-March).
- Soil: clay 37%, pH 7.7, nitrogen 1.54 g/kg, water held 87 mm.

## 7. Caveats to show on the evidence screen

1. **Traced fields are 1 km estimates.** Only the demo field has values from inside its own outline.
2. **ERA5-Land runs cool at the demo field.** It reads 1.2–2.5 °C below the trial's station and 1.3–1.7 °C below NASA POWER. Hot days are probably undercounted, now and in the future, and frost nights overcounted.
3. **Rain against the trial's station** differs by 1–31%, depending on which months are counted (the paper doesn't say). Both show the 2024 drought; the station's drop is sharper (−53% against −38%).
4. **Season 2026 rain uses two of the three sources:** IMERG in Earth Engine ends in September 2025.
5. **The demo field's peak greenness is always below nearby fields,** by 0.09 on average. Judge a season by `peak_vs_nearby_z`, not the raw gap.
6. **MODIS dates come from 16-day composites:** about a week either way.
7. **Don't compare MODIS and HLS values directly:** MODIS reads about 0.07 higher at the field.
8. **Soil is a prediction.** The trial measured pH 8.2 and nitrogen 0.9 g/kg; SoilGrids gives 7.7 and 1.54.
9. **Monthly typical values are medians,** so 12 months add up to about 5% less than the typical year.
10. **The 2022 EU crop map** labels 86% of arable land as durum (58% in 2018), so treat `durum22` with care.
11. **Missing values:**
    - Greenness for 5 farmland squares.
    - Green-up for 2 squares and dry-off for 3.
    - MODIS water use for 135 squares.
    - SMAP before 2016.
12. **Durum water need may run low:** ERA5-Land's ET₀ is 84% of TerraClimate's at the field.
13. **Hot-days chart:** bars are typical seasons. Only the 2041–2060 bars get lines (the spread across models); today's year-to-year range goes in a note.

## 8. Not in the data, and still to do

- **Not computed:** extreme rain, the GRACE water trend and ECOSTRESS. Leave them out of the screens, or label them as future work.
- **`crops.json` (frontend team)** needs, per crop:
  - Sowing, flowering and harvest months. Flowering months are still missing.
  - Kc by stage.
  - Heat, frost and water limits.
  - Income range.
  - Nitrogen and forage values.
  - Rotation rules, such as chickpea at most one year in three.

  The scorer depends on it.
- **30 m greenness for any traced field:** a team decision is pending. Today only the demo field has 30 m and 10 m data.
- **No station temperature correction:** the Basilicata records couldn't be downloaded, so caveat 2 stands.
- **Weather indicators have no `source` key** in their `meta`; `sourcesFor` fills it in.

## 9. Updating the data

Only the notebooks change the data:
1. Edison reruns the notebook concerned in Colab, then 06.
2. 06 downloads `field_shift_for_repo.zip`.
3. Its `data/` files replace the old ones, and `DATA_SOURCES.md` goes at the top of the repo.

Keys stay the same, so the app needs no changes. If keys ever change, this file is updated too.

## 10. Credits, licences and AI

- **Data credits.** All datasets are free and openly licensed; each licence and citation is in `DATA_SOURCES.md` and in each file's `meta.sources`. Several licences ask for a credit line: Copernicus (ERA5-Land, Sentinel-2, CORINE), ESA WorldCover, SoilGrids and the EU crop map. Use the exact citations from `DATA_SOURCES.md`, for example on an "About the data" page that links to it.
- **AI.** The notebooks were written with AI assistance (Claude, Anthropic) and run by the team; data values come from the cited datasets. A few published trial values were copied by hand from Denora et al. (2025) and are labelled as such. Show `index.json`'s `ai_assistance` text in the app, and add the same kind of note for AI-written app code and text, in the code and on the page.
- **NASA branding.** No NASA logos or insignia in AI-made content. Naming NASA datasets, as the citations do, is fine.
- **Station data.** The Basilicata station records are not in the repo and must not be added.
