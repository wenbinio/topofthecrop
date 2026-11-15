# Data sources

All data in `data/` comes from the datasets below, processed by the notebooks in `ColabNotebooks/` (last checked 2026-11-14T16:51Z).
Every dataset is free and openly licensed. Rain and temperature published for the trial at the demo field (Denora et al. 2025) are quoted, with the citation, only to check results: see Ground check below and `weather.ground_check` in `field.json`.

| Dataset | Used for | Earth Engine ID or service | Resolution | Licence | Citation |
|---|---|---|---|---|---|
| CHIRPS daily rainfall v2.0 (Climate Hazards Center, UCSB) | rain | `UCSB-CHG/CHIRPS/DAILY` | 5,566 m | Public domain (CC0) | Funk, C. et al. (2015). Scientific Data 2: 150066. doi:10.1038/sdata.2015.66 |
| CORINE Land Cover 2018 | non-irrigated arable mask | `COPERNICUS/CORINE/V20/100m/2018` | 100 m | Copernicus Land Monitoring Service: free, full and open access, with attribution | European Union, Copernicus Land Monitoring Service 2018, European Environment Agency (EEA) |
| ERA5-Land daily and monthly aggregates (ECMWF, Copernicus Climate Change Service) | temperature, rain, ET0, soil water (check) | `ECMWF/ERA5_LAND/DAILY_AGGR, ECMWF/ERA5_LAND/MONTHLY_AGGR` | 11,132 m | Copernicus licence (free, with attribution) | Muñoz Sabater, J. (2019). ERA5-Land hourly data from 1950 to present. C3S Climate Data Store. doi:10.24381/cds.e2161bac |
| ESA WorldCover 10 m 2021 v200 | cropland mask | `ESA/WorldCover/v200` | 10 m | CC BY 4.0 | Zanaga, D. et al. (2022). ESA WorldCover 10 m 2021 v200. doi:10.5281/zenodo.7254221 |
| EU crop map 2018 and 2022 (JRC) | durum wheat share, demo-field check | `JRC/D5/EUCROPMAP/V1` | 10 m | CC BY 4.0 | d'Andrimont, R. et al. (2021). Remote Sensing of Environment 266: 112708; Ghassemi, B. et al. (2024). Scientific Data 11: 1048 |
| FAO-56 crop evapotranspiration guidelines (Penman-Monteith ET0, crop factors) | ET0 formula, crop factors | `-` | - | FAO, cite the source | Allen, R. G., Pereira, L. S., Raes, D., Smith, M. (1998). FAO Irrigation and Drainage Paper 56 |
| Harmonized Landsat Sentinel-2 (HLSL30 and HLSS30 v2.0) | 30 m greenness at the demo field | `NASA/HLS/HLSL30/v002, NASA/HLS/HLSS30/v002` | 30 m | NASA data: no restrictions on use | Masek, J. et al. (2021). HLS Operational Land Surface Reflectance and TOA Brightness Daily Global 30m v2.0. NASA LP DAAC. doi:10.5067/HLS/HLSL30.002, doi:10.5067/HLS/HLSS30.002 |
| HydroSHEDS HydroBASINS level 8 | basin outline | `WWF/HydroSHEDS/v1/Basins/hybas_8` | 500 m | HydroSHEDS licence: free for non-commercial and commercial use, with attribution | Lehner, B. & Grill, G. (2013). Hydrological Processes 27(15): 2171-2186. www.hydrosheds.org |
| JAXA GSMaP operational v8 (gauge-adjusted) | rain at the demo field (comparison) | `JAXA/GPM_L3/GSMaP/v8/operational` | 11,132 m | JAXA terms of use (free, with credit) | GSMaP data were provided by JAXA (Kubota, T. et al. 2020, Adv. Global Change Res. 67) |
| MODIS Terra Vegetation Indices 16-day 250 m (MOD13Q1 v6.1) | greenness calendar and season dates | `MODIS/061/MOD13Q1` | 250 m | NASA data: no restrictions on use | Didan, K. (2021). MOD13Q1 MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA LP DAAC. doi:10.5067/MODIS/MOD13Q1.061 |
| MODIS Terra evapotranspiration 8-day 500 m (MOD16A2GF gap-filled; MOD16A2 for the latest months) | water used by crops | `MODIS/061/MOD16A2GF, MODIS/061/MOD16A2` | 500 m | NASA data: no restrictions on use | Running, S., Mu, Q., Zhao, M., Moreno, A. (2021). MOD16A2GF MODIS/Terra Net Evapotranspiration Gap-Filled 8-Day L4 Global 500 m SIN Grid V061. NASA LP DAAC. doi:10.5067/MODIS/MOD16A2GF.061 |
| NASA GPM IMERG Final monthly V07 | rain | `NASA/GPM_L3/IMERG_MONTHLY_V07` | 11,132 m | NASA data: no restrictions on use | Huffman, G. J. et al. (2023). GPM IMERG Final Precipitation L3 1 month 0.1 degree V07. NASA GES DISC. doi:10.5067/GPM/IMERG/3B-MONTH/07 |
| NASA NEX-GDDP-CMIP6 daily downscaled climate projections | climate change by 2041-2060 | `NASA/GDDP-CMIP6` | 27,830 m | CC0 1.0 (blanket licence for all NEX-GDDP-CMIP6 outputs since September 2022) | Thrasher, B. et al. (2022). NASA Global Daily Downscaled Projections, CMIP6. Scientific Data 9: 262. doi:10.1038/s41597-022-01393-4 |
| NASA POWER daily (MERRA-2 based): rain, temperature and soil wetness, for checks at the demo field only | checks at the demo field | `API: power.larc.nasa.gov` | 55,000 m | NASA data: no restrictions on use | NASA Langley Research Center POWER Project, https://power.larc.nasa.gov |
| NASA SMAP L4 surface and root-zone soil moisture, 3-hourly 9 km (SPL4SMGP v8) | soil moisture | `NASA/SMAP/SPL4SMGP/008` | 9,000 m | Public domain (NASA Earth Science Data and Information Policy) | Reichle, R. et al. (2025). SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture Geophysical Data, Version 8. NASA NSIDC DAAC. doi:10.5067/T5RUATAQREF8 |
| NASADEM elevation | height and slope | `NASA/NASADEM_HGT/001` | 30 m | NASA data: no restrictions on use | NASA JPL (2020). NASADEM Merged DEM Global 1 arc second V001. doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001 |
| Sentinel-2 surface reflectance (harmonised) with Cloud Score+ | 10 m greenness and red-edge at the demo field | `COPERNICUS/S2_SR_HARMONIZED, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED` | 10 m | Copernicus Sentinel data: free, full and open; Cloud Score+ CC BY 4.0 | Contains modified Copernicus Sentinel data (ESA). Pasquarella, V. J. et al. (2023). Cloud Score+. CVPR Workshops |
| Sentinel-2 L2A from Microsoft Planetary Computer, loaded live by the app | the field timelapse ("Your field from space", from the Year screen): one clear picture a month of the farmer's field | `API: planetarycomputer.microsoft.com/api/stac/v1` and `/api/data/v1` | 10 m | Copernicus Sentinel data: free, full and open (Sentinel Data Legal Notice); Planetary Computer: free, no account (Supplemental Terms of Use for Previews) | Contains modified Copernicus Sentinel data [years], through Microsoft Planetary Computer |
| SoilGrids 2.0 (ISRIC), 250 m soil property predictions | soil properties | `projects/soilgrids-isric/*_mean` | 250 m | CC BY 4.0 | Poggio, L. et al. (2021). SoilGrids 2.0. SOIL 7: 217-240. doi:10.5194/soil-7-217-2021 |
| SoilGrids 2.0 volumetric water content at 33 and 1500 kPa | water-holding capacity | `ISRIC/SoilGrids250m/v2_0` | 250 m | CC BY 4.0 | Turek, M. E. et al. (2023). International Soil and Water Conservation Research 11(2): 225-239 |
| TerraClimate monthly reference evapotranspiration (check only) | ET0 check | `IDAHO_EPSCOR/TERRACLIMATE` | 4,638 m | Public domain (CC0) | Abatzoglou, J. T. et al. (2018). Scientific Data 5: 170191. doi:10.1038/sdata.2017.191 |

The 1 km grid follows the EEA reference grid (ETRS89-LAEA, EPSG:3035).

## Crop, price and support figures

The money and crop figures come from these sources. Each figure in the app cites the one it was taken from (`scripts/make-placeholder-bundle.mjs`). Where no source was opened, the figure cites our crop research notes. Which figures are verified, and how sure each is, is in `docs/crops-research.md` and `docs/support-and-prices.md`.

| Source | Used for | Link |
|---|---|---|
| Denora, M. et al. (2025). Durum wheat-vetch intercropping in Mediterranean agroecological systems: effects on yield, nitrogen balance, and farm profitability. Italian Journal of Agronomy 20, 100045 | Durum yield (the trial at the demo field); the demo field's station rain and temperature and the trial's soil, for checks | https://doi.org/10.1016/j.ijagro.2025.100045 |
| National durum price list and the Foggia commodity exchange (Camera di Commercio di Foggia), 2025–26 | Durum price | https://www.fg.camcom.it/ |
| Foggia and Bari commodity exchange price lists, cereals and legumes, October 2025 to August 2026 | Chickpea, faba bean and barley prices | https://www.fg.camcom.it/ and https://www.ba.camcom.it/ |
| Bari commodity exchange price list | Italian green lentil price | https://www.ba.camcom.it/ |
| Bologna commodity exchange price list | Field pea price, and the hay quotes behind the vetch–oat hay price (no southern quote exists) | https://www.bo.camcom.gov.it/ |
| AGEA circular 94143 of 21 November 2025, CAP payment amounts for 2025 (checked 15 November 2026) | Coupled durum, grain legumes and oilseeds, the redistributive payment, Eco-scheme 4 | https://www.agea.gov.it/documents-apigw/documents/d/agea/agea-94143-21-11-25-a-opr-circolareageasaldi2025-pdf |
| AGEA payment circulars, CAP 2023–2027 (2023, 2024 and 2025 unit amounts; operating instructions 30/2025 and 47/2026) | Basic income support, the redistributive payment, coupled payments and eco-schemes | https://www.agea.gov.it/ |
| Italy's CAP Strategic Plan 2023–2027 (plan text: https://faolex.fao.org/docs/pdf/ita236756.pdf), coupled income support (PD 06) and eco-schemes (PD 05), from the owner's research compilation, 15 November 2026 | Planned rates and floors and ceilings for coupled durum and grain legumes, oilseed conditions, the Eco-scheme 4 planned rate | https://agriculture.ec.europa.eu/cap-my-country/cap-strategic-plans/italy_en |
| MASAF durum wheat fund (Fondo grano duro, DM 585284 of 30 October 2025), via Informatore Agrario, 3 March 2026 | Durum fund partners, 50 ha and 50,000 € limits | https://informatoreagrario.it/seminativi/confermato-il-contributo-per-la-filiera-del-grano-duro/ |
| CREA, list of species that can be certified (7 October 2025) | Certified seed rule for coupled payments and the durum fund | https://www.crea.gov.it/documents/63509/2367743/Specie-certificabili-07-10-2025.pdf/10a470d6-831e-a3e7-0d5f-d81518f9e9c3?t=1766054994158 |
| MASAF decrees and AGEA instructions | Payment rules (the crop-rotation rule, the durum fund) | https://www.masaf.gov.it/ |
| CSR Basilicata 2023–2027, the region's rural development plan | The three regional payments. These rest on search results and trade press, because the official pages would not load | https://europa.regione.basilicata.it/feasr/ |
| Lago-Olveira, S. et al. (2023). Environmental and economic benefits of wheat and chickpea crop rotation in the Mediterranean region of Apulia (Italy). Science of the Total Environment 896, 165124 | More durum after chickpea: 16%, then 10% | https://doi.org/10.1016/j.scitotenv.2023.165124 |
| Garofalo, P., Di Paolo, E. and Rinaldi, M. (2009). Durum wheat in rotation with faba bean: long-term simulation case study. Crop and Pasture Science 60(3), 240–250 | More durum after faba bean: 12% | https://doi.org/10.1071/CP08208 |
| Our crop research notes, 14 November 2026 (`docs/crops-research.md`): two AI research agents (Claude Opus and Gemini) working from one brief, with the team choosing the figures | Every other crop figure: yields other than durum, all direct costs, nitrogen left, water need, machinery, buyer, broomrape status, and the rapeseed and coriander prices | https://github.com/wenbinio/topofthecrop/blob/main/docs/crops-research.md |

Each rotation's income is worked out from these figures (`docs/scoring.md`, "How the income figure is worked out"). Its risk rating is our own rule (`docs/scoring.md`, "Each rotation's risk").

## Ground check

Rain and temperature at the demo field were checked against the weather station of the vetch trial at that field. The paper gives season totals without saying which months they cover, so three windows are shown. The station values are copied by hand from the paper and labelled as such in `field.json`. They are used only for this check: no data was changed to match them.

| Season | Months | Station rain (mm) | Satellite rain, median of CHIRPS, IMERG, ERA5-Land (mm) | Difference |
|---|---|---|---|---|
| 2022-23 | Oct-May | 673.6 | 656 | -3% |
| 2022-23 | Nov-Jun | 673.6 | 678 | +1% |
| 2022-23 | sowing to harvest | 673.6 | 498 | -26% |
| 2023-24 | Oct-May | 314.6 | 412 | +31% |
| 2023-24 | Nov-Jun | 314.6 | 392 | +25% |
| 2023-24 | sowing to harvest | 314.6 | 308 | -2% |

| Season | Station mean temperature (°C) | ERA5-Land, sowing to harvest (°C) | Difference (°C) |
|---|---|---|---|
| 2022-23 | 13.58 | 12.4 | -1.2 |
| 2023-24 | 15.47 | 13.0 | -2.5 |

Station: Denora M. et al. (2025). Durum wheat-vetch intercropping in Mediterranean agroecological systems: effects on yield, nitrogen balance, and farm profitability. Italian Journal of Agronomy 20, 100045. https://doi.org/10.1016/j.ijagro.2025.100045

## AI assistance

Produced by notebooks written with AI assistance (Claude, Anthropic) and run by the Field Shift team in Google Colab with Google Earth Engine. Data values come from the cited datasets and were not written by the AI, except a few published values from the trial at the demo field (its station's rain and temperature, and its soil description), which were copied by hand from Denora et al. (2025) and are labelled as such.
