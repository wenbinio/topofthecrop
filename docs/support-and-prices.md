# Support and prices: what the starting figures are based on

Researched on 14 November 2026 for a rain-fed durum farm near Genzano di Lucania (Basilicata). Four researchers worked independently, two per topic: two Claude Opus agents and two Gemini Hydrogen agents. The Opus agents listed the documents they opened; the Hydrogen agents returned search-redirect links, so their figures count as a second opinion, not as a checked source. Nobody on the team has verified these against the original documents yet. **Treat every figure as a starting point for the farmer and adviser to correct**, which is why each one can be edited in the app's Settings.

The figures live in one array in `scripts/make-placeholder-bundle.mjs` and reach the app through `public/data/genzano-demo.json`.

## How the app uses them

For each year of a rotation: yield × price − direct costs + the support that applies. The figure on each option is the mean of its three years. Yields and costs are still made-up placeholders; prices and support are from this research.

## Payments switched on to begin with

These need no extra contract or multi-year commitment.

| Payment | In the app | Research | Agreement |
|---|---|---|---|
| Basic income support (BISS) | 170 €/ha, every year | Paid on the farmer's own entitlements, so there is no single rate. Opus: roughly 140–250. Hydrogen: national average 164 (2023), 175 (2024). | No firm figure. The farmer should enter their own. |
| Redistributive payment (CRISS) | 90 €/ha, every year | 89.87 €/ha for 2025; 84.73 for 2024. First 14 ha of farms up to 50 ha. | Both agree on 2025. |
| Coupled support, durum | 102.86 €/ha in durum years (range 84.15 to 102.86) | Plan rate 93.50 (96.88 in 2027), floor 84.15, ceiling 102.86. Paid: 98.18 (2023), 102.86 (2024 and 2025, the ceiling). Needs certified seed from 2024. Source: Italy's CAP plan. | Both agree. Opus read the AGEA circular. |
| Coupled support, grain legumes | 44.04 €/ha in chickpea, faba, lentil and pea years (range 29 to 44.04) | Plan rate 40.04 (41.48 in 2027), floor 29.00, ceiling 44.04. Paid 44.04 in 2023, 2024 and 2025. Covers chickpea, lentil, pea, faba bean, lupin and beans, not soybean. Source: Italy's CAP plan. | Both agree. |
| Eco-scheme 4, rotation with a legume | 40 €/ha per year on the chickpea and faba rotations | Plan rate about 110 €/ha, for rotation with legume or forage crops, with no chemical weedkillers or pesticides on the legume or forage crop. Rate in a paid year: 64.33 (2023), 58.15 (2024); for 2025 Opus found 60.36 and Hydrogen 71.70. Which years are paid is disputed (next section). 40 is about 60 for two years in three. | Rate for 2025 disputed; eligibility disputed. |

## Payments listed but switched off

Each needs a contract or a multi-year commitment, or its eligibility is disputed. The farmer switches on the ones that apply.

| Payment | In the app | Research | Agreement |
|---|---|---|---|
| Coupled oilseeds (rapeseed, sunflower) | 98 €/ha in rapeseed years (range 64.3 to 98) | Plan rate 64.30 €/ha; 98 was paid in 2023. Needs a supply contract with a processor or seed company and certified seed; not for rapeseed in protected zones. | Conditions from the research compilation. |
| Eco-scheme 4 with a vetch-oat year | 40 €/ha | Opus: qualifies like the other rotations. Hydrogen: a one-year vetch-oat mix followed by durum is excluded (cites a ministry FAQ). | Disputed. |
| Coupled support for a legume forage mix | 44 €/ha in the vetch-oat year | Only if the legume is predominant and stays until flowering starts. | Both agree on the condition. |
| Durum wheat fund | 100 €/ha in durum years | 100 €/ha ceiling for 2026 (200 was paid in 2024 and 2025). Needs a three-year supply contract with a cooperative, consortium, producer organisation or a processor (mill, pasta maker) and certified seed; cut pro rata; up to 50 ha; at most 50,000 € over three years. Source: MASAF fund (DM 677535), via Informatore Agrario, 3 March 2026. | Both agree. Opus read the AGEA instructions. |
| Food-sovereignty fund for legumes | 200 €/ha in chickpea and faba years | Up to 250 €/ha, cut pro rata; only on legume area above the farm's three-year average, under a three-year contract. | Both agree on the ceiling and conditions. |
| No-till sowing (SRA03, Basilicata) | 300 €/ha | 300 €/ha, five-year commitment. The 2026 call closed on 30 June 2026. | Both agree; neither could open the region's own site. |
| Integrated production (SRA01, Basilicata) | 171 €/ha | 171 €/ha arable (114 forage), five-year commitment. Not with organic on the same field. | Both agree. |
| Organic farming (SRA29, Basilicata) | 258 €/ha | Sources conflict: between 163 and 362 €/ha depending on crop and on conversion or maintenance. Last call closed May 2025. | Disputed. |

## What is disputed about Eco-scheme 4

- **Opus** read the scheme as a series of two-year commitments, each needing a legume and two different genera. On that reading all three alternatives are paid about two years in three.
- **Hydrogen** said faba → durum → faba is paid in all three years, chickpea → durum → durum in the first two, and vetch-oat → durum → durum not at all.

The app takes the cautious reading for chickpea and faba (two years in three) and leaves the vetch-oat rotation switched off with a note to ask the adviser.

## Prices

| Crop | In the app | Research |
|---|---|---|
| Durum | 290 €/t | 265–300 €/t through 2026 on the national durum list; 297.50 on 9 November. Higher-protein grain earns about 25 €/t more. Foggia stopped quoting durum in April 2026. Both agree. |
| Chickpea | 690 €/t | 500–950 €/t depending on seed size: about 500–600 for small, 640–740 for medium, 850–950 for large. Both agree. The spread is why this one matters most to edit. |
| Faba bean | 255 €/t | 250–260 €/t (Opus), 250–295 (Hydrogen). Feed grade. |
| Vetch-oat hay | 140 €/t | No southern quote exists. Estimated from northern hay quotes: 100–200 (Opus), 170–210 (Hydrogen). Marked as a placeholder in the app. |

## A rule that affects the current rotation

Both researchers found that durum after durum breaches the CAP crop-rotation condition (BCAA 7, in force from the 2024 claim year) unless the farm has 10 ha of arable land or less, is organic or in the integrated-production scheme, or opts for crop diversification across the farm. A breach reduces all direct payments; Opus recalled a figure of about 3% but could not verify it. The app does not put a number on this. It shows it as the first thing to check for the continuous-durum option.

## Found but not put in the app

- **One-off fertiliser aid, 2026:** about 31 €/ha on wheat, automatic for 2026 CAP applicants (Opus only). Left out because it does not repeat.
- **Nitrogen fertiliser cost:** about 155 €/ha for durum at November 2026 urea prices (Opus's calculation), rising with EU duties on Russian and Belarusian fertiliser in July 2027 and July 2028 and with the carbon border charge. Legumes need almost none. This belongs in the crop costs, which are still placeholders.
- **Agricultural diesel relief:** roughly 30–75 €/ha saved, the same for every rotation, so it does not change the comparison.
- **Subsidised crop insurance and the AgriCat fund:** premium subsidy of up to 70% (not verified); AgriCat is funded by withholding about 3% of direct payments.
- **Eco-scheme 5 (pollinators):** pays several hundred €/ha but only on land sown to nectar plants, which none of the four rotations is.

## From the research compilation (15 November 2026)

The owner's `research-compilation/research-compilation.md` changed these figures and conditions. The Italian CAP Strategic Plan text is at https://faolex.fao.org/docs/pdf/ita236756.pdf; the app's "Source" button opens the European Commission's page for the plan, https://agriculture.ec.europa.eu/cap-my-country/cap-strategic-plans/italy_en. None of these links could be opened from our build machine (the proxy refused them), so the pages are not checked.

- **Plan rates and floors/ceilings.** Durum: 93.50 planned, 84.15 to 102.86. Grain legumes: 40.04 planned, 29.00 to 44.04. The app keeps the paid amount (102.86 and 44.04) as the figure, and the floor and ceiling as the range.
- **Coupled oilseeds.** Rapeseed and sunflower, 64.30 €/ha planned, only under a supply contract with a processor or seed company, certified seed, not rapeseed in protected zones. The app keeps 98 (AGEA, 2023) with range 64.3 to 98, and now starts switched off because it needs a contract. This lowers the rapeseed rotation's income in the demo field from 621 to 589 €/ha.
- **Eco-scheme 4.** Planned about 110 €/ha for arable land rotated with legume or forage crops, with no chemical weedkillers or pesticides on the legume or forage crop (the research compilation said "synthetic plant protection products"; search excerpts of the farm guides say the ban is on the legume or forage crop only). Paid rates were 58 to 72 because more land applied than planned. Amounts unchanged; every Eco-scheme 4 condition now states the chemicals rule.
- **Durum wheat fund.** Partners that can sign the three-year contract: cooperatives, consortia, producer organisations, processors. Cap of 50,000 € over three years. Source: https://informatoreagrario.it/seminativi/confermato-il-contributo-per-la-filiera-del-grano-duro/ (3 March 2026); see also https://www.confagricolturaro.it/confagricoltura-informa/tecnico/pac-e-psr/grano-duro-aiuto-de-minimis-2025/ (16 May 2025).
- **Certified seed list.** CREA, species that can be certified: https://www.crea.gov.it/documents/63509/2367743/Specie-certificabili-07-10-2025.pdf/10a470d6-831e-a3e7-0d5f-d81518f9e9c3?t=1766054994158

Not put in the app:
- Eco-scheme 2 (grass cover in tree crops, about 120 €/ha) and Eco-scheme 3 (landscape olive groves, about 220 €/ha): no tree crops in the rotations.
- Eco-scheme 5 (pollinators, about 250 €/ha arable, 500 tree crops): needs land sown to nectar plants, which no rotation is.
- Areas with Natural Constraints: 10 to 20% higher grant scoring. A scoring advantage for some grants, not a per-hectare payment. https://agriculture.ec.europa.eu/media/news/cap-support-crucial-maintain-farming-areas-natural-constraints-shows-latest-study-2023-07-19_en
- The application process: the farm dossier (fascicolo aziendale) kept on SIAN, applications often filed through a CAA office, and Area Monitoring System checks with Copernicus satellites. https://interoperable-europe.ec.europa.eu/collection/egovernment/document/italian-informative-agricultural-system-agea-sian , https://www.confagricoltura.it/eng/network-confagricoltura/farmer-s-confederation-system/agricultural-assistance-centre%E2%80%93-caa , https://consulenzaagricola.it/circolari/politica-agricola-comune-e-nazionale/20261-circolare-agea-su-area-monitoring-system-ams

## What may change

- **Coupled durum payment** stays at its ceiling while durum area is low; it falls back toward 84–98 €/ha if sowings recover.
- **Eco-scheme 4** stays near 58–65 €/ha because far more land applied than planned.
- **CAP after 2027:** the Commission's July 2025 proposal merges the CAP funds into national plans and drops ring-fenced eco-schemes, so rates after 2027 are uncertain.
- **Basilicata area payments** run to the end of existing commitments; new calls before 2028 are uncertain.

## Sources the Opus researchers opened

- AGEA circulars on 2023, 2024 and 2025 unit amounts (coupled support, eco-schemes, redistributive payment): https://www.agea.gov.it/
- AGEA operating instructions 30/2025 clarifying Eco-scheme 4, and the national rural network's Eco-scheme 4 slides
- AGEA operating instructions 47/2026 for the durum wheat fund
- Foggia commodity exchange price lists, January and July 2026: https://www.fg.camcom.it/
- Turin fertiliser prices via CLAL: https://teseo.clal.it/en/?section=fertilizzanti_torino
- MASAF slides on the 2024 CAP simplification (crop-rotation rule): https://fidaf.it/wp-content/uploads/2024/10/Semplificazione-PAC_30-ott-24.pdf

Not opened by anyone: the Regione Basilicata and CSR Basilicata pages would not load, so the three regional payments rest on search results and trade press. The app links them to the region's rural development portal, https://europa.regione.basilicata.it/feasr/.
