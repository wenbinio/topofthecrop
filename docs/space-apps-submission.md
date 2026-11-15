# Top of the Crop: sources and AI statement

Text for the NASA Space Apps 2026 project page (challenge: Field Shift), ready to paste: the NASA data list, partner data, other references and the AI statement. A plain-text copy was given to the team. Written with AI assistance (Claude, Anthropic); the full citations are in `DATA_SOURCES.md` and the longer AI statement is in the README's "Use of AI".
Live app: https://wenbinio.github.io/topofthecrop/
Code and full citations: https://github.com/wenbinio/topofthecrop (DATA_SOURCES.md)

## NASA data

NASA datasets were read through Google Earth Engine, except NASA POWER (its API) and GIBS (map tiles).

- MODIS Terra Vegetation Indices 16-Day 250 m (MOD13Q1 v6.1). Used for greenness: the green, patchy and bare months, the bare months after harvest, peak greenness each season, and green-up and dry-off dates. https://doi.org/10.5067/MODIS/MOD13Q1.061
- MODIS Terra Net Evapotranspiration 8-Day 500 m (MOD16A2GF v6.1; MOD16A2 for the latest months). Used for the water the crops used each season. https://doi.org/10.5067/MODIS/MOD16A2GF.061
- GPM IMERG Final Precipitation, monthly 0.1 degree (V07). Used as one of three rain sources (with CHIRPS and ERA5-Land; the app shows their median). https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07
- NASA Earth Exchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6). Used for change by 2041-2060 from 29 climate models, middle (SSP2-4.5) and high (SSP5-8.5) emissions: hot days at flowering, the usual daytime high, rain and frost. https://doi.org/10.1038/s41597-022-01393-4
- SMAP L4 Global 3-hourly 9 km Surface and Root Zone Soil Moisture (SPL4SMGP v8). Used for root-zone soil water at sowing and in spring. https://doi.org/10.5067/T5RUATAQREF8
- NASADEM Merged DEM Global 1 arc second (v001). Height and slope, in the data files; not yet shown in the app. https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001
- Harmonized Landsat Sentinel-2 (HLSL30 and HLSS30 v2.0). Used for 30 m greenness at the demo field, to check MODIS. https://doi.org/10.5067/HLS/HLSL30.002 and https://doi.org/10.5067/HLS/HLSS30.002
- NASA POWER (Prediction Of Worldwide Energy Resources), daily. Loaded live by the app for area weather history and this season's rain so far; also used to check rain and temperature at the demo field. https://power.larc.nasa.gov/
- NASA GIBS (Global Imagery Browse Services), Blue Marble Next Generation layer. Used for the zoomed-out map picture. https://www.earthdata.nasa.gov/gibs
  We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

## Space agency partner data

- Copernicus Sentinel-2 (ESA / European Union). Contains modified Copernicus Sentinel data 2016-2026.
  - Surface reflectance with Cloud Score+, in Google Earth Engine: 10 m greenness at the demo field. Pasquarella et al. 2023, Cloud Score+.
  - Our own map tiles of the Bradano basin, from four L2A scenes of 30 May 2026 (Sentinel-2 COGs on AWS Open Data). https://registry.opendata.aws/sentinel-2-l2a-cogs/
  - The field timelapse ("Your field from space"), loaded live through Microsoft Planetary Computer. https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a
  - Sentinel-2 cloudless 2016 by EOX (CC BY 4.0), the zoomed-in map outside the basin. https://s2maps.eu
- ESA WorldCover 10 m 2021 v200 (CC BY 4.0). Used for the cropland mask. https://doi.org/10.5281/zenodo.7254221
- JAXA GSMaP operational v8, gauge-adjusted. Used for a rain comparison at the demo field. GSMaP data were provided by JAXA. https://sharaku.eorc.jaxa.jp/GSMaP/

## Other data and live services

- ERA5-Land (ECMWF, Copernicus Climate Change Service). Used for temperature (hot days, frost), one of the three rain sources, and reference evapotranspiration. Muñoz Sabater 2019. https://doi.org/10.24381/cds.e2161bac
- CHIRPS daily rainfall v2.0 (Climate Hazards Center, UC Santa Barbara). Used as one of the three rain sources and for daily rain. Funk et al. 2015. https://doi.org/10.1038/sdata.2015.66
- CORINE Land Cover 2018 (European Union, Copernicus Land Monitoring Service, EEA). Used for the rain-fed farmland mask. https://land.copernicus.eu/en/products/corine-land-cover
- EU crop map 2018 and 2022 (European Commission JRC, CC BY 4.0). Used to pre-fill the last crop. d'Andrimont et al. 2021, https://doi.org/10.1016/j.rse.2021.112708; Ghassemi et al. 2024, https://doi.org/10.1038/s41597-024-03884-y
- HydroSHEDS HydroBASINS level 8. Used for the basin outline. Lehner and Grill 2013. https://www.hydrosheds.org
- SoilGrids 2.0 (ISRIC, CC BY 4.0). Used for soil properties. Poggio et al. 2021, https://doi.org/10.5194/soil-7-217-2021. Water retention: Turek et al. 2023, https://doi.org/10.1016/j.iswcr.2022.08.001
- TerraClimate. Used to check reference evapotranspiration. Abatzoglou et al. 2018. https://doi.org/10.1038/sdata.2017.191
- FAO Irrigation and Drainage Paper 56. The method for crop water need. Allen, Pereira, Raes and Smith 1998. https://www.fao.org/3/x0490e/x0490e00.htm
- AGEA orthophotos, 2022-2024 flights (CC BY 4.0). Aerial photos on the map. https://geoportale.agea.gov.it/
- Agenzia delle Entrate, Cartografia catastale (INSPIRE Cadastral Parcels WFS, CC BY 4.0). Used to find a field by its parcel numbers in Genzano di Lucania. https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php
- MET Norway Locationforecast 2.0 (CC BY 4.0 and NLOD 2.0). The seven-day forecast. Data from MET Norway. https://api.met.no/
- Photon geocoder by komoot (OpenStreetMap data, © OpenStreetMap contributors). Used for town search. https://photon.komoot.io/
- Microsoft Planetary Computer, STAC API and data API. Used to find and draw the Sentinel-2 pictures for the timelapse. https://planetarycomputer.microsoft.com/

## Research, prices and payment rules (references)

- Denora, M. et al. (2025). Durum wheat-vetch intercropping in Mediterranean agroecological systems: effects on yield, nitrogen balance, and farm profitability. Italian Journal of Agronomy 20, 100045. Used for durum yield, and for the trial's weather station and soil at the demo field (to check our figures). https://doi.org/10.1016/j.ijagro.2025.100045
- Lago-Olveira, S., Rebolledo-Leiva, R., Garofalo, P., Moreira, M. T. and González-García, S. (2023). Environmental and economic benefits of wheat and chickpea crop rotation in the Mediterranean region of Apulia (Italy). Science of the Total Environment 896, 165124. Used for more durum after chickpea, and for chickpea's costs relative to wheat. https://doi.org/10.1016/j.scitotenv.2023.165124
- Garofalo, P., Di Paolo, E. and Rinaldi, M. (2009). Durum wheat (Triticum durum Desf.) in rotation with faba bean (Vicia faba var. minor L.): long-term simulation case study. Crop and Pasture Science 60(3), 240-250. Used for more durum after faba bean. https://doi.org/10.1071/CP08208
- ISMEA, Monitoraggio dei costi medi di produzione: raccolto frumento 2025 (Puglia, Sicily and Basilicata cluster), as reported by AgroNotizie on 31 December 2025. Used for durum's direct costs. https://agronotizie.imagelinenetwork.com/agricoltura-economia-politica/2025/12/31/frumento-duro-produzione-piu-competitiva-al-centro-che-al-sud/88636
- Tedone, L., Alhajj Ali, S. and De Mastro, G. (2023). The effect of tillage on faba bean (Vicia faba L.) nitrogen fixation in durum wheat-based rotation under a Mediterranean climate. Agronomy 13(1), 105. Used for nitrogen left after faba bean. https://doi.org/10.3390/agronomy13010105
- Giambalvo, D., Stringi, L., Durante, G., Amato, G. and Frenda, A.S. (2004). Nitrogen efficiency component analysis in wheat under rainfed Mediterranean conditions: effects of crop rotation and nitrogen fertilization. Options Méditerranéennes A60. Used for nitrogen left after chickpea. https://om.ciheam.org/article.php?IDPDF=4600059
- Preissel, S., Reckling, M., Schläfke, N. and Zander, P. (2015). Magnitude and farm-economic value of grain legume pre-crop benefits in Europe: a review. Field Crops Research 175, 64-79. Used for nitrogen left after field pea and chickpea. https://doi.org/10.1016/j.fcr.2015.01.012
- GRDC (2018). Rules-of-thumb for calculating additional soil N availability and wheat N uptake in pulse-cereal sequences. GRDC Update Papers. Used for nitrogen left after lentil and vetch-oat hay, and none after cereals and oilseeds. https://grdc.com.au/resources-and-publications/grdc-update-papers/tab-content/grdc-update-papers/2018/02/rules-of-thumb-for-calculating-additional-soil-n-availability
- Agronomic report for an agrivoltaic project at Matera and Santeramo in Colle (March 2023), Italian Ministry of the Environment's assessment portal. Used for the top of chickpea's cost range. https://va.mite.gov.it/File/Documento/817030
- Foggia commodity exchange, weekly price lists, and the national durum price list (2025-26). Used for durum, chickpea, faba bean and barley prices. https://www.fg.camcom.it/
- Bari commodity exchange, cereal and legume price lists (2025-26). Used for chickpea, faba bean, barley and lentil prices. https://www.ba.camcom.it/
- Bologna commodity exchange price lists. Used for the field pea price and the hay quotes behind vetch-oat hay. https://www.bo.camcom.gov.it/
- AGEA circular 94143 of 21 November 2025, CAP payment amounts for 2025. Used for coupled durum, grain legumes and oilseeds, the redistributive payment and Eco-scheme 4. https://www.agea.gov.it/documents-apigw/documents/d/agea/agea-94143-21-11-25-a-opr-circolareageasaldi2025-pdf
- AGEA payment circulars for CAP 2023-2027 (2023, 2024 and 2025 unit amounts; operating instructions 30/2025 and 47/2026). Background for the support payments. https://www.agea.gov.it/
- European Commission, basic income support for sustainability (BISS). Describes the basic payment; the app's 170 €/ha is our estimate. https://agriculture.ec.europa.eu/common-agricultural-policy/income-support/biss_en
- Italy's CAP Strategic Plan 2023-2027: coupled income support (PD 06) and eco-schemes (PD 05). Used for planned rates, floors and ceilings. https://agriculture.ec.europa.eu/cap-my-country/cap-strategic-plans/italy_en (plan text: https://faolex.fao.org/docs/pdf/ita236756.pdf)
- MASAF decree DM 585284 of 30 October 2025, durum wheat supply-chain fund (up to 100 €/ha). Used for the durum fund. https://www.masaf.gov.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/24153
- Interministerial decree of 22 December 2025 (DM 688617), food-sovereignty fund 2025-26 (legumes 250 €/ha with a supply-chain contract). Used for the legume fund. https://www.masaf.gov.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/24096
- CREA, list of species that can be certified (7 October 2025). Used for the certified-seed rule. https://www.crea.gov.it/documents/63509/2367743/Specie-certificabili-07-10-2025.pdf/10a470d6-831e-a3e7-0d5f-d81518f9e9c3?t=1766054994158
- MASAF's slides on the 2024 CAP simplification. Used for the crop-rotation rule. https://fidaf.it/wp-content/uploads/2024/10/Semplificazione-PAC_30-ott-24.pdf
- Regione Basilicata, CSR 2023-2027 (regional rural development plan), June 2023 version. Used for the SRA01 and SRA29 payments. https://europa.regione.basilicata.it/feasr/wp-content/uploads/2023/07/CSR-GIUGNO2023-Completo-web.pdf
- CSR Basilicata, SRA03 no-till call 2026 (Determination 100 of 13 February 2026, extended to 30 June 2026). Used for the SRA03 payment. https://basilicatacsr.it/bando-csr/sra03-semina-su-sodo-annualita-2026/
- Top of the Crop crop research notes, 14 November 2026. Every crop figure without a primary source: yields other than durum, direct costs other than durum and chickpea, water need. Compiled by the team from two AI research agents (see the AI statement). https://github.com/wenbinio/topofthecrop/blob/main/docs/crops-research.md
- Top of the Crop research compilation (EU and Italian subsidies, market prices, rotation studies). https://github.com/wenbinio/topofthecrop/blob/main/research-compilation/research-compilation.md
- Also consulted, not used for the app's figures:
  - Performance of wheat-based cropping systems and economic risk of low relative productivity assessment in a sub-dry Mediterranean environment. European Journal of Agronomy. https://doi.org/10.1016/j.eja.2019.125968
  - Pulse-included diverse crop rotations improved the systems economic profitability: evidenced in two 4-year cycles of rotation experiments. Agronomy for Sustainable Development (2022). https://doi.org/10.1007/s13593-022-00831-2
  - The team's comparison of continuous durum with a faba bean rotation, with its own references. https://github.com/wenbinio/topofthecrop/blob/main/docs/durum-vs-faba-rotation-margins.md
  - Bathurst, J.C. et al. (2003). Decision support system for desertification mitigation in the Agri basin, southern Italy. Physics and Chemistry of the Earth 28, 579-587. https://doi.org/10.1016/S1474-7065(03)00104-9

## Software and tools

Google Earth Engine and Google Colab (data notebooks); React, TypeScript, Vite, Tailwind CSS, MapLibre GL JS and Vitest (the app); GitHub Pages (hosting). The team's code is under the MIT licence.

## Use of artificial intelligence (AI)

The idea, the choices and the checking are the team's. Most of the code and the data notebooks were written with AI tools.

What the team did:
- Chose the problem: what a rain-fed durum farmer should grow next.
- Designed the app for a phone, not a dashboard: three setup steps, then the plan.
- Picked the place after its own Earth Engine run compared satellite views of cropland in 17 areas.
- Chose a demo field where a published trial lets us check satellite figures against ground measurements.
- Ran every data notebook and checked the results against the trial's weather station and other datasets. Those checks caught NASA POWER's impossible rain months, which the app now leaves out.
- Decided what reaches the app, and reviewed every change before it went live.

What AI tools did:
- Claude (Anthropic) wrote most of the app's code, the data notebooks, their checks and the documentation.
- AI research agents (Claude and Google Gemini) gathered crop yields, prices, costs and support payments. The team chose the figures. Each figure in the app names its source, and figures nobody has sourced are marked as placeholders.
- OpenAI Codex audited the code.
- Google Gemini reviewed the code and edited the app's wording in English and Italian.
- The data values come from the cited datasets, not from AI. The exception is a few published values from the trial at the demo field, typed in from the paper and labelled as such.
- The app itself contains no AI model. Its options come from a written decision tree and ranking rules. Voice commands use the phone's built-in speech recognition and a written list of phrases.
- No AI-generated images or video are used without a visible watermark. The nine crop pictures were drawn with ChatGPT image generation; each carries a visible "AI" badge.
