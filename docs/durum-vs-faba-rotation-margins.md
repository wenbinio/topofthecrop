# Continuous durum against a faba bean–wheat rotation: gross margins with ranges

**Where this comes from.** The project owner supplied this as a Word file on 15 November 2026 (`durum-vs-faba-rotation-margins.docx`, beside this page). The text below is that document as received, with its tables rebuilt for reading here; "I" is the document's author, who is not named in it. Nobody on the team has opened its sources to check the figures. **The app's figures have not been changed to match it.** How the two differ is set out at the end, under "Against the app's figures".

---

Result: with ranges drawn from several sources, continuous durum most likely loses about €90/ha per year on direct costs (roughly −€210 to +€55), while the two-year faba bean–wheat rotation sits around break-even (roughly −€70 to +€155). The rotation comes out ahead in about 96% of the combinations I simulated, typically by €30–210/ha per year.

My central estimate moved since the first answer, which had monoculture at −€159, the rotation at −€88 and a gap of about €71. The new sources put the rotation yield gain and the Basilicata base yield higher than the paper does, and I now count straw (about 4% on top of grain revenue) and a small nitrogen saving on wheat after faba.

## Input ranges and where they come from

| Input | Range used | Evidence |
|---|---|---|
| Durum price (€/t) | 240–330 | Basilicata farm-gate 240–260 (Aug 2026); ISMEA producer average 244 (July 2026); southern national quotation 295–300 (Nov 2026); Foggia up to 338 for high protein |
| Faba bean price (€/t) | 240–305 | Foggia 242–265; Bologna 255–304 (2026 listings) |
| Continuous wheat yield (t/ha) | 2.0–3.3 | Paper 2.38; Basilicata farm-survey average 3.05 (2016–20); ISMEA southern average 3.68 (2025, flat land) |
| Wheat yield gain after faba | +8% to +40% | Paper +13%; southern Italy no-till trial +14–30%; long-term Sicilian trial about +40% with less nitrogen |
| Faba bean yield (t/ha) | 1.3–3.0 | 25-year Sicilian average 1.8; Sicilian study 2.0; Basilicata tillage trial 2.6–3.3 |

## Direct costs (€/ha)

| Item | Durum wheat | Faba bean |
|---|---|---|
| Seed | 100–160 | 50–130 |
| Fertiliser | 130–225 | 0–50 |
| Crop protection | 40–90 | 25–80 |
| Field operations and harvest | 350–500 | 290–480 |
| Other | 30–60 | 20–40 |
| Total, full span | 650–1,035 | 385–780 |
| Total, likely range | 795–900 | 540–645 |

Wheat after faba: same as durum, less €0–70 for 0–40 kg/ha of nitrogen saved.

Full cost: land and overheads add about €250–400/ha to either crop, giving €1,100–1,400/ha for durum. That matches ISMEA's €1,170 for the South and the Puglia farmers' union figure of €1,200–1,400.

Cross-checks: ISMEA's itemised Marche budget has seed 158, fertiliser 224, crop protection 90, and contract work plus energy about 400. The farm-survey figure for inputs plus contract work was about €400/ha at 2016–20 prices.

Weakest input: faba bean costs rest largely on unverified grower-forum reports; I found no published southern budget.

## Revenue and gross margin (€/ha per year, no subsidies)

Ranges are the 10th–90th percentile of 200,000 simulated combinations of the inputs above; the median is in brackets.

| | Continuous wheat | Wheat after faba | Faba bean |
|---|---|---|---|
| Revenue | 645–895 (760) | 770–1,095 (920) | 440–700 (560) |
| Direct costs | 795–900 (850) | 760–875 (820) | 540–645 (595) |
| Gross margin | −210 to +55 (−90) | −60 to +285 (+100) | −165 to +115 (−35) |

| System average | Gross margin |
|---|---|
| Continuous wheat | −210 to +55 (−90) |
| Two-year rotation | −70 to +155 (+35) |
| Three-year rotation (faba–wheat–wheat) | −100 to +130 (+10) |
| Two-year rotation advantage | +30 to +210 (+120) |

## What drives the spread

Faba bean yield matters most. Below 1.7 t/ha the rotation still wins in about 82% of cases, but by a median of only €50/ha. Above 2.2 t/ha it wins every time.

Durum price works against the rotation. At €300–330/t the advantage shrinks to a median of about €90/ha, and monoculture gets close to break-even.

Chance of a positive gross margin: about 21% for continuous wheat and 66% for the rotation.

Counter-evidence: one EU-wide study found legume rotations at some Italian sites earned up to €108/ha per year less than cereal rotations, so the advantage is not guaranteed on every farm.

Simulation limits: I treated durum and faba bean prices as independent, and the ranges describe long-run averages for a farm, not single dry or wet years.

### Two Quick Caveats to Note in Your Methodology

Faba bean direct costs (€540–645/ha): Because ISMEA does not publish an official southern cost sheet for faba bean, note that these cost brackets are bottom-up estimates anchored against durum machinery rates rather than an official government survey.

Drought correlation: Because the simulation sampled durum and faba bean yields independently, the downside tail (−€70/ha for the two-year rotation) slightly understates losses in severe drought years—when both crops fail simultaneously rather than offsetting each other.

To make sure your app calculates cleanly without double-counting when it adds your EU subsidy layer and compares against other crops, check these three implementation details before plugging it in:

1. Use the Gross Margin rows (before land & overheads):
   - Continuous wheat: −€90/ha (range: −€210 to +€55)
   - Two-year rotation (faba–wheat): +€35/ha (range: −€70 to +€155)
   - Three-year rotation (faba–wheat–wheat): +€10/ha (range: −€100 to +€130)

   (Skip the "After land and overheads" rows unless your app models fixed farm-wide land rent and equipment depreciation identically across every other crop in your app).
2. Check the time horizon / averaging: Those rotation figures (+€35/ha and +€10/ha) are already annualized per-hectare averages across the full 2-year or 3-year cycle (i.e., 0.5 × Faba + 0.5 × Wheat after faba). Make sure your app treats them as steady-state annual returns per hectare rather than multiplying or dividing them by 2 again.
3. Include the two methodology notes in your app's assumptions/tooltip: If your app displays assumptions or confidence intervals to users, keep those two caveats attached so users know why the faba bean cost bracket (€540–645/ha) has wider uncertainty than wheat and why extreme drought risk isn't fully captured in the downside tail.

The underlying 2026 benchmarks in that dataset hold up against official Italian figures (ISMEA's €1,170/ha southern durum production cost, ISMEA's ~€262–273/t autumn producer averages, and November 2026 CUN South Italy quotes around €280–334/t depending on protein grade).

Sources:

- [Grano duro: quotazioni CUN, 2 novembre 2026 (agricultura.it)](https://www.agricultura.it/2026/11/02/grano-duro-quotazioni-cun-stabili-in-tutta-italia-2-novembre-il-fino-al-sud-resta-a-295-300-euro-a-tonnellata/)
- [Cia Basilicata: al cerealicoltore 24–26 centesimi (Radio Senise Centrale)](https://www.radiosenisecentrale.it/news/2026/08/24/cia-basilicata-pasta-a-135-220-euro-al-kg-al-cerealicoltore-24-26-centesimi/)
- [Grano duro 2026: prezzi sotto i costi (OmniTrattore)](https://www.omnitrattore.it/features/799428/grano-duro-2026-prezzi-agricoltori/)
- [Borsa Merci Foggia, listino n. 36/2026](https://www.fg.camcom.it/sites/default/files/upload/mercato_e_tutela/borsa_merci/listini/2026/2026_36.pdf)
- [Borsa Merci Foggia, listino n. 27/2026](https://www.fg.camcom.it/sites/default/files/upload/mercato_e_tutela/borsa_merci/listini/2026/2026_27.pdf)
- [Borsa Merci Bologna, listino n. 27/2026](https://www.bo.camcom.gov.it/sites/default/files/borsa-merci-e-rilevazione-prezzi/listino-dei-prezzi-settimanali/anno-2026/n.27_%202%20luglio_2026.pdf)
- [AGER Bologna, listino n. 9/2026](https://www.agerborsamerci.it/wp-content/uploads/2026/02/Settimanale-n.-9-del-26-Febbraio-2026-%E2%80%93-Listino-Borsa-n.-9.pdf)
- [Ismea: costi medi di produzione del grano duro (WineNews)](https://winenews.it/it/ismea-pubblica-i-costi-medi-di-produzione-del-grano-duro-italiano-302-318-euro-a-tonnellata_570034/)
- [Grano duro, ecco in dettaglio tutti i costi di produzione (Marche Agricole)](https://www.marcheagricole.it/grano-duro-ecco-in-dettaglio-tutti-i-costi-di-produzione/)
- [Frumento duro, costi più bassi al Centro Italia (AgroNotizie)](https://agronotizie.imagelinenetwork.com/agricoltura-economia-politica/2025/12/31/frumento-duro-produzione-piu-competitiva-al-centro-che-al-sud/88636)
- [CREA RICA focus grano duro: costi, prezzi, margini e aiuti](https://rica.crea.gov.it/download.php?id=1688)
- [Consorzi Agrari d'Italia / CIA Puglia cost estimates (PugliaLive)](https://bancafucino.it/sites/default/files/2026-05/260514_consorzi-agrari-ditalia-cereali-qualita-in-crescita-ma-criticita-su-superfici-prezzi-e-costi-di-produzione_PugliaLive.pdf)
- [Prezzi fertilizzanti, luglio 2026 (AgroNotizie)](https://agronotizie.imagelinenetwork.com/fertilizzazione/2026/07/31/fertilizzanti-i-prezzi-degli-azotati-tornano-a-salire-sui-mercati-internazionali/89593)
- [Agro-ecological benefits of faba bean for rainfed Mediterranean cropping systems (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1125471824006182)
- [Wheat response to no-tillage and nitrogen in a long-term faba bean-based rotation (Agronomy 2019)](https://doi.org/10.3390/agronomy9020050)
- [Tillage and faba bean nitrogen fixation in a durum wheat rotation (Agronomy 2023)](https://www.mdpi.com/2073-4395/13/1/105)
- [Legumes in Cropping Systems, chapter 13 (Legume Hub)](https://legumehub.eu/wp-content/uploads/2021/06/Chapter-13-Legumes-in-Croping-Systems.pdf)
- [Favino grower forum thread (Tractorum)](https://www.tractorum.it/forum/topic/466-favino/)

---

## Against the app's figures

Added by the team on 15 November 2026, when the document was put in the repository. The app's figures are those in `scripts/make-placeholder-bundle.mjs` (`CROP_TABLE`), from `docs/crops-research.md`. Margins here are before any support payment, to match the document; the app's own screens show income with support included.

| | This document (median, range) | The app |
|---|---|---|
| Durum price, €/t | 240–330 | 290 (255–337) |
| Durum yield, continuous, t/ha | 2.0–3.3 | 3.0 (2.0–4.0), the same for any durum year |
| Durum direct costs, €/ha | 850 (795–900) | 685 (600–900) |
| Durum yield gain after faba | +8% to +40% | +12% (one study) |
| Faba bean price, €/t | 240–305 | 255 (240–275) |
| Faba bean yield, t/ha | 1.3–3.0 | 2.0 (1.2–3.0) |
| Faba bean direct costs, €/ha | 595 (540–645) | 500 (450–650) |
| Straw and nitrogen saved | Counted (straw about +4% of grain revenue; €0–70 of nitrogen) | Not counted |
| **Gross margin, continuous durum** | **−90** (−210 to +55) | **+185** |
| Gross margin, durum after faba | +100 (−60 to +285) | +289 |
| Gross margin, faba bean | −35 (−165 to +115) | +10 |
| **Two-year rotation against continuous durum** | **+120** (+30 to +210) | **−35** |

The app's sums: continuous durum 3.0 × 290 − 685 = 185; durum after faba 3.0 × 1.12 × 290 − 685 = 289; faba 2.0 × 255 − 500 = 10; the two-year average (10 + 289) ÷ 2 = 150.

**What the difference means.** The two disagree on the direction, not only the size. The document has the faba rotation ahead of continuous durum in about 96% of its simulated cases. On the app's figures the faba rotation is behind before support, and still behind with it: the app shows 467 €/ha a year for faba, durum, faba against 548 for durum on durum. Most of the gap comes from three inputs: durum's direct costs (850 against 685), durum's yield gain after faba (up to +40% against +12%), and continuous durum's yield (the document's range tops out at 3.3 t/ha; the app uses 3.0 as the usual figure).

**Not settled here.** Which figures the app should use is the owner's decision. Before changing them: the document's faba bean costs rest on grower-forum reports by its own account; it compares a two-year rotation, while the app's faba option is faba, durum, faba over three harvests; and it has no figures for the app's other seven crops, which would then sit on a different cost basis from durum.
