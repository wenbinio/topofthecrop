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
| Redistributive payment (CRISS) | 89.37 €/ha, every year (range 84.73 to 89.87) | Paid 89.37 for 2025 (89.87 is the plan ceiling) and 84.73 for 2024. First 14 ha of farms up to 50 ha. | Checked in AGEA circular 94143 and the plan text. |
| Coupled support, durum | 102.86 €/ha in durum years (range 84.15 to 102.86) | Plan rate 93.50 (96.88 in 2027), floor 84.15, ceiling 102.86. Paid: 98.18 (2023), 102.86 (2024 and 2025, the ceiling; the 2024 sum came to 160.20 and was capped). Centre and South regions; certified seed from 2024. | 2024 and 2025 checked in the AGEA circulars and the plan text; 2023 not checked. |
| Coupled support, grain legumes | 44.04 €/ha in chickpea, faba, lentil and pea years (range 29 to 44.04) | Plan rate 40.04 (41.48 in 2027), floor 29.00, ceiling 44.04. Paid 41.78 in 2024 and 44.04 in 2025. Covers grain legumes, not soybean (the same intervention also covers annual legume forage with at least 51% legumes). | 2024 and 2025 checked in the AGEA circulars. |
| Eco-scheme 4, rotation with a legume | 40 €/ha per year on the chickpea and faba rotations | Plan rate about 110 €/ha, for rotation with legume or forage crops, with no chemical weedkillers or pesticides on the legume or forage crop. Rate in a paid year: 64.33 (2023, not checked), 49.48 (2024), 60.36 (2025); outside nitrate-vulnerable and Natura 2000 zones, where it is 59.38 and 72.43. The 58.15 and 71.70 found earlier were wrong. Which years are paid is disputed (next section). 40 is about 60 for two years in three. | Rate for 2025 disputed; eligibility disputed. |

## Payments listed but switched off

Each needs a contract or a multi-year commitment, or its eligibility is disputed. The farmer switches on the ones that apply.

| Payment | In the app | Research | Agreement |
|---|---|---|---|
| Coupled oilseeds (rapeseed, sunflower) | 111.10 €/ha in rapeseed years (range 90.90 to 111.10) | Plan rate 101.00, floor 90.90, ceiling 111.10. Paid 98.16 (2024) and 111.10 (2025). Needs a contract with a processor, seed company or feed mill, and certified seed. | Checked in the AGEA circulars and the plan text. The research compilation's 64.30 was wrong. |
| Eco-scheme 4 with a vetch-oat year | 40 €/ha | Opus: qualifies like the other rotations. Hydrogen: a one-year vetch-oat mix followed by durum is excluded (cites a ministry FAQ). | Disputed. |
| Coupled support for a legume forage mix | 44 €/ha in the vetch-oat year | Only if the legume is predominant and stays until flowering starts. | Both agree on the condition. |
| Durum wheat fund | 100 €/ha in durum years (range 0 to 200) | Cap 100 €/ha for 2026 under DM 585284 of 30 October 2025 (not to be confused with DM 585296). The cap was raised to 200 for 2024 (DM 27 December 2024); for 2025 a further 10 M€ (MASAF, 5 November 2025) was reported as a 200 cap, but what was actually paid is not known. Needs a three-year supply contract with a cooperative, consortium, producer organisation or a processor (mill, pasta maker) and certified seed; cut pro rata; up to 50 ha; at most 50,000 € over three years. | Owner's audit against the Gazzetta Ufficiale and MASAF, 15 November 2026. |
| Food-sovereignty fund for legumes | 250 €/ha in chickpea, faba, lentil and pea years (range 137 to 250) | Cap 250 €/ha; the 2025 rate after cuts was 137. Only on legume hectares above the farm's three-year average, up to 50 ha across the arable crops covered. A supply contract is required (AGEA instructions 83/2026, p. 6); a cooperative member's yearly pledge must link to the underlying contract. The 2026 rate is not yet known. | Owner's audit, 15 November 2026. |
| No-till sowing (SRA03, Basilicata) | 300 €/ha | 300 €/ha a year, five-year commitment. The 2026 call (Determination 100 of 13 February 2026) was extended to 30 June 2026 (Determination 423 of 19 May 2026). Not on the same area as SRA01 or SRA29. | Owner's audit against the CSR Basilicata 2026 call page. |
| Integrated production (SRA01, Basilicata) | 171 €/ha | 171 €/ha arable, 114 forage, five-year commitment. Not on the same area as organic or no-till. | Owner's audit. |
| Organic farming (SRA29, Basilicata) | 258 €/ha (range 208 to 291) | Keeping organic: 258 €/ha arable, 208 legumes. Converting: 291 arable, 233 legumes. Five-year commitment. Last call closed May 2025. | Owner's audit. |

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

## Checked against AGEA's documents (15 November 2026)

A Claude agent read AGEA's balance-payment circulars for 2024 (n. 89138, 25 Nov 2024) and 2025 (n. 94143, 21 Nov 2025, https://www.agea.gov.it/documents-apigw/documents/d/agea/agea-94143-21-11-25-a-opr-circolareageasaldi2025-pdf), AGEA's Eco-scheme 4 instructions 30/2025, and the plan text on FAOLEX. The figures above marked "checked" come from those. The app's coupled payments, redistributive payment and Eco-scheme 4 now cite circular 94143, which holds the amounts paid.
- **Eco-scheme 4 rules (instructions 30/2025):** a rotation of at least two years, a depleting crop (durum) alternating with an improving one (pea, faba, lentil, chickpea, vetch). Chemical weedkillers and other plant protection products are banned on the legume and forage crop only; a renewal crop must be grown by integrated or organic rules; durum is not limited. AGEA's own example pays coriander then durum in both years. Residue incorporation was not found in those instructions; it stays in the app's wording from the earlier research.
- **Not checked by the agent** (the sites could not be read): the durum wheat fund, the legume fund, the Basilicata payments, basic income support and the CREA seed list. The owner's own audit (next section) covers all of these except basic income support. The European Commission page for Italy's plan loads.

## The owner's audit (15 November 2026)

The owner checked the rest against the Gazzetta Ufficiale, MASAF, AGEA, CSR Basilicata and the papers. The rows above marked "owner's audit" come from it. Also from it:
- **Durum fund decree:** DM 585284 of 30 October 2025. The "DM 677535" in the research compilation is not confirmed.
- **Areas with Natural Constraints (SRB01):** 120 €/ha for eligible non-livestock mountain farms, with area-based reductions. Genzano di Lucania does not qualify (municipality classification), so 0 €/ha there; not in the app.
- **2023 figures:** coupled durum 98.18 and Eco-scheme 4 64.33 are confirmed. Eco-scheme 4 for 2023 went through three stages: 49.67 first worked out, 52.12 after the May 2024 reserve adjustment, 64.33 after the October 2024 one. The app uses 2025 amounts; 2023 ones are history, not 2026 rates.
- **CREA list:** it lists species that can be certified, not varieties.
- **Papers:** Denora et al. 2025 ran at the La Generale cooperative, Genzano di Lucania, on 12 ha (Section 2.1), with contribution margins of 280.6 and 47.5 €/ha. Garofalo et al. 2009's 12% is a modelled average (2,684 against 2,377 kg/ha is about 12.9%). Lago-Olveira et al. 2023's +16% is indirectly supported; the +10% still needs Table S3.
- **Keep apart:** the statutory cap, the final campaign rate and the amount actually paid. For durum and legumes the same €/ha can mean different things in different years.
- **Not used anywhere:** the Lebanon study on wheat and faba bean in the research compilation (too far from southern Italy).

## From the research compilation (15 November 2026)

The owner's `research-compilation/research-compilation.md` changed these figures and conditions. The Italian CAP Strategic Plan text is at https://faolex.fao.org/docs/pdf/ita236756.pdf; the app's "Source" button opens the European Commission's page for the plan, https://agriculture.ec.europa.eu/cap-my-country/cap-strategic-plans/italy_en. The European Commission page and the plan text were later opened and checked (section above).

- **Plan rates and floors/ceilings.** Durum: 93.50 planned, 84.15 to 102.86. Grain legumes: 40.04 planned, 29.00 to 44.04. The app keeps the paid amount (102.86 and 44.04) as the figure, and the floor and ceiling as the range.
- **Coupled oilseeds.** The compilation's 64.30 €/ha and its protected-zones rule did not match the plan or AGEA (above). What stands is the contract and certified-seed rule; the payment now starts switched off because it needs a contract. This lowers the rapeseed rotation's income in the demo field from 621 to 588 €/ha.
- **Eco-scheme 4.** Planned about 110 €/ha for arable land rotated with legume or forage crops, with no chemical weedkillers or pesticides on the legume or forage crop (the research compilation said "synthetic plant protection products"; search excerpts of the farm guides say the ban is on the legume or forage crop only). Paid rates were 49 to 64 because more land applied than planned. Amounts unchanged; every Eco-scheme 4 condition now states the chemicals rule.
- **Durum wheat fund.** Partners that can sign the three-year contract: cooperatives, consortia, producer organisations, processors. Cap of 50,000 € over three years. Source: https://informatoreagrario.it/seminativi/confermato-il-contributo-per-la-filiera-del-grano-duro/ (3 March 2026); see also https://www.confagricolturaro.it/confagricoltura-informa/tecnico/pac-e-psr/grano-duro-aiuto-de-minimis-2025/ (16 May 2025).
- **Certified seed list.** CREA, species that can be certified: https://www.crea.gov.it/documents/63509/2367743/Specie-certificabili-07-10-2025.pdf/10a470d6-831e-a3e7-0d5f-d81518f9e9c3?t=1766054994158

Not put in the app:
- Eco-scheme 2 (grass cover in tree crops, about 120 €/ha) and Eco-scheme 3 (landscape olive groves, about 220 €/ha): no tree crops in the rotations.
- Eco-scheme 5 (pollinators, about 250 €/ha arable, 500 tree crops): needs land sown to nectar plants, which no rotation is.
- Areas with Natural Constraints: 10 to 20% higher grant scoring, per the compilation. Genzano di Lucania does not qualify for the mountain SRB01 payment (owner's audit). https://agriculture.ec.europa.eu/media/news/cap-support-crucial-maintain-farming-areas-natural-constraints-shows-latest-study-2023-07-19_en
- The application process: the farm dossier (fascicolo aziendale) kept on SIAN, applications often filed through a CAA office, and Area Monitoring System checks with Copernicus satellites. https://interoperable-europe.ec.europa.eu/collection/egovernment/document/italian-informative-agricultural-system-agea-sian , https://www.confagricoltura.it/eng/network-confagricoltura/farmer-s-confederation-system/agricultural-assistance-centre%E2%80%93-caa , https://consulenzaagricola.it/circolari/politica-agricola-comune-e-nazionale/20261-circolare-agea-su-area-monitoring-system-ams

## What may change

- **Coupled durum payment** stays at its ceiling while durum area is low; it falls back toward 84–98 €/ha if sowings recover.
- **Eco-scheme 4** stays near 50–65 €/ha because far more land applied than planned.
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
