# How the draft rules work

These are placeholders for the agronomy team to correct, not validated advice.
The demo figures, crop choices, scores and links from findings to rotations are
also placeholders. A good confidence word describes agreement between signals;
it does not make a placeholder figure a measured fact.

A field drawn on Bradano basin farmland uses these same rules (`src/data/field-rules.js`), applied to the 1 km squares under its outline instead of the demo field's own data.

## Read the signals — measured; the thresholds are our judgement

Three signals are measured for every field from the data team's season series
(`measuredSignals` and `SIGNAL_RULES` in `src/data/field-rules.js`), the same
way for the demo field and for a drawn field:

- **Greenness:** peak greenness each season (NASA MODIS, 250 m).
- **Temperature:** hot days at flowering each season (30 °C or more, 15 April to
  15 June; ERA5-Land air temperature). There is no surface temperature data in
  the app (ECOSTRESS was not used), so the step says "hot days at flowering".
- **Water use:** water the crops used, November to June, each season (NASA MODIS
  evapotranspiration, 500 m).

Each compares the median of the field's last five seasons (after 2020; usually
2022 to 2026) with the normal seasons 2001 to 2020. Below their 25th percentile
is "falling", above their 75th percentile is "rising", anything between is
"normal". With fewer than 15 normal seasons or 3 recent ones the signal is "no
data", and the step says there is no record to compare. The five seasons and the
25th and 75th percentiles are our judgement, not tested agronomy.

For the demo field (data of 14 November 2026): greenness is falling (median 0.68
against a 25th percentile of 0.69), hot days at flowering are rising (9 against a
75th percentile of 6.25) and water use is normal (322 mm, between 305 and 334 mm).
The table gives "decline with heat", with fair confidence.

Before reading the table, two checks are made when preparing findings:

1. Is the field bare on purpose? Low greenness after harvest is expected.
   Report a bare-soil period rather than treating it as crop decline.
2. Is the whole area affected? Heat and autumn rain come from area grids, so
   those findings are marked weather-driven.

If any signal is missing, report “not enough data”, with low confidence.
Only falling greenness, rising temperature and falling water use count as
signals here. All other directions count as normal.

| Greenness | Temperature | Water use | Interpretation | Confidence |
|---|---|---|---|---|
| Falling | Rising | Falling | Water and heat stress; the crop is declining | Good |
| Falling | Rising | Normal | Decline with heat; heat damage, disease or a thin stand | Fair |
| Falling | Normal | Falling | Less canopy and water use; poor establishment or nutrient shortage | Fair |
| Falling | Normal | Normal | Unexplained canopy loss; check nutrients, weeds, disease or harvest | Low |
| Normal | Rising | Falling | Early water stress before canopy decline | Fair |
| Normal | Rising | Normal | Hotter seasons but the crop stays green; early stress or an unrelated cause | Low |
| Normal | Normal | Falling | One weak signal; timing or the sensor may explain it | Low |
| Normal | Normal | Normal | No decline detected | Good |

## Match findings to rotations — placeholder agronomy

Repeated water stress can favour crops that finish earlier or use less water.
A long bare-soil period can favour a crop or cover that shortens that period.
Decline under continuous durum can suggest a legume break. The field bundle
states which options address each finding; the team must review those links.

## Apply the farmer's limits — placeholder rules

- No irrigation removes options listed as needing irrigation.
- Cereal machinery only removes options listed as needing other equipment.
- No nearby buyer flags crops listed as needing a local outlet.
- Previous broomrape flags susceptible legumes listed in the bundle.

Each option states which limits remove it and which add warnings. A selected
removal rule takes the alternative out regardless of its scores. The current
rotation always stays for comparison; any removal reason becomes a warning.
Warnings and removal reasons follow the order above, once each. If all
alternatives disappear, the current rotation still appears first.

## Put the remaining options in order — placeholder scores

For each weather scenario, the bundle supplies a score between zero and one
for income, water, soil and forage. Higher means a better fit to that priority.
The farmer puts the priorities in order by tapping them, most important first:
at least two, up to all four. Each place has a weight: first 4, second 3,
third 2, fourth 1. An option's score is the weighted average of its scores for
the ranked priorities. A priority the farmer leaves out has no weight. If none
are ranked (an old or hand-made link), average all four equally. A higher
score comes first. If two options tie, compare their plain average for the
priorities left out. If they still tie, keep the order in the supplied bundle.
Number the survivors from one; only first is best fit.

The weights 4, 3, 2, 1 are our own judgement (`RANK_WEIGHTS` in
`src/ranking/rank.ts`): the simplest rule in which each place counts less than
the one before. Nobody has tested them against farmers' real choices.

A usual, a dry and the driest year use separate supplied scores. Every screen
ranks for a usual year; only the Year screen also shows the best fit in the
other two.
Scores only set the order and are never shown. The farmer sees the signals,
diagnosis, weather-driven note, limits and chosen priorities instead.
Income is average annual gross margin across the three harvests, not revenue;
the supporting facts should give the prices used and their date.

## Usual, dry and driest years

The Year screen shows three kinds of year at once, each with its October to May
rain, its hot days at flowering and the rotation that fits it best. The farmer
does not choose one. Until 15 November 2026 this was a slider with three stops;
it was removed because it read as if the farmer were deciding how dry the year
is, when every figure comes from the record. In code and in the bundle the
three are still called `normal`, `drier` and `much-drier`.

Each is defined from the data, the same way for hot days and for rain
(`hotDayStops` and `rainStops` in `src/data/field-rules.js`).

| Kind of year | Today | By 2041–2060 |
|---|---|---|
| Usual (`normal`) | A typical season, 2001–2020: the median, with the 10th to 90th percentile | Today's typical value plus the middle path's change (SSP2-4.5), median of 29 models |
| Dry (`drier`) | A 1-in-10 dry and hot season: the 10th percentile of October–May rain and the 90th percentile of hot days at flowering | That season plus the high path's change (SSP5-8.5) |
| Driest (`much-drier`) | The driest and the hottest seasons since 2001 (not always the same season) | Those seasons plus the high path's change |

At the demo field: usual 542 mm and 4 hot days; dry 418 mm and 8 hot days;
driest 390 mm (the 2017 season) and 13 hot days. By 2050 on the high path:
393 mm and 10 hot days; 367 mm and 15 hot days. The change is the models' median from the
data file (`future.change`): added in days for hot days, and applied as a percentage for rain
(−6% on the high path at the demo field, so 418 mm becomes 393).

Two parts are still our judgement and are left fixed on purpose:

- **The extra risk icons** (`risksByScenario`): a dry year adds a dry-autumn icon
  in October and November and a heat icon in April to June; the driest also adds
  a dry icon in September and December. They are still in the bundle but no
  longer shown: the month strip is a usual year.
- **The dry-year penalty** (`DRY` in `scripts/make-placeholder-bundle.mjs`): in a
  dry year each option's income score is multiplied by the mean, over its three
  crops, of 0.95, 0.85 or 0.7 for crops that need little, some or a lot of water;
  in the driest year 0.85, 0.65 or 0.45. This is a fixed table by crop, not water data for
  the field. The other scores stay the same.

## 2024 and 2026 against a usual season

A card on the Year screen (`src/components/SeasonCompare.tsx`) puts two recent
seasons beside the usual one, from the data team's season series: 2024, the
drought season, and 2026, a wet one. Each season is named by its harvest year.

| Row | Usual | Each season |
|---|---|---|
| October–May rain | The slider's normal stop: median of 2001–2020 | `rain_season` |
| Soil water in spring (NASA SMAP, top metre, March–April) | Median of 2016–2025, the seasons with SMAP data | `sm_spring` |
| Peak greenness (NASA MODIS) | Median of 2001–2020 | `peak_ndvi` |
| Water crops used, November–June (NASA MODIS) | Median of 2001–2020 | `aet_season` |

An arrow marks a season outside the usual range, the 10th to 90th percentile,
so lower or higher than 9 usual seasons in 10. A value inside the range gets no
arrow, however far from the median. A season with no value shows "no data".

At the demo field 2024 had 413 mm of rain (usual 542), 27.3% soil water (usual
30.1), 0.60 peak greenness (usual 0.71, inside the range) and 258 mm of water
used (usual 319). 2026 had 651 mm, 32.8%, 0.72 and 326 mm. 2026 rain is the
median of CHIRPS and ERA5-Land only, because NASA GPM IMERG in Earth Engine ends
in September 2025 (`HANDOVER.md`, caveat 4); the card says so.

The same card names the seasons the **demo field** was much less green than
nearby rain-fed fields (`stressSeasons` in `src/data/field-rules.js`). The data
team's `peak_vs_nearby_z` measures how far the field's peak greenness, minus
nearby fields', departs from its usual gap. **Our judgement:** a season at
or below −1.5 is flagged (`STRESS_RULES`). That flags 2018 (−2.59) and 2023
(−1.69), the two seasons the data team picked out; the next lowest are 2012
(−1.38) and 2002 (−1.31), so the line between them is a close call. A
satellite sees the stress, not its cause, so the line ends in "check locally":
disease, a thin stand, late sowing or a different crop that year. A drawn field
has no such comparison and gets no flag.

The Why screen's evidence also gained two lines for every option: soil water in
spring (SMAP) and the water crops used (MODIS), each with its usual range.

## How the income figure is worked out

For each harvest, income per hectare is yield × crop price − direct costs +
the support payments switched on for that crop and rotation. Average the three
harvests and round to a whole euro. Losses stay negative. These starting yields,
prices, costs and payments are placeholders, not a promise of eligibility.

The farmer can change crop prices and payment amounts, or switch each payment
on or off. Changes travel in the shared link. Income using changed figures is
marked “Yours”, with no old range or dataset attribution; it remains a placeholder
if any yield or cost it uses is still a placeholder.

Starting figures leave ranking scores unchanged. A change multiplies each
scenario's income score by the new annual income divided by the starting annual
income. That multiplier is limited to zero through two, and the score to zero
through one. If starting income is zero or negative, leave the score alone.
Other priority scores stay unchanged. Income affects ranking with the weight
of its place in the farmer's order (or equally with the rest when no order is
given), and can break ties when it is left out.

## Count area weather — placeholder thresholds and windows

NASA POWER supplies daily temperatures and rainfall for 2001 through 2025.
The request uses the field centre rounded to two decimal places. Its figures
describe the area, at about 50 km resolution, rather than the field itself.

- Hot days: maximum temperature 30 °C or more, 15 April–15 June inclusive (the same
  rule as the team's field.json for the demo field).
- Autumn rain: sum of daily rainfall, 1 September–30 November inclusive.
- Late frost: minimum temperature strictly below 0 °C, 1 March–30 April inclusive.

Absent days and NASA's missing value, -999, are skipped. Missing rain is not
zero rain, and missing temperature is not frost. For each measure separately,
keep a year only when at least 90% of that window's calendar days are present.
Do not fill gaps or scale up totals. At least three usable years are required
for every measure; otherwise the weather summary is unavailable.

NASA POWER's rain for October 2025, February 2026 and March 2026 is left out too
(`POWER_BAD_RAIN_MONTHS` in `src/weather/weather.ts`). The data team's notebook 03
found it more than three times what CHIRPS, NASA GPM IMERG and ERA5-Land measured
at the demo field (592 mm for autumn 2025, five times the usual). It was checked
there only, but is left out everywhere: a year the app does not count is safer
than one counted from an impossible figure. Without October, 2025 has under 90%
of its autumn days, so it is not counted for autumn rain. A line under the
figures names the months left out.

Show the mean of the latest ten usable years, or all usable years if fewer
than ten remain. Round hot and frost means to one decimal and rain to whole
millimetres. The range is the smallest and largest annual total in those same
years. A missing recent year is replaced by an earlier usable year. The
history label remains 2001–2025; each measure may use different valid years.

These live facts carry fair confidence, an “as of 2025” date and no placeholder
flag because the measurements are live. Their interpretation thresholds remain
placeholders for the team to correct. Future projections stay in the demo bundle.

## This season so far

Shown on the Year screen and on Area weather, for the field's centre, live from NASA POWER (daily rain, about 50 km). The code is `src/weather/season.ts`; the thresholds are our own judgement, for the team to correct.

- **The season** starts on 1 September. Rain is added up from that day to the latest day NASA POWER has, which is usually two to four days ago. The block shows both dates.
- **Usual by now** is the middle value of the same days in the ten seasons before. Its range is the 10th to 90th percentile of those seasons, as in the data team's files, so one freak season does not stretch it.
- **A season is left out** of the comparison when more than one day in ten is missing. With fewer than three seasons left, no comparison is shown.
- **NASA POWER's impossible months** (October 2025, February 2026 and March 2026; see area weather above) count as missing days. From October on, that leaves the 2025–26 season out of the comparison, and a line names the month.
- **The verdict:** under three quarters of the usual rain is "Drier than usual", over one and a quarter is "Wetter than usual", otherwise "About usual".
- **Last proper rain** is the latest day with 5 mm or more.
- If NASA POWER does not answer within 8 seconds, the block says the rain is unavailable and offers to try again. The rest of the screen is unaffected.
- This is a record of what has fallen, not a forecast.

## The next seven days

Shown under "This season so far", for the field's centre, from MET Norway's open forecast (Locationforecast 2.0). The code is `src/weather/forecast.ts`; the thresholds are our own judgement.

- **Seven days:** what is left of today and the six days after, by the phone's own calendar.
- **Rain** is added up from the forecast's six-hour blocks, taking blocks that do not overlap. Each day's cell shows its total in mm; 5 mm or more is in bold.
- **"Little or no rain"** is shown when the seven days total under 1 mm.
- **Coldest night** is the lowest forecast air temperature. At 1 °C or below the block adds "Frost possible", because the forecast is for air at 2 m and the ground is colder.
- A forecast is a best guess, most of all for rain a week ahead, so its figures carry low confidence and the block says to check again before sowing.
- If MET Norway does not answer within 8 seconds, the block says the forecast is unavailable and offers to try again.
- The link under it opens MET Norway's public forecast page (yr.no) for the same place. A web page cannot read the phone's own weather app.

## Strip intercrops

A strip intercrop is two sequences grown side by side, each on half the field, swapped every year: for example chickpea, durum, chickpea beside durum, chickpea, durum. In the bundle the second sequence is the option's `strips`.

- **Income** is the average of the two sequences, year by year: sales, costs and each payment. A payment only one crop gets (coupled durum support) counts for half the field. The extra durum grain after a legume is counted on the durum strips, by the rule in the next section.
- **Nitrogen left** is the average of what the two first crops leave (durum leaves none), per hectare of the whole field.
- **Water need** shown is the thirstier of the two first crops. The water score is the average over all six crop-years.
- **Soil score** uses the nitrogen summed along each strip and then averaged. **Forage score** follows the usual rule over both sequences.
- **Risk, limits and flags** follow the usual rules, applied to both first crops.
- **Just grown:** if either strip would start with the legume the farmer has just harvested, the option is left out, because half the field would repeat it.
- **No gain or loss from growing the crops side by side is counted.** That is our choice: it needs no new figure, and it matches the one Italian result the research found (a land equivalent ratio near 1.0 on sloping farms). The app says so on the Why screen.
- **Strip intercrops are ranked only when the farmer switches them on** (the switch under the list on the Options screen; `i=1` in the link). Few farms in Italy grow strips, so they must not become the first advice unasked. That is our judgement.
- **Eco-scheme 4 on strips** is an optional payment, off by default, because nobody on the team has confirmed with a CAA office that strips declared as separate parcels qualify.

- **Intercropping in some years only.** A year in which both sequences have the same crop is an ordinary year with one crop on the whole field. So a rotation can be, for example, strips in years 1 and 3 and durum alone in year 2. The model, the screens and the tests handle this; no such rotation is shipped, for the reason below.

**Is combining rotation and intercropping better?** Worked out with the app's own sums on 15 November 2026 (chickpea and durum, demo field figures):

| Pattern | Income €/ha a year | Note |
|---|---|---|
| Chickpea, durum, durum (no strips) | 729 | Includes Eco-scheme 4 |
| Strips every year, swapped | 692 | No durum after durum anywhere |
| Strips in years 1 and 3, durum alone in year 2 | 651 | Half the field has durum after durum in year 2 |
| Strips in year 2 only | 604 | |
| Strips in years 1 and 3, faba bean alone in year 2 | 553 | Best soil score of all, but a legume follows a legume on every strip |

With strips, intercropping every year beats intercropping in some years, because every skipped year puts durum after durum on part of the field. This cannot show whether a true mixture in some years would be better: the stand-in counts no gain from mixing, so by construction it can never beat the best plain rotation of the same crops. Answering that needs a mixture with measured figures (the Genzano trial).

Background and sources: `docs/crops-research.md`, "Intercropping".

## More durum after a legume

- Durum gives more grain when it follows a legume, which leaves nitrogen and breaks the cereal's diseases. The bundle carries this per crop as `durumAfter`, in percent, and `yieldLift` in `src/money/money.ts` applies it.
- **Chickpea:** 16% more for the durum harvest straight after, 10% more for a second durum in a row (Lago-Olveira et al. 2023, a wheat and chickpea rotation in Puglia).
- **Faba bean:** 12% more for the durum harvest straight after (Garofalo et al. 2009, a 53-year simulation for the Foggia area).
- Only durum gets a lift, and only inside the three harvests shown: nothing is counted for the crop grown before the rotation starts.
- The lift raises that harvest's sales. It shows on Why as a line under the durum harvest and names its study.
- **How sure:** low. The figures come from the team's research compilation, which cites the papers; we have not opened the papers ourselves. The chickpea study worked with wheat at 5 t/ha, well above this area's 3 t/ha, so its percentage may not carry over.
- **Lentil, pea and vetch get no lift** because no figure was found for them. That is a gap in the evidence, not a finding that they give nothing, and it tilts the comparison towards chickpea and faba bean.

## Your soil

The Options screen names the field's ground from the soil figures in the bundle (SoilGrids 2.0, 250 m; for a drawn field, the 1 km squares). Nothing here changes the order of the rotations.

- **Texture class:** the USDA triangle on sand, silt and clay (`textureClass` in `src/data/soil.ts`). Clay is the listed figure, or what sand and silt leave.
- **Heavy, medium or light** is our own grouping of the twelve classes: heavy for every class with "clay" in its name, medium for loam, silt loam and silt, light for sandy loam, loamy sand and sand.
- **pH band:** acid under 6.5, alkaline over 7.3, neutral between (`PH_BANDS`). On the demo field the band follows the pH the trial measured (8.2), shown beside the map's 7.7.
- **Honesty:** the map's own range is wide (clay 5.6 to 76.4% on the demo field), so the card calls itself an estimate and sends the farmer to a soil test. The one-line meanings ("drains slowly", "crops take up iron and phosphorus less easily") are textbook statements, not findings for this field.

## Your field today

What a returning farmer is told (`planChange` in `src/state/plan.ts`), comparing what the phone kept with what the app works out now for the same field and answers:

| Kept on the phone | Now | Message |
|---|---|---|
| Nothing, or another field or other answers | | The plan is now kept |
| Same best fit, same data fingerprint | | Nothing has changed |
| Same best fit, other fingerprint | | The data was updated; the best fit holds |
| Another best fit | | Warning: the advice has changed, with both rotations named |

The fingerprint is the one `vite.config.ts` makes from the shipped data. A change stays on screen until the farmer taps "Got it". The live rain and forecast do not enter the ranking, so they can never change the advice. "What to watch" is the bundle's usual cover and risks for the calendar month; the to-do list is the best fit's own checks.

## Field timelapse

"Your field from space", linked from the Year screen (`#/timelapse`). `src/timelapse/frames.ts` holds the rules; each is
**our judgement** (`TIMELAPSE_RULES`).

- **Pictures:** Sentinel-2 L2A at 10 m, from Microsoft Planetary Computer, loaded live for the farmer's own outline,
  demo field or drawn. Only scenes whose footprint covers the middle of the field are searched.
- **Which scenes:** from 1 January three years back until today, leaving out any scene with more than 25% cloud over
  its whole 100 km tile. Each month keeps up to three scenes, least cloudy first, then nearest mid-month.
- **Clear at the field:** a scene can have little cloud overall and still a cloud over the field (16 May 2024 was
  one). So each candidate's scene class (Sentinel-2's own SCL layer) is read at the middle of the field, and the
  first that sees the ground (vegetation, bare soil, water, dark features, unclassified, snow) is shown. Cloud,
  cirrus, cloud shadow, no data and defective pixels are not. A month with no clear candidate is left out. If the
  check cannot be made at all, each month shows its least cloudy scene. A picture whose tiles fail to load is skipped.
- **How close:** the picture is the square around the field with a margin of 8% of the field's longer side on each
  side, so the outline fills it. Map tiles come from the closest zoom (at most 18) at which that square is no more
  than one tile wide, so a frame needs at most 2 × 2 tiles; the screen stretches the square to the picture.
- **Date and time:** each picture's acquisition time in Italian time.
- **Credit:** "Contains modified Copernicus Sentinel data" with the years the pictures span, as the Sentinel Data
  Legal Notice asks.

## The printout's graphs

The printout ends, before the credits, with one graph for each of peak greenness, hot flowering days, water used
by crops and October–May rain, season by season since 2001 (`src/components/TrendChart.tsx`). Each draws the
same comparison as the Why steps' signals (`seasonBand` beside `seasonSignal` in `src/data/field-rules.js`): the
grey band is the 25th to 75th percentile of 2001–2020, and the dark dots and line are the last five seasons after
2020 and their median. A season with no data has no dot. Rain has no signal; its graph shows what lies behind the
Year screen's usual, dry and driest years.

