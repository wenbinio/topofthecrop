# How the draft rules work

These are placeholders for the agronomy team to correct, not validated advice.
The demo figures, crop choices, scores and links from findings to rotations are
also placeholders. A good confidence word describes agreement between signals;
it does not make a placeholder figure a measured fact.

A field drawn on Bradano basin farmland uses these same rules (`src/data/field-rules.js`), applied to the 1 km squares under its outline instead of the demo field's own data.

## Read the signals — placeholder interpretation

Compare greenness, surface temperature and water use with the same weeks in
earlier years. Before reading the table, make two checks when preparing findings:

1. Is the field bare on purpose? Low greenness after harvest is expected.
   Report a bare-soil period rather than treating it as crop decline.
2. Is the whole area affected? Area rainfall and temperature can reveal drought
   or a heat wave. Mark that finding as weather-driven.

The supplied findings carry the result of these checks. The signal table alone
cannot infer harvest timing or area-wide weather from three directions.
If any signal is missing, report “not enough data”, with low confidence.
Only falling greenness, rising temperature and falling water use count as
signals here. All other available directions count as normal in this draft.

| Greenness | Temperature | Water use | Interpretation | Confidence |
|---|---|---|---|---|
| Falling | Rising | Falling | Water and heat stress; the crop is declining | Good |
| Falling | Rising | Normal | Decline with heat; heat damage, disease or a thin stand | Fair |
| Falling | Normal | Falling | Less canopy and water use; poor establishment or nutrient shortage | Fair |
| Falling | Normal | Normal | Unexplained canopy loss; check nutrients, weeds, disease or harvest | Low |
| Normal | Rising | Falling | Early water stress before canopy decline | Fair |
| Normal | Rising | Normal | Warm but healthy crop; early stress or an unrelated cause | Low |
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

The normal, drier and much-drier settings use separate supplied scores.
Scores only set the order and are never shown. The farmer sees the signals,
diagnosis, weather-driven note, limits and chosen priorities instead.
Income is average annual gross margin across the three harvests, not revenue;
the supporting facts should give the prices used and their date.

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

## More durum after a legume

- Durum gives more grain when it follows a legume, which leaves nitrogen and breaks the cereal's diseases. The bundle carries this per crop as `durumAfter`, in percent, and `yieldLift` in `src/money/money.ts` applies it.
- **Chickpea:** 16% more for the durum harvest straight after, 10% more for a second durum in a row (Lago-Olveira et al. 2023, a wheat and chickpea rotation in Puglia).
- **Faba bean:** 12% more for the durum harvest straight after (Garofalo et al. 2009, a 53-year simulation for the Foggia area).
- Only durum gets a lift, and only inside the three harvests shown: nothing is counted for the crop grown before the rotation starts.
- The lift raises that harvest's sales. It shows on Why as a line under the durum harvest and names its study.
- **How sure:** low. The figures come from the team's research compilation, which cites the papers; we have not opened the papers ourselves. The chickpea study worked with wheat at 5 t/ha, well above this area's 3 t/ha, so its percentage may not carry over.
- **Lentil, pea and vetch get no lift** because no figure was found for them. That is a gap in the evidence, not a finding that they give nothing, and it tilts the comparison towards chickpea and faba bean.
