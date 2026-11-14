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
Average the farmer's chosen priorities with equal weight. If none are chosen,
average all four. A higher average comes first. If two options tie, compare
their average for the remaining priorities. If they still tie, keep the order
in the supplied bundle. Number the survivors from one; only first is best fit.

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
Other priority scores stay unchanged. Income affects ranking when chosen (or
when all priorities are used), and can break ties otherwise. Choosing soil and
water keeps the demo order because their combined scores do not tie.

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
