# Crop figures: what the yields, prices, costs and nitrogen numbers are based on

Researched on 14 November 2026 for rain-fed clay hills around Genzano di Lucania (about 350 m, clay loam, roughly 550 mm of rain from October to May). Two researchers worked independently from the same brief: a Claude Opus agent, which marked every figure as verified in a source it opened, taken from a search excerpt, or recalled; and a Gemini Hydrogen agent, whose links were search redirects, so its figures count as a second opinion. Nobody on the team has checked these against the sources. **Treat every figure as a starting point for the farmer and adviser to correct.**

A third account, supplied by the project owner on 15 November 2026, compares continuous durum with a faba bean–wheat rotation and disagrees with the app on durum's costs and on which of the two earns more: `docs/durum-vs-faba-rotation-margins.md`. The app's figures have not been changed to match it.

The app's figures are the "In the app" columns. Where the two researchers differ, the app takes a value between them and the range covers both.

## In the app

| Crop (id) | Yield t/ha | Price €/t | Direct costs €/ha | N left for next crop kg/ha | Water need | Cereal machinery | Buyer | Broomrape host | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Durum wheat (`durum`) | 3.0 (2.0–4.0) | 290 (255–337) | 685 (600–900) | 0 | medium | yes | yes | no | fair |
| Chickpea (`chickpea`) | 1.4 (0.8–2.2) | 700 (500–950) | 540 (480–750) | 20 (15–40) | low | yes | limited | partly | low |
| Faba bean (`faba`) | 2.0 (1.2–3.0) | 255 (240–275) | 500 (450–650) | 35 (30–60) | medium | yes | yes | yes | low |
| Vetch-oat hay (`vetch-oat`) | 4.5 (2.5–7.0) | 120 (80–150) | 485 (350–600) | 20 (10–40) | low | no (mower, rake, baler) | limited | partly | low |
| Lentil (`lentil`) | 1.0 (0.5–1.8) | 780 (700–1000) | 510 (450–700) | 20 (15–35) | low | yes, with a low cut | yes | yes | low |
| Field pea (`pea`) | 2.2 (1.0–3.0) | 270 (240–300) | 545 (450–650) | 25 (20–40) | medium | yes | limited | yes | low |
| Barley (`barley`) | 3.0 (2.0–4.0) | 190 (170–200) | 585 (520–800) | 0 | low | yes | yes | no | low |
| Rapeseed (`rapeseed`) | 2.0 (1.0–3.0) | 500 (400–565) | 590 (500–750) | 0 | medium | yes, side knives advised | contract only | no | low |
| Coriander for seed (`coriander`) | 1.3 (0.6–2.0) | 575 (450–800) | 460 (400–650) | 0 | low | yes | contract only | partly | low |

Rotations built from them, each over three harvests: the four the app already had (durum → durum → durum, chickpea → durum → durum, faba → durum → faba, vetch-oat → durum → durum) plus lentil → durum → durum, pea → durum → durum, barley → durum → durum, rapeseed → durum → durum and coriander → durum → durum.

## What each researcher found

| Crop | Opus: yield / price / costs / N | Hydrogen: yield / price / costs / N |
|---|---|---|
| Durum | 3.0 / 285 / 900 (total cost) / 0 | 3.1 / 295 / 685 (direct) / 0 |
| Chickpea | 1.5 / 700 / 600 / 30 | 1.3 / 750 / 480 / 15 |
| Faba bean | 2.0 / 250 / 550 / 40 | 2.0 / 258 / 450 / 30 |
| Vetch-oat hay | 5.0 / 110 / 450 / 20 | 4.0 / 130 / 520 / 25 |
| Lentil | 1.0 / 800 / 550 / 25 | 0.9 / 745 / 470 / 15 |
| Field pea | 2.0 / 260 / 550 / 30 | 2.5 / 285 / 540 / 25 |
| Barley | 3.0 / 185 / 650 / 0 | 3.1 / 200 / 520 / 0 |
| Rapeseed | 2.0 / 450 / 600 / 0 | 2.0 / 565 / 580 / 0 |
| Coriander | 1.2 / 600 / 500 / 0 | 1.5 / 550 / 420 / 0 |

## What is solid and what is not

**Verified by Opus in a source it opened**
- The Genzano trial (Denora et al. 2025, Italian Journal of Agronomy 20, 100045): fertilised durum yielded 3.03 and 2.79 t/ha in the two seasons, unfertilised 2.57 and 1.96; durum's total costs were 1,104 and 901 €/ha. This is the same field as the app's demo field.
- Prices from the Foggia and Bari exchange lists, October 2025 to August 2026: durum, barley, oats, chickpea by seed size, faba bean, Italian green lentils (750–850 €/t at Bari), and field pea from Bologna (261 €/t).
- The 2023 coupled payments: durum 98.18 €/ha, oilseeds 98.27 €/ha, legumes other than soy 44.04 €/ha.
- Eco-scheme 4's official list of renewal crops includes sunflower, rapeseed, coriander, pea and chickpea; herbicides and other plant protection products are banned on the legume or forage crop.

**Not verified**
- **Costs for every crop except durum** are recalled or derived from total-cost tables. Neither researcher found a Basilicata or Puglia cost table by crop.
- **Durum direct costs:** Hydrogen gave an ISMEA split for the South (fertiliser about 188, seed 143, crop protection 78, energy 103, contractors 170 €/ha), which is what the app uses; Opus found only totals of 900 to 1,200 €/ha, which include more than direct costs.
- **Nitrogen left for the next crop** is recalled by both and they differ by up to a factor of two.
- **Yields other than durum** are recalled; no provincial statistics were found.
- **Hay prices:** no southern quote exists; both used northern exchanges.
- Water need, broomrape status and sowing months are the researchers' agronomic judgement.

## Durum after a legume

The income sum counts more durum grain after chickpea (16% the first harvest after, 10% the second) and after faba bean (12% the first harvest after). The sources are Lago-Olveira et al. 2023 (Puglia) and Garofalo et al. 2009 (Foggia, simulated), as cited in the team's research compilation; nobody on the team has checked them against the papers. No figure was found for lentil, pea or vetch, so they get none. See `docs/scoring.md`.

## Intercropping

Researched on 15 November 2026. Four Gemini Hydrogen researchers were sent out: one on yields and costs, two independently on payment rules, one on local trials. The local-trials researcher timed out and returned nothing. The other three worked **from search excerpts, not from documents they opened**, so everything below is a lead, not a checked fact. We tried to read the Genzano paper ourselves; both the publisher and the university repository refused automated readers, and we did not work around that.

**In the app: strips, as a stand-in.** Half the field in durum and half in a grain legume each year, in strips wide enough for the drill and the combine, swapped the next year. Each strip is an ordinary sole crop, so every figure is the plain average of two rotations the app already works out (`strips` in `scripts/make-placeholder-bundle.mjs`, `sideBySide` in `src/money/money.ts`). **No new number is assumed and no gain from growing the crops side by side is counted.** Two are shipped: chickpea with durum, and faba bean with durum. They are ranked only when the farmer switches them on (`docs/scoring.md`, "Strip intercrops").

Why strips and not a true mixture:

| Form | What the researchers found (excerpts) | In the app |
|---|---|---|
| **Strips**, each declared as its own parcel | Both payment researchers: keeps coupled durum support on the durum strips, coupled legume support and Eco-scheme 4 on the legume strips, and both grains are sold clean. Rarely practised in Italy; trials on sloping farms in Marche and Abruzzo gave a land equivalent ratio near 1.0, which is what the app assumes. Narrow strips may be flagged by satellite checks of the claim. | Yes, as a stand-in. Eco-scheme 4 is an optional payment, off until the CAA office confirms. |
| **Durum and a legume in the same rows, harvested together** | Agronomy: the best local evidence (the Genzano trial, below). Payments: both researchers say it **loses coupled durum support**, which needs a pure crop from at least 180 kg/ha of certified seed, and no selective herbicide is registered for the mixture. Separating the grain costs about 15 to 50 €/t. | No. We have no cost figures and no vetch yield, and the payment loss is serious. |
| **A forage legume sown into standing durum in late winter** (*bulatura*: sulla, clover) | Covers the ground after the July harvest, the months this app finds bare. No durum yield penalty in northern trials; about 50 kg N/ha for the next crop; 150 to 320 €/ha extra. Establishment is erratic in a dry spring on clay. Payment rules unclear. | No. The trials are not from dryland southern Italy. The strongest candidate to add next, because it answers the app's own main finding. |
| **A legume grown under durum and not harvested** | Durum yield down 14 to 16% in a central Italian trial; no second product to sell. | No. |

**The Genzano trial (Denora et al. 2025), on the demo field itself.** Durum sown and harvested together with common vetch, against fertilised and unfertilised durum alone, over a wet season (2022–23, 674 mm) and a dry one (2023–24, 315 mm).

| | 2022–23 | 2023–24 | How we know |
|---|---|---|---|
| Durum alone, fertilised (t/ha) | 3.03 | 2.79 | Read in the paper by an earlier researcher (Claude Opus) |
| Durum alone, unfertilised (t/ha) | 2.57 | 1.96 | Same |
| Durum grown with vetch (t/ha) | 3.31 | 2.67 | Search excerpt only |
| Land equivalent ratio | 1.62 | 1.35 | Search excerpt only |
| Durum grain protein, with vetch against alone (%) | 13.9 against 12.3 | 12.4 against 12.3 | Search excerpt only |

Also from excerpts: vetch residues held up to 125 kg N/ha, and the paper's margin was 281 €/ha with vetch against 48 €/ha for fertilised durum. The rain totals in the excerpts match the ones the data team typed in from the paper, which is some reassurance that the excerpts are the paper's. **Before any of this goes on screen, someone must open the paper** (https://doi.org/10.1016/j.ijagro.2025.100045) and copy the vetch yield, the cost lines and the prices used.

**Cautions the farmer sees in the app for strips:** the strip width must suit the drill and the combine header; the CAA office must confirm each strip can be declared as its own parcel; spray on the durum strips must not drift onto the legume; and few farms in Italy do this yet.

## Researched but left out of the app

- **Sulla hay:** both researchers preferred it to berseem clover for dry calcareous clay, but it is normally kept for two years, and no yield or cost for the second year was found. Opus gave 6 t/ha from a search excerpt; Hydrogen gave 3.8.
- **Oats:** easy to grow but low price (145–185 €/t), and both researchers said it adds little.
- **Sunflower:** a summer crop that depends on stored soil water; both rated it poor without irrigation.
- **Safflower:** suggested by Hydrogen alone as a rain-fed oilseed that suits these hills, with low confidence.
- **Berseem clover:** needs more water than this area gives.

## Cautions that apply to every legume

- Broomrape (*Orobanche crenata*) is worst on faba bean, lentil, pea and vetch.
- Under Eco-scheme 4 no herbicide may be used on the legume, so weeds must be controlled mechanically.
